import http.server
import socketserver
import json
import hashlib
import uuid
import os
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict
from urllib.parse import urlparse, parse_qs

# --- Database setup ---
DATA_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(DATA_DIR, "submissions.db")
DEMO_DB_PATH = os.path.join(DATA_DIR, "demo_submissions.db")

# --- Fixed reparti per acciaieria ---
REPARTI = ["Fonderia", "Laminazione", "Trattamento", "Assemblaggio"]

# --- Fixed worker → reparto mapping ---
WORKER_REPARTO_MAP = {
    "Alice": "Fonderia",
    "Bob": "Laminazione",
    "Carlo": "Trattamento",
    "Diana": "Assemblaggio",
    "Emilio": "Fonderia",
}

def get_worker_reparto(worker_name: Optional[str]) -> str:
    """Return the fixed reparto for a worker, default to 'Fonderia' if unknown."""
    if worker_name and worker_name in WORKER_REPARTO_MAP:
        return WORKER_REPARTO_MAP[worker_name]
    return "Fonderia"

def get_db_conn(demo: bool = False):
    """Establishes an SQLite connection with a Row Factory for key-value access."""
    path = DEMO_DB_PATH if demo else DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row  # Crucial for accessing columns like r["id"]
    return conn

# Helper functions
def clamp(v: float, mn: float = 0.0, mx: float = 1.0) -> float:
    return max(min(v, mx), mn)

def normalize(v: float, min_v: float, max_v: float) -> float:
    if max_v - min_v == 0:
        return 0
    return clamp((v - min_v) / (max_v - min_v))

def validate_iro_input(data: dict) -> dict:
    """Validate IRO input data"""
    try:
        return {
            "ore": float(data.get("ore", 8.0)),
            "turni": float(data.get("turni", 2.0)),
            "straordinari": float(data.get("straordinari", 2.0)),
            "pause": float(data.get("pause", 30.0)),
            "rumore": float(data.get("rumore", 70.0)),
            "luce": float(data.get("luce", 500.0)),
            "vibrazioni": float(data.get("vibrazioni", 2.0)),
            "spazio": float(data.get("spazio", 3.0)),
            "affaticamento": float(data.get("affaticamento", 0.3)),
            "concentrazione": float(data.get("concentrazione", 0.8)),
            "carico": float(data.get("carico", 0.4)),
            "stanchezza": float(data.get("stanchezza", 0.3)),
            "chiarezza": float(data.get("chiarezza", 0.9)),
            "worker": data.get("worker", None),
        }
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid input data: {str(e)}")

def compute_iro(data: dict):
    d = data

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

    # Pesi
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
            "Attenzione a fases critiche"
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

def init_db():
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS submissions")
    cur.execute(
        """
        CREATE TABLE submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_hash TEXT,
            timestamp TEXT,
            day TEXT,
            hour INTEGER,
            iro REAL,
            livello TEXT,
            colore TEXT,
            suggerimenti TEXT,
            input_json TEXT,
            reparto TEXT
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_hash TEXT,
            timestamp TEXT,
            day TEXT,
            hour INTEGER,
            iro REAL,
            livello TEXT,
            colore TEXT,
            suggerimenti TEXT,
            input_json TEXT,
            reparto TEXT
        )
        """
    )
    conn.commit()
    cur.execute("DELETE FROM submissions")
    
    import random
    random.seed(42)
    
    workers = ["Alice", "Bob", "Carlo", "Diana", "Emilio"]
    days_in_feb = 28
    
    reparto_env_baseline = {
        "Fonderia":     {"rumore": 85, "luce": 400, "vibrazioni": 4.0, "spazio": 2.5},
        "Laminazione": {"rumore": 75, "luce": 500, "vibrazioni": 3.0, "spazio": 3.0},
        "Trattamento": {"rumore": 65, "luce": 550, "vibrazioni": 2.0, "spazio": 3.5},
        "Assemblaggio":{"rumore": 55, "luce": 700, "vibrazioni": 1.0, "spazio": 4.0},
    }
    
    for day_num in range(1, days_in_feb + 1):
        day_str = f"2026-02-{day_num:02d}"
        workers_today = random.sample(workers, k=random.randint(3, 5))
        
        for worker_name in workers_today:
            reparto = get_worker_reparto(worker_name)
            env_base = reparto_env_baseline.get(reparto, reparto_env_baseline["Fonderia"])
            hours = random.sample(range(6, 18), k=3)
            
            for hour in hours:
                day_factor = (day_num / days_in_feb) * 0.3
                worker_factor = random.gauss(0, 0.1)
                hour_factor = (hour - 12) / 6 * 0.1
                
                affaticamento = max(0, min(1, 0.35 + day_factor + worker_factor + hour_factor))
                concentrazione = max(0, min(1, 0.75 - day_factor + random.gauss(0, 0.1)))
                carico = max(0, min(1, 0.45 + day_factor + random.gauss(0, 0.08)))
                stanchezza = max(0, min(1, 0.35 + day_factor + random.gauss(0, 0.12)))
                chiarezza = max(0, min(1, 0.85 - day_factor + random.gauss(0, 0.08)))
                
                ore = max(6, min(12, 8.0 + random.gauss(0, 0.5)))
                turni = 2 if day_num % 7 != 0 else 1
                straordinari = max(0, min(10, 2.0 + day_factor * 5 + random.gauss(0, 1)))
                pause = max(10, min(60, 30 - day_factor * 10 + random.gauss(0, 3)))
                
                rumore = max(40, min(100, env_base["rumore"] + day_factor * 5 + random.gauss(0, 3)))
                luce = max(200, min(1000, env_base["luce"] - day_factor * 50 + random.gauss(0, 30)))
                vibrazioni = max(0, min(10, env_base["vibrazioni"] + day_factor * 1.5 + random.gauss(0, 0.3)))
                spazio = max(1, min(5, env_base["spazio"] - day_factor * 0.5 + random.gauss(0, 0.2)))
                
                input_data = {
                    "ore": ore, "turni": turni, "straordinari": straordinari, "pause": pause,
                    "rumore": rumore, "luce": luce, "vibrazioni": vibrazioni, "spazio": spazio,
                    "affaticamento": affaticamento, "concentrazione": concentrazione, "carico": carico,
                    "stanchezza": stanchezza, "chiarezza": chiarezza, "worker": worker_name, "reparto": reparto,
                }
                
                result = compute_iro(input_data)
                ts = f"2026-02-{day_num:02d}T{hour:02d}:00:00"
                worker_hash = anonymize_worker(worker_name)
                
                cur.execute(
                    "INSERT INTO submissions (worker_hash, timestamp, day, hour, iro, livello, colore, suggerimenti, input_json, reparto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        worker_hash, ts, day_str, hour, result["iro"], result["livello"], result["colore"],
                        json.dumps(result["suggerimenti"], ensure_ascii=False),
                        json.dumps(input_data, ensure_ascii=False), reparto,
                    )
                )
    conn.commit()
    conn.close()

def anonymize_worker(name: Optional[str]) -> str:
    if not name:
        name = f"anon-{uuid.uuid4().hex}"
    salt = "safety-by-tech-salt"
    return hashlib.sha256((salt + name.strip().lower()).encode("utf-8")).hexdigest()

# Initialize databases on startup
init_db()
init_demo_db()

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        demo = query_params.get("demo", ["false"])[0].lower() == "true"
        limit = int(query_params.get("limit", ["100"])[0])
        
        try:
            if path == "/":
                self.serve_file("index.html", "text/html")
            elif path == "/api/submissions":
                self.handle_submissions(demo, limit)
            elif path == "/api/workers":
                self.handle_workers(demo)
            elif path.startswith("/api/workers/"):
                worker_hash = path.split("/")[-1]
                self.handle_worker_submissions(worker_hash, demo)
            elif path == "/api/organization/graph":
                self.handle_organization_graph(demo)
            elif path.endswith(".html"):
                self.serve_file(path[1:], "text/html")
            elif path.endswith(".js"):
                self.serve_file(path[1:], "application/javascript")
            elif path.endswith(".css"):
                self.serve_file(path[1:], "text/css")
            elif path.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico")):
                ext_map = {
                    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif", ".ico": "image/x-icon"
                }
                ext = os.path.splitext(path)[1]
                self.serve_file(path[1:], ext_map.get(ext, "application/octet-stream"))
            else:
                self.send_error(404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        try:
            if path == "/api/calcola-iro":
                self.handle_calcola_iro()
            else:
                self.send_error(404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
    
    def do_PUT(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        demo = query_params.get("demo", ["false"])[0].lower() == "true"
        
        try:
            if path == "/api/update-day":
                self.handle_update_day(demo)
            else:
                self.send_error(404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    
    def send_json(self, data: dict, status: int = 200):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def serve_file(self, filepath: str, content_type: str):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(content))
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)
    
    def get_request_body(self) -> dict:
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        return json.loads(body.decode('utf-8'))
    
    def handle_calcola_iro(self):
        data = self.get_request_body()
        validated_data = validate_iro_input(data)
        result = compute_iro(validated_data)
        
        ts = datetime.utcnow().isoformat()
        day = ts.split("T")[0]
        hour = int(datetime.utcnow().hour)
        worker_hash = anonymize_worker(validated_data["worker"])
        reparto = get_worker_reparto(validated_data.get("worker"))
        
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO submissions (worker_hash, timestamp, day, hour, iro, livello, colore, suggerimenti, input_json, reparto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                worker_hash, ts, day, hour, result["iro"], result["livello"], result["colore"],
                json.dumps(result["suggerimenti"], ensure_ascii=False),
                json.dumps(validated_data, ensure_ascii=False), reparto
            ),
        )
        conn.commit()
        conn.close()
        
        result["worker_hash"] = worker_hash
        result["timestamp"] = ts
        result["reparto"] = reparto
        self.send_json(result)
    
    def handle_submissions(self, demo: bool, limit: int):
        conn = get_db_conn(demo=demo)
        cur = conn.cursor()
        cur.execute("SELECT * FROM submissions ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = cur.fetchall()
        conn.close()
        
        out = []
        for r in rows:
            out.append({
                "id": r["id"], "worker_hash": r["worker_hash"], "timestamp": r["timestamp"],
                "day": r["day"], "hour": r["hour"], "iro": r["iro"], "livello": r["livello"],
                "colore": r["colore"], "suggerimenti": json.loads(r["suggerimenti"]),
                "input": json.loads(r["input_json"]) if r["input_json"] else None, "reparto": r["reparto"],
            })
        self.send_json(out)
    
    def handle_workers(self, demo: bool):
        conn = get_db_conn(demo=demo)
        cur = conn.cursor()
        cur.execute("SELECT worker_hash, COUNT(*) as cnt, MAX(timestamp) as last_seen FROM submissions GROUP BY worker_hash")
        rows = cur.fetchall()
        conn.close()
        
        out = [{"worker_hash": r["worker_hash"], "count": r["cnt"], "last_seen": r["last_seen"]} for r in rows]
        self.send_json(out)
    
    def handle_worker_submissions(self, worker_hash: str, demo: bool):
        conn = get_db_conn(demo=demo)
        cur = conn.cursor()
        cur.execute("SELECT * FROM submissions WHERE worker_hash = ? ORDER BY timestamp", (worker_hash,))
        rows = cur.fetchall()
        conn.close()
        
        out = []
        for r in rows:
            out.append({
                "id": r["id"], "timestamp": r["timestamp"], "day": r["day"], "hour": r["hour"],
                "iro": r["iro"], "livello": r["livello"], "colore": r["colore"],
                "suggerimenti": json.loads(r["suggerimenti"]),
                "input": json.loads(r["input_json"]) if r["input_json"] else None, "reparto": r["reparto"],
            })
        self.send_json(out)
    
    def handle_organization_graph(self, demo: bool):
        conn = get_db_conn(demo=demo)
        cur = conn.cursor()
        cur.execute(
            "SELECT day, hour, reparto, AVG(iro) as avg_iro, COUNT(*) as cnt "
            "FROM submissions GROUP BY day, hour, reparto ORDER BY day, hour, reparto"
        )
        rows = cur.fetchall()
        conn.close()
        
        out = [{
            "day": r["day"], "hour": r["hour"], "reparto": r["reparto"],
            "avg_iro": r["avg_iro"], "count": r["cnt"]
        } for r in rows]
        self.send_json(out)
    
    def handle_update_day(self, demo: bool):
        data = self.get_request_body()
        role = data.get("role")
        day = data.get("day")
        reparto = data.get("reparto", None)
        
        if role not in ["worker", "rspp", "organizzazione"]:
            self.send_json({"error": "Invalid role"}, 400)
            return
        
        conn = get_db_conn(demo=demo)
        cur = conn.cursor()
        
        if reparto:
            cur.execute("SELECT * FROM submissions WHERE day = ? AND reparto = ?", (day, reparto))
        else:
            cur.execute("SELECT * FROM submissions WHERE day = ?", (day,))
        rows = cur.fetchall()
        
        if not rows:
            conn.close()
            self.send_json({"error": f"No data found for day {day}" + (f" reparto {reparto}" if reparto else "")}, 404)
            return
        
        allowed_fields = {
            "organizzazione": ["ore", "turni", "straordinari", "pause"],
            "rspp": ["rumore", "luce", "vibrazioni", "spazio"],
            "worker": []
        }
        
        allowed = allowed_fields.get(role, [])
        if not allowed:
            conn.close()
            self.send_json({"error": f"Role {role} cannot update data"}, 403)
            return
        
        updates = {field: data[field] for field in allowed if field in data and data[field] is not None}
        if not updates:
            conn.close()
            self.send_json({"error": "No valid fields to update"}, 400)
            return
        
        results = []
        for row in rows:
            input_data = json.loads(row["input_json"])
            for field, val in updates.items():
                input_data[field] = val
            
            result = compute_iro(input_data)
            cur.execute(
                "UPDATE submissions SET iro=?, livello=?, colore=?, suggerimenti=?, input_json=? WHERE id=?",
                (
                    result["iro"], result["livello"], result["colore"],
                    json.dumps(result["suggerimenti"], ensure_ascii=False),
                    json.dumps(input_data, ensure_ascii=False), row["id"]
                )
            )
            results.append({"id": row["id"], "new_iro": result["iro"], "livello": result["livello"]})
        
        conn.commit()
        conn.close()
        self.send_json({"updated": len(results), "results": results, "reparto": reparto})


if __name__ == "__main__":
    PORT = 8000
    Handler = CORSHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")