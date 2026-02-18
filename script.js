let currentRole = null;
let currentWorkerHash = null;
let orgChart = null;
let workerChart = null;
let placeholderMode = false;

// Placeholder data for months
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
  // Set dates to today
  const today = new Date().toISOString().split('T')[0];
  const workerDateInput = document.querySelector('input[name="worker-date"]');
  if (workerDateInput) workerDateInput.value = today;
  const rsppDateInput = document.getElementById('rspp-date');
  if (rsppDateInput) rsppDateInput.value = today;
  const orgDateInput = document.getElementById('org-date');
  if (orgDateInput) orgDateInput.value = today;

  // Setup slider listeners
  setupSliderListeners();

  // Ensure role selector is visible and modals are hidden on initial load
  const roleSelector = document.getElementById('role-selector');
  if (roleSelector) {
    roleSelector.classList.remove('hidden');
  }
  
  const workerLogin = document.getElementById('worker-login');
  if (workerLogin) {
    workerLogin.classList.add('hidden');
  }
  
  // On index.html, hide all pages by default
  if (window.location.pathname.includes('index.html')) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
      p.classList.add('hidden');
    });
  }
  
  // If on worker page, check if worker is selected
  if (window.location.pathname.includes('worker.html')) {
    const selectedWorker = localStorage.getItem('selected_worker');
    if (selectedWorker) {
      const displayField = document.getElementById('worker-name-display');
      if (displayField) {
        displayField.value = selectedWorker;
      }
      const workerLogin = document.getElementById('worker-login');
      if (workerLogin) {
        workerLogin.classList.add('hidden');
      }
      const workerPage = document.getElementById('worker-page');
      if (workerPage) {
        workerPage.classList.remove('hidden');
      }
    } else {
      // Show login modal if no worker selected
      const workerLogin = document.getElementById('worker-login');
      if (workerLogin) {
        workerLogin.classList.remove('hidden');
      }
      const workerPage = document.getElementById('worker-page');
      if (workerPage) {
        workerPage.classList.add('hidden');
      }
    }
  }
  
  // If on rspp or org page, load dashboard
  if (window.location.pathname.includes('rspp.html')) {
    const rsppForm = document.getElementById('rspp-form');
    if (rsppForm && localStorage.getItem('rspp-date')) {
      loadRsppData(localStorage.getItem('rspp-date'));
    }
  }
  
  if (window.location.pathname.includes('organizzazione.html')) {
    loadOrgDashboard();
  }
});

function selectRole(role) {
  currentRole = role;
  localStorage.setItem('role', role);

  // Hide role selector
  document.getElementById('role-selector').classList.add('hidden');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  // Show selected page
  if (role === 'worker') {
    // Show worker login modal instead of directly showing the page
    document.getElementById('worker-login').classList.remove('hidden');
  } else if (role === 'rspp') {
    document.getElementById('rspp-page').classList.remove('hidden');
  } else if (role === 'organizzazione') {
    document.getElementById('org-page').classList.remove('hidden');
    loadOrgDashboard();
  }
}

function selectWorker(workerName) {
  console.log('selectWorker called with:', workerName);
  
  // Set the worker name in the display field
  const displayField = document.getElementById('worker-name-display');
  console.log('Display field found:', displayField);
  
  if (displayField) {
    displayField.value = workerName;
    console.log('Set display field value to:', workerName);
  }
  
  // Store in localStorage
  localStorage.setItem('selected_worker', workerName);
  console.log('Stored in localStorage:', workerName);
  
  // Hide worker login modal
  const loginModal = document.getElementById('worker-login');
  console.log('Login modal found:', loginModal);
  if (loginModal) {
    loginModal.classList.add('hidden');
    console.log('Hidden login modal');
  }
  
  // Show worker page if it exists
  const workerPage = document.getElementById('worker-page');
  console.log('Worker page found:', workerPage);
  if (workerPage) {
    workerPage.classList.remove('hidden');
    console.log('Showed worker page');
  }
  
  // Load worker chart data if exists
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

function togglePlaceholderMode() {
  placeholderMode = !placeholderMode;
  
  const btns = document.querySelectorAll('.toggle-placeholder-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', placeholderMode);
  });

  // Reload current dashboard with demo data
  if (currentRole === 'worker') {
    loadWorkerChart();
  } else if (currentRole === 'rspp') {
    loadRsppData(document.getElementById('rspp-date').value);
  } else if (currentRole === 'organizzazione') {
    loadOrgDashboard();
  }
}

function setupSliderListeners() {
  // Setup for old-style sliders (fallback)
  document.querySelectorAll('input[type="range"]').forEach(input => {
    const span = input.parentElement.querySelector('.value');
    if (span && !input.classList.contains('slider-range')) {
      span.textContent = input.value;
      input.addEventListener('input', () => {
        span.textContent = input.value;
      });
    }
  });

  // Setup for new input-slider-group
  document.querySelectorAll('.input-slider-group').forEach(group => {
    const sliderInput = group.querySelector('.slider-input');
    const sliderRange = group.querySelector('.slider-range');
    const valueSpan = group.parentElement.querySelector('.value');

    if (sliderInput && sliderRange) {
      // Sync input to slider and value display
      sliderInput.addEventListener('input', () => {
        let val = parseFloat(sliderInput.value);
        const min = parseFloat(sliderRange.min);
        const max = parseFloat(sliderRange.max);
        
        // Clamp value
        val = Math.max(min, Math.min(max, val));
        sliderInput.value = val;
        sliderRange.value = val;
        
        if (valueSpan) valueSpan.textContent = val;
      });

      // Sync slider to input and value display
      sliderRange.addEventListener('input', () => {
        const val = parseFloat(sliderRange.value);
        sliderInput.value = val;
        if (valueSpan) valueSpan.textContent = val;
      });

      // Initialize value display
      if (valueSpan) valueSpan.textContent = sliderInput.value;
    }
  });
}

// ===== WORKER FUNCTIONS =====
async function workerSubmit() {
  const form = document.getElementById('worker-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Convert numeric strings
  Object.keys(data).forEach(k => {
    if (k !== 'worker' && k !== 'worker-date') {
      data[k] = parseFloat(data[k]);
    }
  });

  try {
    const res = await fetch('http://localhost:8000/api/calcola-iro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    // Display results
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

    // Store worker hash
    if (result.worker_hash) {
      currentWorkerHash = result.worker_hash;
      localStorage.setItem('worker_hash', result.worker_hash);
    }

    // Load worker chart
    loadWorkerChart();
  } catch (e) {
    console.error(e);
    document.getElementById('worker-iro').textContent = 'Errore';
  }
}

async function loadWorkerChart() {
  if (!currentWorkerHash) return;
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/workers/${currentWorkerHash}${demoParam}`);
    const submissions = await res.json();

    const labels = submissions.map(s => new Date(s.timestamp).toLocaleDateString());
    const values = submissions.map(s => s.iro);

    const ctx = document.getElementById('worker-chart').getContext('2d');
    if (workerChart) workerChart.destroy();

    workerChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'IRO',
          data: values,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true } },
        scales: { y: { min: 0, max: 1 } }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

// ===== RSPP FUNCTIONS =====
async function rsppSubmit() {
  const form = document.getElementById('rspp-form');
  const date = document.getElementById('rspp-date').value;
  const formData = new FormData(form);

  // Build update payload
  const updateData = {
    role: 'rspp',
    day: date,
    rumore: parseFloat(formData.get('rumore')),
    luce: parseFloat(formData.get('luce')),
    vibrazioni: parseFloat(formData.get('vibrazioni')),
    spazio: parseFloat(formData.get('spazio'))
  };

  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/update-day${demoParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();

    const msgEl = document.getElementById('rspp-message');
    if (result.error) {
      msgEl.textContent = result.error;
      msgEl.classList.remove('success');
      msgEl.classList.add('error');
    } else {
      msgEl.textContent = `✓ Modifiche salvate per ${result.updated} submission(s)`;
      msgEl.classList.add('success');
      msgEl.classList.remove('error');
    }

    loadRsppData(date);
  } catch (e) {
    console.error(e);
    document.getElementById('rspp-message').textContent = 'Errore di connessione';
    document.getElementById('rspp-message').classList.add('error');
  }
}

async function loadRsppData(date) {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/submissions${demoParam}`);
    const submissions = await res.json();

    const dayData = submissions.filter(s => s.day === date);
    const display = document.getElementById('rspp-data-display');
    display.innerHTML = '';

    if (dayData.length === 0) {
      display.innerHTML = '<p>Nessun dato per questa data</p>';
      return;
    }

    dayData.forEach(s => {
      const div = document.createElement('div');
      div.className = 'data-item';
      div.innerHTML = `
        <div class="data-item-header">${s.timestamp}</div>
        <div class="data-item-details">
          IRO: ${s.iro} (${s.livello}) | Rumore: ${s.input?.rumore || 'N/A'} dB | Luce: ${s.input?.luce || 'N/A'} lux
        </div>
      `;
      display.appendChild(div);
    });
  } catch (e) {
    console.error(e);
  }
}

// Listen for date changes in RSPP page
document.addEventListener('change', (e) => {
  if (e.target.id === 'rspp-date') {
    loadRsppData(e.target.value);
  }
});

// ===== ORGANIZATION FUNCTIONS =====
async function loadOrgDashboard() {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/submissions${demoParam}`);
    const submissions = await res.json();

    // Stats
    document.getElementById('org-total-submissions').textContent = submissions.length;

    const uniqueWorkers = new Set(submissions.map(s => s.worker_hash)).size;
    document.getElementById('org-unique-workers').textContent = uniqueWorkers;

    const avgIro = submissions.length > 0
      ? (submissions.reduce((sum, s) => sum + s.iro, 0) / submissions.length).toFixed(2)
      : 0;
    document.getElementById('org-avg-iro').textContent = avgIro;

    // Main chart
    loadOrgChart();

    // Workers list
    loadOrgWorkers();
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgChart() {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/organization/graph${demoParam}`);
    const rows = await res.json();

    // Group by day
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

    const ctx = document.getElementById('org-main-chart').getContext('2d');
    if (orgChart) orgChart.destroy();

    orgChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg IRO per Day',
          data: values,
          borderColor: '#4facfe',
          backgroundColor: 'rgba(79, 172, 254, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true } },
        scales: { y: { min: 0, max: 1 } }
      }
    });
  } catch (e) {
    console.error(e);
  }
}

async function loadOrgWorkers() {
  try {
    const demoParam = placeholderMode ? '?demo=true' : '';
    const res = await fetch(`http://localhost:8000/api/workers${demoParam}`);
    const workers = await res.json();

    const container = document.getElementById('org-workers-list');
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
    const res = await fetch(`http://localhost:8000/api/workers/${workerHash}${demoParam}`);
    const submissions = await res.json();

    const detail = document.getElementById('org-worker-detail');
    detail.innerHTML = '';

    // Table
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Data</th><th>Ora</th><th>IRO</th><th>Livello</th></tr></thead>';
    const tbody = document.createElement('tbody');

    submissions.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.day}</td><td>${s.hour}:00</td><td>${s.iro}</td><td>${s.livello}</td>`;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    detail.appendChild(table);

    document.getElementById('worker-detail-section').classList.remove('hidden');
  } catch (e) {
    console.error(e);
  }
}

function closeWorkerDetail() {
  document.getElementById('worker-detail-section').classList.add('hidden');
}

async function orgSubmit() {
  const form = document.getElementById('org-edit-form');
  const date = document.getElementById('org-date').value;
  const formData = new FormData(form);

  // Build update payload
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
    const res = await fetch(`http://localhost:8000/api/update-day${demoParam}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    const result = await res.json();

    const msgEl = document.getElementById('org-message');
    if (result.error) {
      msgEl.textContent = result.error;
      msgEl.classList.remove('success');
      msgEl.classList.add('error');
    } else {
      msgEl.textContent = `✓ Dati organizzativi aggiornati per ${result.updated} submission(s)`;
      msgEl.classList.add('success');
      msgEl.classList.remove('error');
    }

    // Reload dashboard
    setTimeout(loadOrgDashboard, 500);
  } catch (e) {
    console.error(e);
    document.getElementById('org-message').textContent = 'Errore di connessione';
    document.getElementById('org-message').classList.add('error');
  }
}
