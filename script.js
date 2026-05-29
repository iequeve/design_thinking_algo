let currentRole = null;
let currentWorkerHash = null;
let orgChart = null;
let orgRepartoChart = null;
let orgRiskChart = null;
let orgHourlyChart = null;
let orgRepartoVolumeChart = null;
let workerChart = null;
let placeholderMode = false;

// Indirizzo base del backend Python
const API_BASE_URL = "http://localhost:8000/api";

function applyChartTheme() {
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#c5d0e5';
  Chart.defaults.scale.grid.color = 'rgba(148, 163, 184, 0.12)';
  Chart.defaults.scale.ticks.color = '#9ca9bb';
  Chart.defaults.plugins.legend.labels.color = '#f8fafc';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(3, 7, 18, 0.92)';
  Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
  Chart.defaults.plugins.tooltip.bodyColor = '#d0e2ff';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(96, 165, 250, 0.42)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.displayColors = false;
  Chart.defaults.elements.line.borderWidth = 3;
  Chart.defaults.elements.line.tension = 0.38;
  Chart.defaults.elements.point.radius = 3;
  Chart.defaults.elements.point.hoverRadius = 5;
  Chart.defaults.elements.bar.borderRadius = 8;
}

// Placeholder statico locale per mesi (mantenuto per eventuale logica offline)
const placeholderData = {
  worker: {
    January: { affaticamento: 0.35, concentrazione: 0.75, carico: 0.45, stanchezza: 0.40, chiarezza: 0.85 },
    February: { affaticamento: 0.42, concentrazione: 0.68, carico: 0.52, stanchezza: 0.48, chiarezza: 0.78 },
    March: { affaticamento: 0.38, concentrazione: 0.72, carico: 0.48, stanchezza: 0.42, chiarezza: 0.82 },
    April: { affaticamento: 0.30, concentrazione: 0.80, carico: 0.40, stanchezza: 0.32, chiarezza: 0.90 },
    May: { affaticamento: 0.28, concentrazione: 0.82, carico: 0.38, stanchezza: 0.30, chiarezza: 0.92 },
    June: { affaticamento: 0.32, concentrazione: 0.78, carico: 0.42, stanchezza: 0.35, chiarezza: 0.88 },
    July: { affaticamento: 0.48, concentrazione: 0.65, carico: 0.55, stanchezza: 0.52, chiarezza: 0.72 },
    August: { affaticamento: 0.50, concentrazione: 0.62, carico: 0.58, stanchezza: 0.55, chiarezza: 0.70 },
    September: { affaticamento: 0.40, concentrazione: 0.70, carico: 0.48, stanchezza: 0.45, chiarezza: 0.80 },
    October: { affaticamento: 0.35, concentrazione: 0.75, carico: 0.45, stanchezza: 0.40, chiarezza: 0.85 },
    November: { affaticamento: 0.44, concentrazione: 0.66, carico: 0.54, stanchezza: 0.50, chiarezza: 0.75 },
    December: { affaticamento: 0.52, concentrazione: 0.60, carico: 0.62, stanchezza: 0.58, chiarezza: 0.68 }
  },
  rspp: {
    January: { rumore: 72, luce: 480, vibrazioni: 2.2, spazio: 3.2 },
    February: { rumore: 75, luce: 450, vibrazioni: 2.5, spazio: 3.0 },
    March: { rumore: 70, luce: 520, vibrazioni: 2.0, spazio: 3.3 },
    April: { rumore: 68, luce: 550, vibrazioni: 1.8, spazio: 3.5 },
    May: { rumore: 65, luce: 600, vibrazioni: 1.5, spazio: 3.8 },
    June: { rumore: 64, luce: 650, vibrazioni: 1.4, spazio: 4.0 },
    July: { rumore: 78, luce: 720, vibrazioni: 2.8, spazio: 2.8 },
    August: { rumore: 80, luce: 750, vibrazioni: 3.0, spazio: 2.5 },
    September: { rumore: 74, luce: 580, vibrazioni: 2.4, spazio: 3.2 },
    October: { rumore: 72, luce: 500, vibrazioni: 2.2, spazio: 3.3 },
    November: { rumore: 76, luce: 420, vibrazioni: 2.6, spazio: 3.0 },
    December: { rumore: 82, luce: 380, vibrazioni: 3.2, spazio: 2.7 }
  },
  org: {
    January: { ore: 8.2, turni: 2, straordinari: 2.5, pause: 28 },
    February: { ore: 8.4, turni: 2, straordinari: 3.0, pause: 26 },
    March: { ore: 8.0, turni: 2, straordinari: 2.0, pause: 30 },
    April: { ore: 7.8, turni: 2, straordinari: 1.5, pause: 32 },
    May: { ore: 7.5, turni: 2, straordinari: 1.0, pause: 35 },
    June: { ore: 7.6, turni: 2, straordinari: 1.2, pause: 34 },
    July: { ore: 8.6, turni: 3, straordinari: 4.0, pause: 24 },
    August: { ore: 8.8, turni: 3, straordinari: 4.5, pause: 22 },
    September: { ore: 8.2, turni: 2, straordinari: 2.8, pause: 28 },
    October: { ore: 8.0, turni: 2, straordinari: 2.2, pause: 30 },
    November: { ore: 8.5, turni: 2, straordinari: 3.5, pause: 25 },
    December: { ore: 8.7, turni: 3, straordinari: 4.8, pause: 20 }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  applyChartTheme();

  // Rileva ruolo salvato per impostare la visualizzazione corretta
  if (localStorage.getItem('role')) {
    currentRole = localStorage.getItem('role');
  } else if (window.location.pathname.includes('rspp.html')) {
    currentRole = 'rspp';
  } else if (window.location.pathname.includes('organizzazione.html')) {
    currentRole = 'organizzazione';
  } else if (window.location.pathname.includes('worker.html')) {
    currentRole = 'worker';
  }

  // Sincronizza date iniziali
  initDates();

  // Configura i listener per gli input e gli slider ambientali
  setupSliderListeners();

  // Gestione delle sezioni visibili all'avvio
  const roleSelector = document.getElementById('role-selector');
  if (roleSelector) roleSelector.classList.remove('hidden');
  
  const workerLogin = document.getElementById('worker-login');
  if (workerLogin) workerLogin.classList.add('hidden');
  
  if (window.location.pathname.includes('index.html')) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  }
  
  // Inizializzazione specifica per la pagina Worker
  if (window.location.pathname.includes('worker.html')) {
    const selectedWorker = localStorage.getItem('selected_worker');
    if (selectedWorker) {
      const displayField = document.getElementById('worker-name-display');
      if (displayField) displayField.value = selectedWorker;
      if (workerLogin) workerLogin.classList.add('hidden');
      const workerPage = document.getElementById('worker-page');
      if (workerPage) workerPage.classList.remove('hidden');
    } else {
      if (workerLogin) workerLogin.classList.remove('hidden');
      const workerPage = document.getElementById('worker-page');
      if (workerPage) workerPage.classList.add('hidden');
    }
  }
  
  // Caricamento dati iniziali per RSPP o Organizzazione
  if (window.location.pathname.includes('rspp.html') || document.getElementById('rspp-page')) {
    const rsppDateInput = document.getElementById('rspp-date');
    if (rsppDateInput && rsppDateInput.value) {
      loadRsppData(rsppDateInput.value);
    }
  }
  
  if (window.location.pathname.includes('organizzazione.html') || document.getElementById('org-page')) {
    loadOrgDashboard();
  }
});

/**
 * Gestisce l'inizializzazione coerente delle date in base allo stato produttivo o demo
 */
function initDates() {
  const today = new Date().toISOString().split('T')[0];
  const targetDate = placeholderMode ? "2026-02-15" : today;

  const workerDateInput = document.querySelector('input[name="worker-date"]');
  if (workerDateInput) workerDateInput.value = targetDate;
  
  const rsppDateInput = document.getElementById('rspp-date');
  if (rsppDateInput) rsppDateInput.value = targetDate;
  
  const orgDateInput = document.getElementById('org-date');
  if (orgDateInput) orgDateInput.value = targetDate;
}

function selectRole(role) {
  currentRole = role;
  localStorage.setItem('role', role);

  document.getElementById('role-selector').classList.add('hidden');
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  if (role === 'worker') {
    document.getElementById('worker-login').classList.remove('hidden');
  } else if (role === 'rspp') {
    document.getElementById('rspp-page').classList.remove('hidden');
    const rsppDate = document.getElementById('rspp-date').value;
    loadRsppData(rsppDate);
  } else if (role === 'organizzazione') {
    document.getElementById('org-page').classList.remove('hidden');
    loadOrgDashboard();
  }
}

function selectWorker(workerName) {
  const displayField = document.getElementById('worker-name-display');
  if (displayField) displayField.value = workerName;

  const workerRepartoMap = { 'Alice': 'Fonderia', 'Bob': 'Laminazione', 'Carlo': 'Trattamento', 'Diana': 'Assemblaggio', 'Emilio': 'Fonderia' };
  const repartoDisplay = document.getElementById('worker-reparto-display');
  if (repartoDisplay) {
    repartoDisplay.value = workerRepartoMap[workerName] || 'Fonderia';
  }
  
  localStorage.setItem('selected_worker', workerName);
  
  const loginModal = document.getElementById('worker-login');
  if (loginModal) loginModal.classList.add('hidden');
  
  const workerPage = document.getElementById('worker-page');
  if (workerPage) workerPage.classList.remove('hidden');
  
  setTimeout(() => {
    loadWorkerChart();
  }, 100);
}

function goBackToRoles() {
  currentRole = null;
  localStorage.removeItem('role');
  localStorage.removeItem('selected_worker');
  
  document.getElementById('worker-login').classList.add('hidden');
  document.getElementById('worker-page').classList.add('hidden');
  document.getElementById('role-selector').classList.remove('hidden');
}

function logout() {
  currentRole = null;
  currentWorkerHash = null;
  localStorage.removeItem('role');
  localStorage.removeItem('worker_hash');
  localStorage.removeItem('selected_worker');
  window.location.href = 'index.html';
}

function goBackHome() {
  window.location.href = 'index.html';
}

/**
 * Attiva/disattiva la modalità demo modificando lo stato e aggiornando le date dei moduli
 */
function togglePlaceholderMode() {
  placeholderMode = !placeholderMode;
  
  const btns = document.querySelectorAll('.toggle-placeholder-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', placeholderMode);
    // Cambia colore di feedback visivo al pulsante demo
    if (placeholderMode) {
      btn.style.backgroundColor = "#f59e0b";
      btn.style.color = "#fff";
    } else {
      btn.style.backgroundColor = "";
      btn.style.color = "";
    }
  });

  // Aggiorna le date per allinearsi con i dati presenti nel database demo (Febbraio 2026)
  initDates();

  // Ricarica la dashboard o la vista corrente
  if (currentRole === 'worker') {
    loadWorkerChart();
  } else if (currentRole === 'rspp' || window.location.pathname.includes('rspp.html')) {
    loadRsppData(document.getElementById('rspp-date').value);
  } else if (currentRole === 'organizzazione' || window.location.pathname.includes('organizzazione.html')) {
    loadOrgDashboard();
  }
}

function setupSliderListeners() {
  document.querySelectorAll('.input-slider-group').forEach(group => {
    const sliderInput = group.querySelector('.slider-input');
    const sliderRange = group.querySelector('.slider-range');
    const valueSpan = group.querySelector('.value') || group.parentElement.querySelector('.value');

    if (sliderInput && sliderRange) {
      // Input numerico controlla lo slider range
      sliderInput.addEventListener('input', () => {
        if (sliderInput.value === "") return;
        let val = parseFloat(sliderInput.value);
        const min = parseFloat(sliderRange.min);
        const max = parseFloat(sliderRange.max);
        
        val = Math.max(min, Math.min(max, val));
        sliderRange.value = val;
        if (valueSpan) valueSpan.textContent = val;
      });

      // Lo slider range controlla l'input numerico
      sliderRange.addEventListener('input', () => {
        const val = parseFloat(sliderRange.value);
        sliderInput.value = val;
        if (valueSpan) valueSpan.textContent = val;
      });

      if (valueSpan) valueSpan.textContent = sliderInput.value;
    }
  });
}

// ===== WORKER FUNCTIONS =====
async function workerSubmit() {
  const form = document.getElementById('worker-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  Object.keys(data).forEach(k => {
    if (k !== 'worker' && k !== 'worker-date') {
      data[k] = parseFloat(data[k]);
    }
  });

  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/calcola-iro${demoParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    document.getElementById('worker-iro').textContent = result.iro.toFixed(2);
    document.getElementById('worker-level').textContent = `Rischio ${result.livello}`;
    document.getElementById('worker-color-bar').style.background = result.colore;

    const sugList = document.getElementById('worker-suggestions');
    sugList.innerHTML = '';
    result.suggerimenti.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      sugList.appendChild(li);
    });

    if (result.worker_hash) {
      currentWorkerHash = result.worker_hash;
      localStorage.setItem('worker_hash', result.worker_hash);
    }

    loadWorkerChart();
  } catch (e) {
    console.error(e);
    document.getElementById('worker-iro').textContent = 'Errore';
  }
}

async function loadWorkerChart() {
  if (!currentWorkerHash) {
    const storedHash = localStorage.getItem('worker_hash');
    if (storedHash) {
      currentWorkerHash = storedHash;
    } else {
      return;
    }
  }
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/workers/${currentWorkerHash}${demoParam}`);
    const submissions = await res.json();

    const labels = submissions.map(s => new Date(s.timestamp).toLocaleDateString());
    const values = submissions.map(s => s.iro);

    const chartEl = document.getElementById('worker-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (workerChart) workerChart.destroy();

    workerChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'IRO',
          data: values,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.16)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#60a5fa',
          pointBorderColor: '#020617'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

// ===== RSPP FUNCTIONS =====
async function rsppSubmit() {
  const date = document.getElementById('rspp-date').value;
  const reparto = document.getElementById('rspp-reparto').value;

  if (!date) {
    alert("Seleziona una data valida.");
    return;
  }

  // Raccoglie i valori direttamente dagli input numerici legati ai dati ambientali
  const updateData = {
    role: 'rspp',
    day: date,
    reparto: reparto || null,
    rumore: parseFloat(document.querySelector('[data-slider-name="rumore"]').value),
    luce: parseFloat(document.querySelector('[data-slider-name="luce"]').value),
    vibrazioni: parseFloat(document.querySelector('[data-slider-name="vibrazioni"]').value),
    spazio: parseFloat(document.querySelector('[data-slider-name="spazio"]').value)
  };

  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/update-day${demoParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();
    const msgEl = document.getElementById('rspp-message');
    
    if (msgEl) {
      if (result.error) {
        msgEl.textContent = result.error;
        msgEl.className = "message error";
      } else {
        const repartoStr = result.reparto ? ` (${result.reparto})` : ' (tutti i reparti)';
        msgEl.textContent = `✓ Modifiche salvate nel database ${placeholderMode ? 'DEMO' : 'REALE'} per ${result.updated} record${repartoStr}`;
        msgEl.className = "message success";
      }
      msgEl.style.display = "block";
      setTimeout(() => { msgEl.style.display = "none"; }, 5000);
    }

    loadRsppData(date);
  } catch (e) {
    console.error(e);
    const msgEl = document.getElementById('rspp-message');
    if (msgEl) {
      msgEl.textContent = 'Errore di connessione con il server backend';
      msgEl.className = "message error";
      msgEl.style.display = "block";
    }
  }
}

async function loadRsppData(date) {
  const display = document.getElementById('rspp-data-display');
  if (!display) return;

  if (!date) {
    display.innerHTML = '<p>Seleziona una data per analizzare i record ambientali.</p>';
    return;
  }

  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/submissions${demoParam}`);
    const submissions = await res.json();

    const repartoFilter = document.getElementById('rspp-reparto')?.value || '';
    
    const dayData = submissions.filter(s => {
      if (s.day !== date) return false;
      if (repartoFilter && s.reparto !== repartoFilter) return false;
      return true;
    }).sort((a, b) => {
      const hourA = Number(a.hour) || 0;
      const hourB = Number(b.hour) || 0;
      if (hourA !== hourB) return hourA - hourB;
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });
    
    display.innerHTML = '';

    if (dayData.length === 0) {
      display.innerHTML = `<div class='no-data-alert'>Nessun dato trovato per il <strong>${date}</strong> nel database <strong>${placeholderMode ? 'DEMO' : 'PRODUZIONE'}</strong>.</div>`;
      return;
    }

    const formatValue = (value, decimals = 1) => {
      const num = Number(value);
      if (Number.isNaN(num)) return 'N/A';
      return Number(num.toFixed(decimals)).toString();
    };

    const byReparto = {};
    dayData.forEach(s => {
      const rep = s.reparto || 'N/D';
      if (!byReparto[rep]) byReparto[rep] = [];
      byReparto[rep].push(s);
    });

    Object.entries(byReparto)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([reparto, subs]) => {
        const avgIro = (subs.reduce((sum, s) => sum + Number(s.iro || 0), 0) / subs.length).toFixed(2);
        const avgRumore = (subs.reduce((sum, s) => sum + Number(s.input?.rumore || 0), 0) / subs.length).toFixed(1);
        const avgLuce = (subs.reduce((sum, s) => sum + Number(s.input?.luce || 0), 0) / subs.length).toFixed(0);
        const avgVibrazioni = (subs.reduce((sum, s) => sum + Number(s.input?.vibrazioni || 0), 0) / subs.length).toFixed(1);
        const avgSpazio = (subs.reduce((sum, s) => sum + Number(s.input?.spazio || 0), 0) / subs.length).toFixed(1);

        const repDiv = document.createElement('section');
        repDiv.className = 'reparto-group';

        const header = document.createElement('div');
        header.className = 'reparto-group-header';
        header.innerHTML = `
          <div>
            <div class="reparto-group-title">🏭 ${reparto}</div>
            <div class="reparto-group-meta">${subs.length} rilevazioni registrate • Media IRO ${avgIro}</div>
          </div>
          <div class="reparto-summary-tags">
            <span class="reparto-summary-tag">Rumore medio ${avgRumore} dB</span>
            <span class="reparto-summary-tag">Luce media ${avgLuce} lux</span>
            <span class="reparto-summary-tag">Vibrazioni medie ${avgVibrazioni}</span>
            <span class="reparto-summary-tag">Spazio medio ${avgSpazio}</span>
          </div>
        `;
        repDiv.appendChild(header);

        const recordList = document.createElement('div');
        recordList.className = 'reparto-record-list';

        subs.forEach((s, index) => {
          const div = document.createElement('article');
          div.className = 'data-item';
          div.style.borderLeft = `4px solid ${s.colore || '#ccc'}`;

          const suggerimenti = Array.isArray(s.suggerimenti) ? s.suggerimenti : [];
          const input = s.input || {};
          const summaryText = suggerimenti.length > 0 ? suggerimenti.join(', ') : 'Nessun suggerimento registrato';

          div.innerHTML = `
            <div class="data-item-header">
              <span>📅 ${s.day || date} • ⏰ ${String(s.hour || '00').padStart(2, '0')}:00</span>
              <span class="record-counter">#${index + 1}</span>
            </div>
            <div class="data-item-grid">
              <div>
                <span class="label">Reparto</span>
                <strong>${s.reparto || 'N/D'}</strong>
              </div>
              <div>
                <span class="label">Operatore</span>
                <code>${s.worker_hash ? `${s.worker_hash.slice(0, 8)}...` : 'N/D'}</code>
              </div>
              <div>
                <span class="label">Indice IRO</span>
                <strong style="color:${s.colore || '#ccc'}">${formatValue(s.iro, 2)}</strong>
              </div>
              <div>
                <span class="label">Livello</span>
                <strong style="color:${s.colore || '#ccc'}">${s.livello || 'N/D'}</strong>
              </div>
              <div>
                <span class="label">Rumore</span>
                <strong>${formatValue(input.rumore, 1)} dB</strong>
              </div>
              <div>
                <span class="label">Luce</span>
                <strong>${formatValue(input.luce, 0)} lux</strong>
              </div>
              <div>
                <span class="label">Vibrazioni</span>
                <strong>${formatValue(input.vibrazioni, 1)}</strong>
              </div>
              <div>
                <span class="label">Spazio</span>
                <strong>${formatValue(input.spazio, 1)}</strong>
              </div>
            </div>
            <div class="data-item-suggestions">
              <strong>📌 Suggerimenti</strong>
              <div class="suggestion-tag-list">
                ${suggerimenti.length > 0 ? suggerimenti.map(item => `<span class="suggestion-tag">${item}</span>`).join('') : `<span class="suggestion-tag">${summaryText}</span>`}
              </div>
            </div>
          `;

          recordList.appendChild(div);
        });

        repDiv.appendChild(recordList);
        display.appendChild(repDiv);
      });
  } catch (e) {
    console.error(e);
    display.innerHTML = '<p class="error">Impossibile connettersi al server per scaricare le metriche storiche.</p>';
  }
}

// Intercettore di cambi su campi data o reparto per aggiornare in tempo reale la tabella RSPP
document.addEventListener('change', (e) => {
  if (e.target.id === 'rspp-date' || e.target.id === 'rspp-reparto') {
    const dateInput = document.getElementById('rspp-date');
    if (dateInput && dateInput.value) {
      loadRsppData(dateInput.value);
    }
  }
});

// ===== ORGANIZATION FUNCTIONS =====
const REPARTO_COLORS = {
  'Fonderia':     { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'Laminazione':  { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'Trattamento':  { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'Assemblaggio': { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
};

async function loadOrgDashboard() {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/submissions${demoParam}`);
    const submissions = await res.json();

    const totalSubEl = document.getElementById('org-total-submissions');
    if (totalSubEl) totalSubEl.textContent = submissions.length;

    const uniqueWorkers = new Set(submissions.map(s => s.worker_hash)).size;
    const uniqueWorkersEl = document.getElementById('org-unique-workers');
    if (uniqueWorkersEl) uniqueWorkersEl.textContent = uniqueWorkers;

    const avgIro = submissions.length > 0
      ? (submissions.reduce((sum, s) => sum + s.iro, 0) / submissions.length).toFixed(2)
      : 0;
    const avgIroEl = document.getElementById('org-avg-iro');
    if (avgIroEl) avgIroEl.textContent = avgIro;

    loadOrgChart(submissions);
    loadOrgRepartoChart(submissions);
    loadOrgRiskChart(submissions);
    loadOrgHourlyChart(submissions);
    loadOrgRepartoVolumeChart(submissions);
    loadOrgRepartoStats(submissions);
    loadOrgWorkers();
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgChart(submissions = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const rows = submissions
      ? submissions.map(s => ({ day: s.day, avg_iro: s.iro, reparto: s.reparto }))
      : (await (await fetch(`${API_BASE_URL}/organization/graph${demoParam}`)).json());

    const byDay = {};
    rows.forEach(r => {
      if (!byDay[r.day]) byDay[r.day] = [];
      byDay[r.day].push(r.avg_iro);
    });

    const labels = Object.keys(byDay).sort();
    const values = labels.map(day => {
      const dayValues = byDay[day];
      return (dayValues.reduce((a, b) => a + b, 0) / dayValues.length).toFixed(3);
    });

    const chartEl = document.getElementById('org-main-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (orgChart) orgChart.destroy();

    orgChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg IRO giornaliero',
          data: values,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          fill: true,
          tension: 0.38,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#d0f8e3',
          pointHoverRadius: 6,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 10
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            grid: { drawBorder: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgRepartoChart(rows = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const graphRows = rows
      ? (Array.isArray(rows) && rows.length > 0 && typeof rows[0].avg_iro !== 'undefined'
          ? rows
          : rows.map(s => ({ day: s.day, reparto: s.reparto, avg_iro: s.iro })))
      : (await (await fetch(`${API_BASE_URL}/organization/graph${demoParam}`)).json());

    const byDayReparto = {};
    const allDays = new Set();
    const repartiSet = new Set();

    graphRows.forEach(r => {
      const key = `${r.day}||${r.reparto}`;
      if (!byDayReparto[key]) byDayReparto[key] = [];
      byDayReparto[key].push(r.avg_iro);
      allDays.add(r.day);
      repartiSet.add(r.reparto);
    });

    const labels = [...allDays].sort();
    const reparti = [...repartiSet].sort();

    const datasets = reparti.map(reparto => {
      const colors = REPARTO_COLORS[reparto] || { border: '#999', bg: 'rgba(153,153,153,0.15)' };
      const data = labels.map(day => {
        const key = `${day}||${reparto}`;
        if (byDayReparto[key] && byDayReparto[key].length > 0) {
          return (byDayReparto[key].reduce((a, b) => a + b, 0) / byDayReparto[key].length).toFixed(3);
        }
        return null;
      });
      return {
        label: reparto,
        data: data,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        fill: false,
        tension: 0.4,
        spanGaps: true,
      };
    });

    const chartEl = document.getElementById('org-reparto-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (orgRepartoChart) orgRepartoChart.destroy();

    orgRepartoChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true, position: 'bottom' } },
        scales: {
          y: {
            min: 0,
            max: 1,
            grid: { drawBorder: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgRiskChart(submissions = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const data = submissions || (await (await fetch(`${API_BASE_URL}/submissions${demoParam}`)).json());
    const levelCounts = { ALTO: 0, MEDIO: 0, BASSO: 0 };

    data.forEach(s => {
      const level = s.livello || 'N/D';
      if (levelCounts[level] !== undefined) levelCounts[level] += 1;
    });

    const chartEl = document.getElementById('org-risk-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (orgRiskChart) orgRiskChart.destroy();

    orgRiskChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ALTO', 'MEDIO', 'BASSO'],
        datasets: [{
          data: [levelCounts.ALTO, levelCounts.MEDIO, levelCounts.BASSO],
          backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
          borderColor: 'rgba(4, 10, 18, 0.95)',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12 }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgHourlyChart(submissions = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const data = submissions || (await (await fetch(`${API_BASE_URL}/submissions${demoParam}`)).json());
    const avgByHour = {};
    const seenCounts = {};

    data.forEach(s => {
      const hour = String(s.hour || '0').padStart(2, '0');
      if (!avgByHour[hour]) {
        avgByHour[hour] = [];
        seenCounts[hour] = 0;
      }
      avgByHour[hour].push(Number(s.iro) || 0);
      seenCounts[hour] += 1;
    });

    const labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
    const values = labels.map(label => {
      const hour = label.slice(0,2);
      const dataForHour = avgByHour[hour] || [];
      if (dataForHour.length === 0) return null;
      return (dataForHour.reduce((sum, value) => sum + value, 0) / dataForHour.length).toFixed(3);
    });

    const chartEl = document.getElementById('org-hourly-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (orgHourlyChart) orgHourlyChart.destroy();

    orgHourlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Media IRO per ora',
          data: values,
          backgroundColor: values.map((_, index) => index % 2 === 0 ? 'rgba(34, 197, 94, 0.68)' : 'rgba(96, 165, 250, 0.62)'),
          borderColor: values.map((_, index) => index % 2 === 0 ? '#22c55e' : '#60a5fa'),
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 1,
            grid: { drawBorder: false }
          },
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
            }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgRepartoVolumeChart(submissions = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const data = submissions || (await (await fetch(`${API_BASE_URL}/submissions${demoParam}`)).json());
    const counts = {};

    data.forEach(s => {
      const rep = s.reparto || 'N/D';
      counts[rep] = (counts[rep] || 0) + 1;
    });

    const labels = Object.keys(counts).sort();
    const values = labels.map(reparto => counts[reparto]);
    const colors = labels.map(reparto => REPARTO_COLORS[reparto]?.border || '#999');

    const chartEl = document.getElementById('org-reparto-volume-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (orgRepartoVolumeChart) orgRepartoVolumeChart.destroy();

    orgRepartoVolumeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Rilevazioni per reparto',
          data: values,
          backgroundColor: colors.map(color => `${color}cc`),
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { drawBorder: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgRepartoStats(submissions = null) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const data = submissions || (await (await fetch(`${API_BASE_URL}/submissions${demoParam}`)).json());

    const container = document.getElementById('org-reparto-stats');
    if (!container) return;
    container.innerHTML = '';

    const byReparto = {};
    data.forEach(s => {
      const rep = s.reparto || 'N/D';
      if (!byReparto[rep]) byReparto[rep] = [];
      byReparto[rep].push(s);
    });

    for (const [reparto, subs] of Object.entries(byReparto)) {
      const avgIro = (subs.reduce((sum, s) => sum + s.iro, 0) / subs.length).toFixed(2);
      const livelli = subs.map(s => s.livello);
      const rischiAlto = livelli.filter(l => l === 'ALTO').length;
      const rischiMedio = livelli.filter(l => l === 'MEDIO').length;
      const rischiBasso = livelli.filter(l => l === 'BASSO').length;
      const colors = REPARTO_COLORS[reparto] || { border: '#999', bg: 'rgba(153,153,153,0.15)' };

      const card = document.createElement('div');
      card.className = 'stat-card reparto-stat-card';
      card.style.cssText = `border-left: 4px solid ${colors.border};`;
      card.innerHTML = `
        <div class="stat-label" style="font-weight:600;color:${colors.border};">🏭 ${reparto}</div>
        <div class="stat-value" style="font-size:1.2rem;">IRO medio: ${avgIro}</div>
        <div style="font-size:0.8rem;margin-top:0.3rem;color:rgba(255,255,255,0.8);">
          <span style="color:#ef4444;">🔴 ${rischiAlto}</span>
          <span style="color:#f59e0b;margin-left:0.5rem;">🟡 ${rischiMedio}</span>
          <span style="color:#22c55e;margin-left:0.5rem;">🟢 ${rischiBasso}</span>
          &nbsp;| ${subs.length} rilevazioni
        </div>
      `;
      container.appendChild(card);
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgWorkers() {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/workers${demoParam}`);
    const workers = await res.json();

    const container = document.getElementById('org-workers-list');
    if (!container) return;
    container.innerHTML = '';

    workers.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'worker-btn-org';
      btn.textContent = `${w.worker_hash.slice(0, 8)}... (${w.count})`;
      btn.addEventListener('click', () => loadOrgWorkerDetail(w.worker_hash));
      container.appendChild(btn);
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgWorkerDetail(workerHash) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/workers/${workerHash}${demoParam}`);
    const submissions = await res.json();

    const detail = document.getElementById('org-worker-detail');
    if (!detail) return;
    detail.innerHTML = '';

    const table = document.createElement('table');
    table.className = "data-table";
    table.innerHTML = '<thead><tr><th>Data</th><th>Ora</th><th>Reparto</th><th>IRO</th><th>Livello</th></tr></thead>';
    const tbody = document.createElement('tbody');

    submissions.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.day}</td><td>${s.hour}:00</td><td>${s.reparto || 'N/D'}</td><td><strong>${s.iro}</strong></td><td style="color:${s.colore};font-weight:600;">${s.livello}</td>`;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    detail.appendChild(table);

    const section = document.getElementById('worker-detail-section');
    if (section) section.classList.remove('hidden');
  } catch (e) {
    console.error(e);
  }
}

function closeWorkerDetail() {
  const section = document.getElementById('worker-detail-section');
  if (section) section.classList.add('hidden');
}

async function orgSubmit() {
  const form = document.getElementById('org-edit-form');
  const date = document.getElementById('org-date').value;
  const formData = new FormData(form);

  const updateData = {
    role: 'organizzazione',
    day: date,
    ore: parseFloat(formData.get('ore')),
    turni: parseFloat(formData.get('turni')),
    straordinari: parseFloat(formData.get('straordinari')),
    pause: parseFloat(formData.get('pause'))
  };

  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`${API_BASE_URL}/update-day${demoParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();
    const msgEl = document.getElementById('org-message');
    
    if (msgEl) {
      if (result.error) {
        msgEl.textContent = result.error;
        msgEl.className = "message error";
      } else {
        msgEl.textContent = `✓ Dati organizzativi aggiornati con successo per ${result.updated} record(s)`;
        msgEl.className = "message success";
      }
    }

    setTimeout(loadOrgDashboard, 500);
  } catch (e) {
    console.error(e);
    const msgEl = document.getElementById('org-message');
    if (msgEl) {
      msgEl.textContent = 'Errore di connessione';
      msgEl.className = "message error";
    }
  }
}