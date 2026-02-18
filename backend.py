# backend.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
import uvicorn
import sqlite3
import hashlib
import json
from datetime import datetime
import uuid

app = FastAPI(title="Safety by Technology - IRO Calculator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ← in produzione metti solo il dominio reale!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clamp(v: float, mn: float = 0.0, mx: float = 1.0) -> float:
    return max(min(v, mx), mn)


def normalize(v: float, min_v: float, max_v: float) -> float:
    if max_v - min_v == 0:
        return 0
    return clamp((v - min_v) / (max_v - min_v))


class IROInput(BaseModel):
    ore: float = Field(8.0, ge=6, le=12)
    turni: float = Field(2.0, ge=1, le=6)
    straordinari: float = Field(2.0, ge=0, le=10)
    pause: float = Field(30.0, ge=10, le=60)

    rumore: float = Field(70.0, ge=40, le=100)
    luce: float = Field(500.0, ge=200, le=1000)
    vibrazioni: float = Field(2.0, ge=0, le=10)
    spazio: float = Field(3.0, ge=1, le=5)

    affaticamento: float = Field(0.3, ge=0, le=1)
    concentrazione: float = Field(0.8, ge=0, le=1)
    carico: float = Field(0.4, ge=0, le=1)
    stanchezza: float = Field(0.3, ge=0, le=1)
    chiarezza: float = Field(0.9, ge=0, le=1)
    # Optional worker name; will be anonymized before storing
    worker: Optional[str] = Field(None, max_length=200)


def compute_iro(data: IROInput):
    d = data.model_dump()

    # Organizational
    n_ore = normalize(d["ore"], 6, 12)
    n_turni = normalize(d["turni"], 1, 6)
    n_straord = normalize(d["straordinari"], 0, 10)
    n_pause = 1 - normalize(d["pause"], 10, 60)

    # Environmental
    n_rumore = normalize(d["rumore"], 40, 100)
    n_luce = 1 - normalize(d["luce"], 200, 1000)
    n_vib = normalize(d["vibrazioni"], 0, 10)
    n_spazio = 1 - normalize(d["spazio"], 1, 5)

    # Human
    n_aff = d["affaticamento"]
    n_conc = 1 - d["concentrazione"]
    n_carico = d["carico"]
    n_stanchezza = d["stanchezza"]
    n_chiarezza = 1 - d["chiarezza"]

    # Pesi (potresti volerli rendere configurabili in futuro)
    peso_sforzo = 0.8
    peso_rip = 0.6
    peso_err = 0.9
    peso_contatto = 0.7

    workload = (
        n_ore * peso_sforzo +
        n_turni * peso_rip +
        n_straord +
        n_pause
    )

    environment = (
        n_rumore * peso_err +
        n_luce * peso_contatto +
        n_vib * peso_sforzo +
        n_spazio
    )

    human = (
        n_aff * peso_sforzo +
        n_conc * peso_err +
        n_carico +
        n_stanchezza +
        n_chiarezza
    )

    expected = 1.5
    delta = (workload + human) - expected
    iro_raw = workload + environment + human + delta
    iro = clamp(iro_raw / 10)

    # Livello di rischio + suggerimenti
    if iro < 0.4:
        livello = "BASSO"
        color = "#22c55e"
        suggerimenti = ["Condizione operativa sotto controllo ✓"]
    elif iro < 0.7:
        livello = "MEDIO"
        color = "#f59e0b"
        suggerimenti = [
            "Monitorare carico di lavoro",
            "Valutare incremento pause",
            "Attenzione a fasi critiche"
        ]
    else:
        livello = "ALTO"
        color = "#ef4444"
        suggerimenti = [
            "Rimodulare turnazione",
            "Rotazione mansione",
            "Riduzione compiti ripetitivi",
            "Intervento RSPP fortemente consigliato"
        ]

    return {
        "iro": round(iro, 3),
        "livello": livello,
        "colore": color,
        "suggerimenti": suggerimenti
    }


# --- Database setup ---
DB_PATH = "submissions.db"
DEMO_DB_PATH = "demo_submissions.db"

def get_db_conn(demo: bool = False):
    db_path = DEMO_DB_PATH if demo else DB_PATH
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY,
            worker_hash TEXT,
            timestamp TEXT,
            day TEXT,
            hour INTEGER,
            iro REAL,
            livello TEXT,
            colore TEXT,
            suggerimenti TEXT,
            input_json TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def init_demo_db():
    """Initialize demo database with realistic month data"""
    conn = get_db_conn(demo=True)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY,
            worker_hash TEXT,
            timestamp TEXT,
            day TEXT,
            hour INTEGER,
            iro REAL,
            livello TEXT,
            colore TEXT,
            suggerimenti TEXT,
            input_json TEXT
        )
        """
    )
    conn.commit()
    
    # Check if data already exists
    cur.execute("SELECT COUNT(*) as cnt FROM submissions")
    if cur.fetchone()['cnt'] > 0:
        conn.close()
        return
    
    # Generate demo data for February 2026 (current month context)
    import random
    random.seed(42)
    
    workers = ["Alice", "Bob", "Carlo", "Diana", "Emilio"]
    days_in_feb = 28
    
    for day_num in range(1, days_in_feb + 1):
        day_str = f"2026-02-{day_num:02d}"
        
        # Simulate 2-3 workers per day
        workers_today = random.sample(workers, k=random.randint(2, 4))
        
        for worker_name in workers_today:
            # Generate data for 3 different hours in the day
            hours = random.sample(range(6, 18), k=3)
            
            for hour in hours:
                # Create realistic variation
                day_factor = (day_num / days_in_feb) * 0.3  # slight trend over month
                worker_factor = random.gauss(0, 0.1)
                
                # Worker data (human factors)
                affaticamento = max(0, min(1, 0.35 + day_factor + worker_factor))
                concentrazione = max(0, min(1, 0.75 - day_factor + random.gauss(0, 0.1)))
                carico = max(0, min(1, 0.45 + day_factor + random.gauss(0, 0.08)))
                stanchezza = max(0, min(1, 0.35 + day_factor + random.gauss(0, 0.12)))
                chiarezza = max(0, min(1, 0.85 - day_factor + random.gauss(0, 0.08)))
                
                # Organization data
                ore = 8.0 + random.gauss(0, 0.5)
                ore = max(6, min(12, ore))
                turni = 2 if day_num % 7 != 0 else 1
                straordinari = max(0, min(10, 2.0 + day_factor * 5 + random.gauss(0, 1)))
                pause = max(10, min(60, 30 - day_factor * 10 + random.gauss(0, 3)))
                
                # RSPP data (environmental factors)
                rumore = max(40, min(100, 70 + day_factor * 10 + random.gauss(0, 5)))
                luce = max(200, min(1000, 500 - day_factor * 100 + random.gauss(0, 50)))
                vibrazioni = max(0, min(10, 2.0 + day_factor * 2 + random.gauss(0, 0.5)))
                spazio = max(1, min(5, 3.0 - day_factor * 0.5 + random.gauss(0, 0.3)))
                
                input_data = {
                    "ore": ore,
                    "turni": turni,
                    "straordinari": straordinari,
                    "pause": pause,
                    "rumore": rumore,
                    "luce": luce,
                    "vibrazioni": vibrazioni,
                    "spazio": spazio,
                    "affaticamento": affaticamento,
                    "concentrazione": concentrazione,
                    "carico": carico,
                    "stanchezza": stanchezza,
                    "chiarezza": chiarezza,
                    "worker": worker_name
                }
                
                # Compute IRO
                iro_input = IROInput(**input_data)
                result = compute_iro(iro_input)
                
                # Generate timestamp
                ts = f"2026-02-{day_num:02d}T{hour:02d}:00:00"
                worker_hash = anonymize_worker(worker_name)
                
                cur.execute(
                    "INSERT INTO submissions (worker_hash, timestamp, day, hour, iro, livello, colore, suggerimenti, input_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        worker_hash,
                        ts,
                        day_str,
                        hour,
                        result["iro"],
                        result["livello"],
                        result["colore"],
                        json.dumps(result["suggerimenti"], ensure_ascii=False),
                        json.dumps(input_data, ensure_ascii=False),
                    )
                )
    
    conn.commit()
    conn.close()


def anonymize_worker(name: Optional[str]) -> str:
    if not name:
        # generate a stable-ish anon id
        name = f"anon-{uuid.uuid4().hex}"
    # simple SHA256 hashing with fixed salt to anonymize
    salt = "safety-by-tech-salt"
    h = hashlib.sha256((salt + name.strip().lower()).encode("utf-8")).hexdigest()
    return h


@app.on_event("startup")
def on_startup():
    init_db()
    init_demo_db()



@app.post("/api/calcola-iro")
async def calculate_iro_and_store(data: IROInput):
    # compute IRO using existing logic
    result = compute_iro(data)

    # Prepare DB record
    ts = datetime.utcnow().isoformat()
    day = ts.split("T")[0]
    hour = int(datetime.utcnow().hour)
    worker_hash = anonymize_worker(data.worker)

    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO submissions (worker_hash, timestamp, day, hour, iro, livello, colore, suggerimenti, input_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            worker_hash,
            ts,
            day,
            hour,
            result["iro"],
            result["livello"],
            result["colore"],
            json.dumps(result["suggerimenti"], ensure_ascii=False),
            json.dumps(data.model_dump(), ensure_ascii=False),
        ),
    )
    conn.commit()
    conn.close()

    # Include anonymized id and timestamp in response so client can reference own history
    result["worker_hash"] = worker_hash
    result["timestamp"] = ts
    return result


# --- Retrieval endpoints ---
@app.get("/api/submissions")
def list_submissions(limit: int = 100, demo: bool = False):
    conn = get_db_conn(demo=demo)
    cur = conn.cursor()
    cur.execute("SELECT * FROM submissions ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    conn.close()
    out = []
    for r in rows:
        out.append({
            "id": r["id"],
            "worker_hash": r["worker_hash"],
            "timestamp": r["timestamp"],
            "day": r["day"],
            "hour": r["hour"],
            "iro": r["iro"],
            "livello": r["livello"],
            "colore": r["colore"],
            "suggerimenti": json.loads(r["suggerimenti"]),
            "input": json.loads(r["input_json"]) if r["input_json"] else None,
        })
    return out


@app.get("/api/workers")
def list_workers(demo: bool = False):
    conn = get_db_conn(demo=demo)
    cur = conn.cursor()
    cur.execute("SELECT worker_hash, COUNT(*) as cnt, MAX(timestamp) as last_seen FROM submissions GROUP BY worker_hash")
    rows = cur.fetchall()
    conn.close()
    return [{"worker_hash": r["worker_hash"], "count": r["cnt"], "last_seen": r["last_seen"]} for r in rows]


@app.get("/api/workers/{worker_hash}")
def get_worker_submissions(worker_hash: str, demo: bool = False):
    conn = get_db_conn(demo=demo)
    cur = conn.cursor()
    cur.execute("SELECT * FROM submissions WHERE worker_hash = ? ORDER BY timestamp", (worker_hash,))
    rows = cur.fetchall()
    conn.close()
    out = []
    for r in rows:
        out.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "day": r["day"],
            "hour": r["hour"],
            "iro": r["iro"],
            "livello": r["livello"],
            "colore": r["colore"],
            "suggerimenti": json.loads(r["suggerimenti"]),
            "input": json.loads(r["input_json"]) if r["input_json"] else None,
        })
    return out


@app.get("/api/organization/graph")
def organization_graph(demo: bool = False):
    # Aggregate average IRO per day and hour
    conn = get_db_conn(demo=demo)
    cur = conn.cursor()
    cur.execute("SELECT day, hour, AVG(iro) as avg_iro, COUNT(*) as cnt FROM submissions GROUP BY day, hour ORDER BY day, hour")
    rows = cur.fetchall()
    conn.close()
    return [{"day": r["day"], "hour": r["hour"], "avg_iro": r["avg_iro"], "count": r["cnt"]} for r in rows]


class UpdateInput(BaseModel):
    """Update specific fields for a day; role determines which fields are allowed"""
    role: str = Field(..., description="worker, rspp, or organizzazione")
    day: str = Field(..., description="YYYY-MM-DD")
    # Org fields
    ore: Optional[float] = None
    turni: Optional[float] = None
    straordinari: Optional[float] = None
    pause: Optional[float] = None
    # RSPP fields
    rumore: Optional[float] = None
    luce: Optional[float] = None
    vibrazioni: Optional[float] = None
    spazio: Optional[float] = None


@app.put("/api/update-day")
async def update_day_data(data: UpdateInput, demo: bool = False):
    """
    Update a specific day's data. Role-based: only allow certain fields.
    - organizzazione: can update ore, turni, straordinari, pause
    - rspp: can update rumore, luce, vibrazioni, spazio
    - worker: read-only
    """
    if data.role not in ["worker", "rspp", "organizzazione"]:
        return {"error": "Invalid role"}

    conn = get_db_conn(demo=demo)
    cur = conn.cursor()

    # Fetch records for that day
    cur.execute("SELECT * FROM submissions WHERE day = ?", (data.day,))
    rows = cur.fetchall()

    if not rows:
        conn.close()
        return {"error": f"No data found for day {data.day}"}

    # Build allowed fields per role
    allowed_fields = {
        "organizzazione": ["ore", "turni", "straordinari", "pause"],
        "rspp": ["rumore", "luce", "vibrazioni", "spazio"],
        "worker": []  # read-only
    }

    allowed = allowed_fields.get(data.role, [])
    if not allowed:
        conn.close()
        return {"error": f"Role {data.role} cannot update data"}

    # Update each record for the day with allowed fields
    updates = {}
    for field in allowed:
        val = getattr(data, field, None)
        if val is not None:
            updates[field] = val

    if not updates:
        conn.close()
        return {"error": "No valid fields to update"}

    # For each submission on that day, recompute using updated input
    results = []
    for row in rows:
        input_data = json.loads(row["input_json"])
        
        # Apply updates
        for field, val in updates.items():
            input_data[field] = val

        # Recompute IRO with updated input
        iro_input = IROInput(**input_data)
        result = compute_iro(iro_input)

        # Update DB
        cur.execute(
            "UPDATE submissions SET iro=?, livello=?, colore=?, suggerimenti=?, input_json=? WHERE id=?",
            (
                result["iro"],
                result["livello"],
                result["colore"],
                json.dumps(result["suggerimenti"], ensure_ascii=False),
                json.dumps(input_data, ensure_ascii=False),
                row["id"]
            )
        )
        results.append({"id": row["id"], "new_iro": result["iro"], "livello": result["livello"]})

    conn.commit()
    conn.close()
    return {"updated": len(results), "results": results}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)