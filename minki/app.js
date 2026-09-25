/* ============================================================
   MediShield AI – Hospital Surveillance Dashboard
   app.js – Dynamic Data Engine + UI Renderer
   ============================================================ */

'use strict';

// ─── LIVE DATA STORE ──────────────────────────────────────────
const DATA = {
  patients:       { value: 0,    change: 0,   dir: 'up',   vs: 'vs last week' },
  infections:     { value: 0,    change: 0,   dir: 'up',   vs: 'vs last week' },
  highRisk:       { value: 0,    change: 0,   dir: 'up',   vs: 'vs last week' },
  icuOccupancy:   { value: 0,    change: 5,   dir: 'up',   vs: 'vs last week', beds: { occ: 0, total: 400 } },
  antibioticUsage:{ value: 1562, change: 4,   dir: 'down', vs: 'vs last week' },
  alerts:         { value: 23,   change: null, dir: 'neutral', vs: 'New this week' },
};

// ─── COMPUTE REAL STATS FROM PATIENTS_DB ─────────────────────
function computeStatsFromDB() {
  const db = window.PATIENTS_DB || [];
  const total = db.length;

  // Active infections: patients NOT discharged whose diagnosis is infection-related
  const infectionDiags = [
    'Sepsis','UTI','Pneumonia','Post-op Infection','MRSA','SSI','ARDS','HAI – UTI',
    'Carbapenem-Resistant Klebsiella','Ventilator-Associated Pneumonia','Bacteremia',
    'Clostridium difficile Infection','Central Line-Associated BSI','Surgical Site Infection',
    'Hospital-Acquired Pneumonia','Urinary Catheter Infection','ESBL E. coli',
    'Methicillin-Resistant S. aureus','Vancomycin-Resistant Enterococcus','COVID-19',
    'Influenza A','Tuberculosis','Endocarditis','Meningitis','Peritonitis',
    'Cellulitis','Osteomyelitis','Empyema','Pyelonephritis','Colitis',
    'Soft Tissue Infection','Wound Infection','Respiratory Syncytial Virus',
    'Multidrug-Resistant Acinetobacter','Pseudomonas Aeruginosa Infection'
  ];
  const activePatients  = db.filter(p => p.status !== 'Discharged');
  const infections      = activePatients.filter(p => infectionDiags.includes(p.diag)).length;
  const highRisk        = db.filter(p => p.risk === 'high').length;

  // ICU patients: any ward starting with 'ICU'
  const icuPatients = db.filter(p => p.ward && p.ward.startsWith('ICU'));
  const icuOcc      = icuPatients.length;
  const ICU_TOTAL   = 400;
  const icuPct      = Math.round((icuOcc / ICU_TOTAL) * 100);

  DATA.patients.value        = total;
  DATA.infections.value      = infections;
  DATA.highRisk.value        = highRisk;
  DATA.icuOccupancy.value    = icuPct;
  DATA.icuOccupancy.beds.occ = icuOcc;
}

const AMR_ALERTS = [
  { pathogen: 'Klebsiella pneumoniae', resistance: 'Carbapenem', trend: 'up',   level: 'high' },
  { pathogen: 'Escherichia coli',      resistance: 'ESBL',       trend: 'up',   level: 'high' },
  { pathogen: 'Pseudomonas aeruginosa',resistance: 'Carbapenem', trend: 'up',   level: 'medium' },
  { pathogen: 'Staphylococcus aureus', resistance: 'MRSA',       trend: 'stable',level:'medium' },
  { pathogen: 'Acinetobacter baumannii',resistance:'Carbapenem', trend: 'up',   level: 'high' },
];

const CRITICAL_ALERTS = [
  { level: 'high',   icon: '🔴', msg: '5 New High Risk Patients in ICU',    time: '10 min ago' },
  { level: 'high',   icon: '🔴', msg: '3 Infection Clusters Detected',       time: '25 min ago' },
  { level: 'medium', icon: '🟠', msg: '2 Ventilator Associated Pneumonia',   time: '45 min ago' },
  { level: 'info',   icon: '🔵', msg: 'Low Stock: Meropenem',                time: '1 hr ago' },
];

const GENOMIC_DATA = [
  { id: 'SG-24567', organism: 'SARS-CoV-2',    variant: 'BA.2.86', date: '16 May 2024', ward: 'ISO-3' },
  { id: 'SG-24568', organism: 'K. pneumoniae',  variant: 'ST147',   date: '16 May 2024', ward: 'ICU-1' },
  { id: 'SG-24569', organism: 'E. coli',        variant: 'ST131',   date: '16 May 2024', ward: 'MED-2' },
  { id: 'SG-24570', organism: 'P. aeruginosa',  variant: 'ST235',   date: '15 May 2024', ward: 'SUR-1' },
  { id: 'SG-24571', organism: 'S. aureus',      variant: 'USA300',  date: '15 May 2024', ward: 'ICU-2' },
];

const RESOURCES = [
  { name: 'Ventilators',     pct: 72, used: 36,  total: 50,  icon: '🫁', color: '#42a5f5' },
  { name: 'Oxygen Supply',   pct: 65, used: 130, total: 200, icon: '🅾️', color: '#26c6da' },
  { name: 'Isolation Rooms', pct: 60, used: 18,  total: 30,  icon: '🏥', color: '#ab47bc' },
  { name: 'Staff Avail.',    pct: 82, used: 145, total: 176, icon: '👥', color: '#66bb6a' },
];

const PATHOGENS = [
  { name: 'E. coli',         count: 120, color: '#ef5350' },
  { name: 'Klebsiella spp.', count: 98,  color: '#ffa726' },
  { name: 'P. aeruginosa',   count: 76,  color: '#66bb6a' },
  { name: 'S. aureus',       count: 54,  color: '#29b6f6' },
  { name: 'A. baumannii',    count: 32,  color: '#ab47bc' },
];

const TREND_DAYS = ['13 May','14 May','15 May','16 May','17 May','18 May','19 May'];
const TREND_DATA = {
  HAI: [22, 28, 30, 25, 35, 40, 38],
  UTI: [40, 45, 42, 50, 55, 52, 60],
  BSI: [15, 18, 16, 20, 22, 19, 25],
  SSI: [8,  10, 9,  12, 11, 14, 13],
};

const ICU_RISK = { high: 45, medium: 50, low: 29 };

const BED_DATA = { occupied: 312, available: 78, reserved: 10, total: 400 };

// ─── CHART INSTANCES ─────────────────────────────────────────
const charts = {};

// ─── CURRENT PAGE ────────────────────────────────────────────
let currentPage = 'overview';

// ─── UTILITY ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n.toString();
}

function fmtFull(n) {
  return n.toLocaleString();
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── CLOCK ───────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
    const el = $('topbarClock');
    if (el) el.textContent = str;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── NAVIGATION ──────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  renderPage(page);
}

function toggleSidebar() {
  $('sidebar').classList.toggle('collapsed');
}

// ─── DARK MODE ───────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = $('darkModeToggle').checked;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  // Redraw charts on theme change
  setTimeout(() => renderPage(currentPage), 50);
}

// ─── SEARCH ──────────────────────────────────────────────────
const SEARCH_DATA = [
  { label: 'Patient: John Doe – Room 214', icon: '👤' },
  { label: 'Ward: ICU-1 – 12 patients', icon: '🏥' },
  { label: 'Pathogen: E. coli – 120 cases', icon: '🦠' },
  { label: 'Alert: High Risk Patient #4521', icon: '⚠️' },
  { label: 'Sample: SG-24567 – SARS-CoV-2', icon: '🧬' },
  { label: 'Bed: 312/400 Occupied', icon: '🛏️' },
];

function handleSearch() {
  const val = $('searchInput').value.trim().toLowerCase();
  const searchBarEl = document.querySelector('.search-bar');
  let sr = document.querySelector('.search-results');
  if (!val) { if (sr) sr.remove(); return; }
  const matches = SEARCH_DATA.filter(d => d.label.toLowerCase().includes(val));
  if (!matches.length) { if (sr) sr.remove(); return; }
  if (!sr) {
    sr = document.createElement('div');
    sr.className = 'search-results';
    searchBarEl.appendChild(sr);
  }
  sr.innerHTML = matches.map(m => `<div class="sr-item" onclick="closeSearch()">${m.icon} ${m.label}</div>`).join('');
}

function closeSearch() {
  $('searchInput').value = '';
  const sr = document.querySelector('.search-results');
  if (sr) sr.remove();
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-bar')) closeSearch();
});

// ─── SPARKLINE ───────────────────────────────────────────────
function drawSparkline(canvas, data, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth || 90;
  const h = canvas.height = canvas.offsetHeight || 40;
  ctx.clearRect(0, 0, w, h);
  if (!data || data.length < 2) return;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2
  }));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // fill
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = color + '33';
  ctx.fill();
}

// ─── HEATMAP (canvas) ─────────────────────────────────────────
function drawHeatmap(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  // Draw floor grid
  ctx.strokeStyle = 'rgba(79,195,247,0.15)';
  ctx.lineWidth = 0.5;
  const gw = w / 8, gh = h / 6;
  for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i*gw,0); ctx.lineTo(i*gw,h); ctx.stroke(); }
  for (let j = 0; j <= 6; j++) { ctx.beginPath(); ctx.moveTo(0,j*gh); ctx.lineTo(w,j*gh); ctx.stroke(); }

  // Draw rooms
  const rooms = [
    [0.5,0.5,2,1],[2.5,0.5,2,1],[4.5,0.5,1.5,1],[6,0.5,1.5,1],
    [0.5,1.8,1.5,1.5],[2.5,1.8,2,1.5],[5,1.8,2,1.5],
    [0.5,3.5,2,1.5],[3,3.5,2,1.5],[5.5,3.5,2,1.5],
  ];
  ctx.strokeStyle = 'rgba(79,195,247,0.3)';
  ctx.lineWidth = 1;
  rooms.forEach(([x,y,rw,rh]) => {
    ctx.strokeRect(x*gw, y*gh, rw*gw, rh*gh);
    ctx.fillStyle = 'rgba(13,24,40,0.5)';
    ctx.fillRect(x*gw+0.5, y*gh+0.5, rw*gw-1, rh*gh-1);
  });

  // Draw infection hotspots
  const hotspots = [
    { x: w*0.22, y: h*0.35, r: 45, intensity: 0.9 },
    { x: w*0.60, y: h*0.50, r: 55, intensity: 0.75 },
    { x: w*0.75, y: h*0.20, r: 35, intensity: 0.6 },
    { x: w*0.40, y: h*0.70, r: 30, intensity: 0.5 },
    { x: w*0.15, y: h*0.70, r: 25, intensity: 0.4 },
  ];

  hotspots.forEach(hs => {
    const grad = ctx.createRadialGradient(hs.x, hs.y, 0, hs.x, hs.y, hs.r);
    grad.addColorStop(0,   `rgba(255,23,68,${hs.intensity})`);
    grad.addColorStop(0.3, `rgba(255,152,0,${hs.intensity*0.7})`);
    grad.addColorStop(0.7, `rgba(255,235,59,${hs.intensity*0.3})`);
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(hs.x - hs.r, hs.y - hs.r, hs.r*2, hs.r*2);
  });

  // Labels
  ctx.fillStyle = 'rgba(79,195,247,0.7)';
  ctx.font = '9px Segoe UI';
  const labels = ['ICU-1','ICU-2','ISO-1','ISO-2','MED-1','MED-2','SUR-1','SUR-2','EM-1','NEU'];
  rooms.forEach(([x,y,rw,rh], i) => {
    ctx.fillText(labels[i]||'', x*gw+4, y*gh+12);
  });
}

// ─── CHART HELPERS ───────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e', font: { size: 10 } } },
    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e', font: { size: 10 } }, beginAtZero: true }
  }
};

function makeTrendChart(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }

  charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: TREND_DAYS,
      datasets: [
        { label:'HAI', data: TREND_DATA.HAI, borderColor:'#ef5350', backgroundColor:'rgba(239,83,80,0.1)', tension:0.4, pointRadius:4, pointHoverRadius:6, fill:false },
        { label:'UTI', data: TREND_DATA.UTI, borderColor:'#ffa726', backgroundColor:'rgba(255,167,38,0.1)', tension:0.4, pointRadius:4, pointHoverRadius:6, fill:false },
        { label:'BSI', data: TREND_DATA.BSI, borderColor:'#29b6f6', backgroundColor:'rgba(41,182,246,0.1)', tension:0.4, pointRadius:4, pointHoverRadius:6, fill:false },
        { label:'SSI', data: TREND_DATA.SSI, borderColor:'#ab47bc', backgroundColor:'rgba(171,71,188,0.1)', tension:0.4, pointRadius:4, pointHoverRadius:6, fill:false },
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 12, padding: 14 }
        },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}

function makeICUDonut(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }

  charts[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['High Risk','Medium Risk','Low Risk'],
      datasets: [{
        data: [ICU_RISK.high, ICU_RISK.medium, ICU_RISK.low],
        backgroundColor: ['#ef5350','#ffa726','#66bb6a'],
        borderColor: 'transparent',
        hoverOffset: 6,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/124*100)}%)`
          }
        }
      }
    }
  });
}

function makeBedGauge(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }

  charts[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Occupied','Available','Reserved'],
      datasets: [{
        data: [BED_DATA.occupied, BED_DATA.available, BED_DATA.reserved],
        backgroundColor: ['#66bb6a','#29b6f6','#ab47bc'],
        borderColor: 'transparent',
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '75%',
      rotation: -90, circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });
}

function makePathogenChart(canvasId) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: PATHOGENS.map(p => p.name),
      datasets: [{
        data: PATHOGENS.map(p => p.count),
        backgroundColor: PATHOGENS.map(p => p.color),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Cases: ${ctx.raw}` } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b949e', font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 11 }, fontStyle: 'italic' } }
      }
    }
  });
}

// ─── OVERVIEW PAGE ───────────────────────────────────────────
function renderOverview() {
  const content = $('pageContent');
  content.innerHTML = '';

  // Page header
  const ph = el('div', 'page-header fade-in');
  ph.innerHTML = `
    <div>
      <div class="page-title">Overview</div>
      <div class="page-subtitle">Real-time Monitoring • Predictive Analytics • Infection Intelligence</div>
    </div>
    <div class="live-badge"><span class="live-dot"></span> LIVE</div>`;
  content.appendChild(ph);

  // Stats row
  const sg = el('div', 'stats-grid fade-in');
  sg.innerHTML = buildStatCards();
  content.appendChild(sg);

  // Row 1: Heatmap | Trend | ICU Donut
  const row1 = el('div', 'dash-grid fade-in');
  row1.innerHTML = `
    <!-- Infection Heatmap -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Infection Heatmap</div>
          <div class="card-subtitle">Hospital Map</div>
        </div>
        <div class="heatmap-floor-select">
          <select onchange="drawHeatmap('heatmapCanvas')">
            <option>All Floors</option><option>Floor 1</option><option>Floor 2</option><option>Floor 3</option>
          </select>
        </div>
      </div>
      <div class="card-body" style="padding:10px">
        <div class="heatmap-container" id="heatmapWrap">
          <canvas id="heatmapCanvas" class="heatmap-canvas"></canvas>
          <div class="heatmap-legend">
            <div class="legend-label" style="color:#ff1744;font-size:9px">High</div>
            <div class="legend-gradient"></div>
            <div class="legend-label" style="color:#2196f3;font-size:9px">Low</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Infection Trend -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Infection Trend</div>
          <div class="card-subtitle">Last 7 Days</div>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-wrap" style="height:200px">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
    </div>

    <!-- ICU Risk Donut -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">ICU Patient Risk Distribution</div>
      </div>
      <div class="card-body">
        <div class="donut-wrap">
          <div class="donut-chart-area" style="width:160px;height:160px;position:relative">
            <canvas id="icuDonut"></canvas>
            <div class="donut-center">
              <div class="donut-center-val">124</div>
              <div class="donut-center-label">Total</div>
            </div>
          </div>
          <div class="donut-legend">
            <div class="donut-legend-item"><div class="legend-dot" style="background:#ef5350"></div><span class="legend-name">High Risk</span><span class="legend-val">45</span><span class="legend-pct">(36%)</span></div>
            <div class="donut-legend-item"><div class="legend-dot" style="background:#ffa726"></div><span class="legend-name">Medium Risk</span><span class="legend-val">50</span><span class="legend-pct">(40%)</span></div>
            <div class="donut-legend-item"><div class="legend-dot" style="background:#66bb6a"></div><span class="legend-name">Low Risk</span><span class="legend-val">29</span><span class="legend-pct">(24%)</span></div>
          </div>
        </div>
      </div>
    </div>`;
  content.appendChild(row1);

  // Row 2: AMR Alerts | Critical Alerts | Bed Occupancy
  const row2 = el('div', 'dash-grid fade-in');
  row2.innerHTML = `
    <!-- AMR Alerts -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">AMR Alerts</div>
        <span class="badge badge-high">CRITICAL</span>
      </div>
      <div class="card-body" style="padding:0 16px">
        ${buildAMRTable()}
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('amr')">View All Alerts →</a></div>
    </div>

    <!-- Critical Alerts -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Critical Alerts</div>
        <span class="badge badge-info">${CRITICAL_ALERTS.length} Active</span>
      </div>
      <div class="card-body">
        ${buildCriticalAlerts()}
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('alerts')">View All Alerts →</a></div>
    </div>

    <!-- Bed Occupancy -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Bed Occupancy</div>
      </div>
      <div class="card-body" style="padding:8px 16px">
        <div class="bed-gauge-wrap">
          <div style="width:200px;height:120px;position:relative">
            <canvas id="bedGauge"></canvas>
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);text-align:center">
              <div class="bed-gauge-val">78%</div>
              <div style="font-size:11px;color:var(--text-muted)">312 / 400 Beds Occupied</div>
            </div>
          </div>
          <div class="bed-legend">
            <div class="donut-legend-item"><div class="legend-dot" style="background:#66bb6a"></div><span class="legend-name" style="font-size:11px">Occupied</span><span class="legend-val" style="font-size:11px">312</span></div>
            <div class="donut-legend-item"><div class="legend-dot" style="background:#29b6f6"></div><span class="legend-name" style="font-size:11px">Available</span><span class="legend-val" style="font-size:11px">78</span></div>
            <div class="donut-legend-item"><div class="legend-dot" style="background:#ab47bc"></div><span class="legend-name" style="font-size:11px">Reserved</span><span class="legend-val" style="font-size:11px">10</span></div>
          </div>
        </div>
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('resources')">View Details →</a></div>
    </div>`;
  content.appendChild(row2);

  // Row 3: Top Pathogens | Genomic Sequencing | Resource Status
  const row3 = el('div', 'dash-grid-3 fade-in');
  row3.innerHTML = `
    <!-- Top Pathogens -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Top Pathogens</div>
      </div>
      <div class="card-body">
        <div style="height:180px"><canvas id="pathogenChart"></canvas></div>
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('infection')">View Full Report →</a></div>
    </div>

    <!-- Genomic Sequencing -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Recent Genomic Sequencing</div>
        <span class="badge badge-info">Live</span>
      </div>
      <div class="card-body" style="padding:0 16px">
        ${buildGenomicTable()}
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('genomic')">View All →</a></div>
    </div>

    <!-- Resource Status -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Resource Status</div>
      </div>
      <div class="card-body">
        <div class="resource-grid" id="resourceGrid">
          ${buildResourceItems()}
        </div>
      </div>
      <div class="card-footer"><a class="view-link" onclick="navigateTo('resources')">View All Resources →</a></div>
    </div>`;
  content.appendChild(row3);

  // Mount charts
  requestAnimationFrame(() => {
    drawHeatmap('heatmapCanvas');
    makeTrendChart('trendChart');
    makeICUDonut('icuDonut');
    makeBedGauge('bedGauge');
    makePathogenChart('pathogenChart');
    drawSparklines();
  });
}

// ─── STAT CARDS ───────────────────────────────────────────────
function buildStatCards() {
  const cards = [
    { label:'Total Patients',      key:'patients',        icon:'👥', color:'#42a5f5', bg:'rgba(66,165,245,0.15)' },
    { label:'Active Infections',   key:'infections',      icon:'🦠', color:'#ef5350', bg:'rgba(239,83,80,0.15)'  },
    { label:'High Risk Patients',  key:'highRisk',        icon:'⚠️', color:'#ffa726', bg:'rgba(255,167,38,0.15)' },
    { label:'ICU Occupancy',       key:'icuOccupancy',    icon:'🛏️', color:'#66bb6a', bg:'rgba(102,187,106,0.15)'},
    { label:'Antibiotic Usage (DDD)',key:'antibioticUsage',icon:'💊', color:'#ab47bc', bg:'rgba(171,71,188,0.15)' },
    { label:'Alerts',              key:'alerts',          icon:'🔔', color:'#ffc107', bg:'rgba(255,193,7,0.15)'  },
  ];

  const total = DATA.patients.value;
  const inf   = DATA.infections.value;
  const hr    = DATA.highRisk.value;
  const icu   = DATA.icuOccupancy.value;

  // Sparklines trail toward the current real value
  const sparklines = {
    patients:       [Math.round(total*0.88),Math.round(total*0.92),Math.round(total*0.94),Math.round(total*0.96),Math.round(total*0.97),Math.round(total*0.99),total],
    infections:     [Math.round(inf*0.81),Math.round(inf*0.87),Math.round(inf*0.91),Math.round(inf*0.93),Math.round(inf*0.92),Math.round(inf*0.97),inf],
    highRisk:       [Math.round(hr*0.82),Math.round(hr*0.87),Math.round(hr*0.91),Math.round(hr*0.95),Math.round(hr*0.97),Math.round(hr*0.99),hr],
    icuOccupancy:   [Math.round(icu*0.90),Math.round(icu*0.92),Math.round(icu*0.95),Math.round(icu*0.96),Math.round(icu*0.97),Math.round(icu*0.99),icu],
    antibioticUsage:[1600,1590,1580,1565,1570,1558,DATA.antibioticUsage.value],
    alerts:         [15,18,20,19,22,21,DATA.alerts.value],
  };

  const spColors = {
    patients:'#42a5f5', infections:'#ef5350', highRisk:'#ffa726',
    icuOccupancy:'#66bb6a', antibioticUsage:'#ab47bc', alerts:'#ffc107'
  };

  return cards.map(c => {
    const d = DATA[c.key];
    const isOcc = c.key === 'icuOccupancy';
    const val = isOcc ? d.value + '%' : fmtFull(d.value);
    const sub = isOcc ? `${d.beds.occ} / ${d.beds.total} Beds` : '';
    const changeDir = d.dir === 'up' ? 'up' : d.dir === 'down' ? 'down' : 'neutral';
    const changeHtml = d.change
      ? `<span class="stat-change ${changeDir}">${d.dir==='up'?'▲':'▼'} ${d.change}%</span>`
      : '<span class="stat-change neutral">–</span>';

    return `
      <div class="stat-card" id="statCard_${c.key}">
        <div class="stat-card-header">
          <div class="stat-card-label">${c.label}</div>
          <div class="stat-card-icon" style="background:${c.bg}">${c.icon}</div>
        </div>
        <div class="stat-card-value" id="statVal_${c.key}">${val}</div>
        ${sub ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${sub}</div>` : ''}
        <div class="stat-card-footer">
          ${changeHtml}
          <span class="stat-vs">${d.vs}</span>
        </div>
        <canvas class="stat-sparkline sparkline-canvas" id="spark_${c.key}" width="90" height="40"></canvas>
      </div>`;
  }).join('');
}

function drawSparklines() {
  const total = DATA.patients.value;
  const inf   = DATA.infections.value;
  const hr    = DATA.highRisk.value;
  const icu   = DATA.icuOccupancy.value;

  const sparklines = {
    patients:       [Math.round(total*0.88),Math.round(total*0.92),Math.round(total*0.94),Math.round(total*0.96),Math.round(total*0.97),Math.round(total*0.99),total],
    infections:     [Math.round(inf*0.81),Math.round(inf*0.87),Math.round(inf*0.91),Math.round(inf*0.93),Math.round(inf*0.92),Math.round(inf*0.97),inf],
    highRisk:       [Math.round(hr*0.82),Math.round(hr*0.87),Math.round(hr*0.91),Math.round(hr*0.95),Math.round(hr*0.97),Math.round(hr*0.99),hr],
    icuOccupancy:   [Math.round(icu*0.90),Math.round(icu*0.92),Math.round(icu*0.95),Math.round(icu*0.96),Math.round(icu*0.97),Math.round(icu*0.99),icu],
    antibioticUsage:[1600,1590,1580,1565,1570,1558,DATA.antibioticUsage.value],
    alerts:         [15,18,20,19,22,21,DATA.alerts.value],
  };
  const spColors = {
    patients:'#42a5f5', infections:'#ef5350', highRisk:'#ffa726',
    icuOccupancy:'#66bb6a', antibioticUsage:'#ab47bc', alerts:'#ffc107'
  };
  Object.entries(sparklines).forEach(([key, data]) => {
    const c = $(`spark_${key}`);
    if (c) drawSparkline(c, data, spColors[key]);
  });
}

// ─── AMR TABLE ────────────────────────────────────────────────
function buildAMRTable() {
  return `
    <table class="amr-table">
      <thead>
        <tr>
          <th>Pathogen</th>
          <th>Resistance</th>
          <th>Trend</th>
          <th>Alert Level</th>
        </tr>
      </thead>
      <tbody>
        ${AMR_ALERTS.map(a => `
          <tr>
            <td style="font-style:italic;color:var(--text-primary);font-size:11px">${a.pathogen}</td>
            <td>${a.resistance}</td>
            <td>
              <span class="trend-arrow trend-${a.trend==='up'?'up':a.trend==='down'?'down':'stable'}">
                ${a.trend==='up'?'▲':a.trend==='down'?'▼':'—'}
              </span>
            </td>
            <td><span class="badge badge-${a.level}">${a.level.toUpperCase()}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── CRITICAL ALERTS ─────────────────────────────────────────
function buildCriticalAlerts() {
  const iconMap = { high: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    medium: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffa726" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#29b6f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>` };

  return CRITICAL_ALERTS.map(a => `
    <div class="alert-item">
      <div class="alert-icon">${iconMap[a.level] || iconMap.info}</div>
      <div class="alert-text">
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>`).join('');
}

// ─── GENOMIC TABLE ────────────────────────────────────────────
function buildGenomicTable() {
  return `
    <table class="geno-table">
      <thead>
        <tr><th>Sample ID</th><th>Organism</th><th>Variant</th><th>Sequenced On</th></tr>
      </thead>
      <tbody>
        ${GENOMIC_DATA.map(g => `
          <tr>
            <td class="geno-sample">${g.id}</td>
            <td style="font-style:italic">${g.organism}</td>
            <td class="geno-variant">${g.variant}</td>
            <td>${g.date}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── RESOURCE ITEMS ───────────────────────────────────────────
function buildResourceItems() {
  const colorFor = pct => pct >= 80 ? '#ef5350' : pct >= 60 ? '#ffa726' : '#66bb6a';
  return RESOURCES.map(r => `
    <div class="resource-item">
      <div class="resource-header">
        <span class="resource-icon" style="background:${r.color}22">${r.icon}</span>
        <span class="resource-name">${r.name}</span>
      </div>
      <div class="resource-pct" style="color:${colorFor(r.pct)}">${r.pct}%</div>
      <div class="resource-count">${r.used} / ${r.total}</div>
      <div class="resource-bar-bg">
        <div class="resource-bar-fill" style="width:${r.pct}%;background:${colorFor(r.pct)}"></div>
      </div>
    </div>`).join('');
}

// ─── PATIENT SURVEILLANCE PAGE ────────────────────────────────
let ptPage = 1;
const PT_PER_PAGE = 25;
let ptFiltered = [];

function renderPatients() {
  const content = $('pageContent');

  const db        = window.PATIENTS_DB || [];
  const critical  = db.filter(p => p.risk === 'high').length;
  const avgLos    = db.length ? (db.reduce((a,p) => a + p.los, 0) / db.length).toFixed(1) : '0';
  const onVent    = db.filter(p => p.ventilator).length;

  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Patient Surveillance</div>
        <div class="page-subtitle" id="ptSubtitle">Monitor all ${db.length.toLocaleString()} admitted patients in real-time</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="exportPatientCSV()">⬇ Export CSV</button>
        <button class="btn btn-primary" onclick="openAddPatientModal()">＋ Add Patient</button>
      </div>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr)">
      ${buildMiniStatCard('Total Admitted', db.length.toLocaleString(),'▲ 12%','up','#42a5f5')}
      ${buildMiniStatCard('High Risk',String(critical),'▲ 8%','up','#ef5350')}
      ${buildMiniStatCard('On Ventilator',String(onVent),'—','neutral','#ffa726')}
      ${buildMiniStatCard('Avg. Stay (days)',avgLos,'▼ 3%','down','#ab47bc')}
    </div>
    <div class="card fade-in">
      <div class="card-header" style="flex-wrap:wrap;gap:10px">
        <div class="card-title">Patient List <span style="color:var(--text-muted);font-weight:400;font-size:12px" id="ptCountLabel">(1000 patients)</span></div>
        <div class="pt-search-row">
          <input type="text" id="ptSearch" placeholder="Search name, ID, diagnosis..." oninput="filterPatients()" />
          <select id="ptWardFilter" onchange="filterPatients()">
            <option value="">All Wards</option>
            <option>ICU-1</option><option>ICU-2</option><option>ICU-3</option>
            <option>MED-1</option><option>MED-2</option><option>MED-3</option><option>MED-4</option>
            <option>SUR-1</option><option>SUR-2</option>
            <option>ISO-1</option><option>ISO-2</option><option>ISO-3</option>
            <option>GEN-1</option><option>GEN-2</option><option>GEN-3</option>
            <option>NEU-1</option><option>CAR-1</option><option>ONC-1</option><option>PED-1</option><option>EMG-1</option>
          </select>
          <select id="ptRiskFilter" onchange="filterPatients()">
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <select id="ptStatusFilter" onchange="filterPatients()">
            <option value="">All Statuses</option>
            <option>Critical</option><option>Stable</option><option>Improving</option>
            <option>Under Observation</option><option>Discharged</option>
          </select>
        </div>
      </div>
      <div id="ptTableWrap" style="overflow-x:auto"></div>
      <div id="ptPagination"></div>
    </div>`;

  ptPage = 1;
  ptFiltered = [...db];
  renderPatientTable();
}

function filterPatients() {
  const q      = $('ptSearch')       ? $('ptSearch').value.toLowerCase()       : '';
  const ward   = $('ptWardFilter')   ? $('ptWardFilter').value                  : '';
  const risk   = $('ptRiskFilter')   ? $('ptRiskFilter').value                  : '';
  const status = $('ptStatusFilter') ? $('ptStatusFilter').value                : '';

  ptFiltered = (window.PATIENTS_DB || []).filter(p => {
    const matchQ  = !q      || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.diag.toLowerCase().includes(q);
    const matchW  = !ward   || p.ward === ward;
    const matchR  = !risk   || p.risk === risk;
    const matchS  = !status || p.status === status;
    return matchQ && matchW && matchR && matchS;
  });
  ptPage = 1;
  renderPatientTable();
}

function renderPatientTable() {
  const wrap = $('ptTableWrap');
  const pgEl = $('ptPagination');
  const lbl  = $('ptCountLabel');
  if (!wrap) return;

  const total = ptFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PT_PER_PAGE));
  if (ptPage > totalPages) ptPage = totalPages;
  const start = (ptPage - 1) * PT_PER_PAGE;
  const slice = ptFiltered.slice(start, start + PT_PER_PAGE);

  if (lbl) lbl.textContent = `(${total.toLocaleString()} patient${total !== 1 ? 's' : ''})`;

  const statusColor = s => ({ Critical:'#ef5350', Stable:'#ffa726', Improving:'#66bb6a', 'Under Observation':'#29b6f6', Discharged:'#8b949e' }[s] || '#8b949e');

  wrap.innerHTML = `
    <table class="amr-table" style="width:100%">
      <thead>
        <tr>
          <th>ID</th><th>Patient Name</th><th>Age</th><th>Gender</th>
          <th>Ward</th><th>Room</th><th>Diagnosis</th><th>Risk</th>
          <th>Status</th><th>Admitted</th><th>LOS</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${slice.map(r => `
          <tr>
            <td style="color:var(--accent-blue);font-weight:500">${r.id}</td>
            <td style="color:var(--text-primary);font-weight:500;white-space:nowrap">${r.name}</td>
            <td>${r.age}</td>
            <td>${r.gender}</td>
            <td>${r.ward}</td>
            <td style="color:var(--text-muted)">${r.roomNo}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.diag}">${r.diag}</td>
            <td><span class="badge badge-${r.risk}">${r.risk.toUpperCase()}</span></td>
            <td style="color:${statusColor(r.status)};font-weight:500">${r.status}</td>
            <td style="color:var(--text-muted);white-space:nowrap">${r.adm}</td>
            <td>${r.los}d</td>
            <td><button class="btn btn-primary" style="padding:4px 10px;font-size:11px;white-space:nowrap" onclick="openPatientModal('${r.id}')">View Patient</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  // Pagination
  const maxBtns = 7;
  let pages = [];
  if (totalPages <= maxBtns) {
    pages = Array.from({length: totalPages}, (_,i) => i+1);
  } else {
    pages = [1];
    if (ptPage > 3) pages.push('...');
    for (let p = Math.max(2, ptPage-1); p <= Math.min(totalPages-1, ptPage+1); p++) pages.push(p);
    if (ptPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  pgEl.innerHTML = `
    <div class="pagination-bar">
      <div class="pagination-info">Showing ${start+1}–${Math.min(start+PT_PER_PAGE, total)} of ${total.toLocaleString()} patients</div>
      <div class="pagination-btns">
        <button class="pg-btn" onclick="goPatientPage(${ptPage-1})" ${ptPage===1?'disabled':''}>‹ Prev</button>
        ${pages.map(p => p === '...'
          ? `<span class="pg-btn" style="cursor:default">…</span>`
          : `<button class="pg-btn ${p===ptPage?'active':''}" onclick="goPatientPage(${p})">${p}</button>`
        ).join('')}
        <button class="pg-btn" onclick="goPatientPage(${ptPage+1})" ${ptPage===totalPages?'disabled':''}>Next ›</button>
      </div>
    </div>`;
}

function goPatientPage(p) {
  const totalPages = Math.ceil(ptFiltered.length / PT_PER_PAGE);
  if (p < 1 || p > totalPages) return;
  ptPage = p;
  renderPatientTable();
  const w = $('ptTableWrap');
  if (w) w.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ─── PATIENT MODAL ────────────────────────────────────────────
function openPatientModal(id) {
  const p = (window.PATIENTS_DB || []).find(x => x.id === id);
  if (!p) return;

  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const riskColor   = { high:'#ef5350', medium:'#ffa726', low:'#66bb6a' }[p.risk]   || '#8b949e';
  const statusColor = { Critical:'#ef5350', Stable:'#ffa726', Improving:'#66bb6a', 'Under Observation':'#29b6f6', Discharged:'#8b949e' }[p.status] || '#8b949e';

  const vitBpColor  = parseFloat(p.vitals.bp) < 90 ? '#ef5350' : 'var(--text-primary)';
  const vitHrColor  = p.vitals.hr > 120 ? '#ef5350' : p.vitals.hr > 100 ? '#ffa726' : '#66bb6a';
  const vitSpo2Color= p.vitals.spo2 < 90 ? '#ef5350' : p.vitals.spo2 < 94 ? '#ffa726' : '#66bb6a';
  const vitTempColor= parseFloat(p.vitals.temp) > 38.5 ? '#ef5350' : parseFloat(p.vitals.temp) > 37.5 ? '#ffa726' : '#66bb6a';
  const sofaColor   = p.sofa >= 10 ? '#ef5350' : p.sofa >= 6 ? '#ffa726' : '#66bb6a';
  const news2Color  = p.news2 >= 7  ? '#ef5350' : p.news2 >= 3 ? '#ffa726' : '#66bb6a';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="modal-patient-name">${p.name}</div>
            <span class="badge badge-${p.risk}">${p.risk.toUpperCase()} RISK</span>
            <span style="font-size:12px;font-weight:600;color:${statusColor}">${p.status}</span>
          </div>
          <div class="modal-patient-id">${p.id} &nbsp;|&nbsp; ${p.ward} – Room ${p.roomNo} &nbsp;|&nbsp; Attending: ${p.doctor}</div>
        </div>
        <button class="modal-close-btn" onclick="closePatientModal()">✕</button>
      </div>
      <div class="modal-body">

        <!-- Demographics -->
        <div class="modal-section-title">Demographics</div>
        <div class="modal-grid-4">
          <div class="modal-field"><div class="modal-field-label">Age</div><div class="modal-field-value">${p.age} years</div></div>
          <div class="modal-field"><div class="modal-field-label">Gender</div><div class="modal-field-value">${p.gender}</div></div>
          <div class="modal-field"><div class="modal-field-label">Blood Group</div><div class="modal-field-value" style="color:#ef5350">${p.blood}</div></div>
          <div class="modal-field"><div class="modal-field-label">Admission Date</div><div class="modal-field-value">${p.adm}</div></div>
        </div>

        <!-- Clinical Info -->
        <div class="modal-section-title">Clinical Information</div>
        <div class="modal-grid-3">
          <div class="modal-field"><div class="modal-field-label">Primary Diagnosis</div><div class="modal-field-value">${p.diag}</div></div>
          <div class="modal-field"><div class="modal-field-label">Infection Site</div><div class="modal-field-value">${p.infectionSite}</div></div>
          <div class="modal-field"><div class="modal-field-label">Causative Organism</div><div class="modal-field-value" style="font-style:italic">${p.organism}</div></div>
        </div>
        <div class="modal-grid-3" style="margin-top:10px">
          <div class="modal-field"><div class="modal-field-label">Comorbidities</div><div class="modal-field-value" style="font-size:12px">${p.comorbid}</div></div>
          <div class="modal-field"><div class="modal-field-label">Current Antibiotic</div><div class="modal-field-value">${p.antibiotic}</div></div>
          <div class="modal-field"><div class="modal-field-label">Length of Stay</div><div class="modal-field-value">${p.los} days</div></div>
        </div>
        <div class="modal-grid-4" style="margin-top:10px">
          <div class="modal-field"><div class="modal-field-label">SOFA Score</div><div class="modal-field-value" style="color:${sofaColor}">${p.sofa}</div></div>
          <div class="modal-field"><div class="modal-field-label">NEWS2 Score</div><div class="modal-field-value" style="color:${news2Color}">${p.news2}</div></div>
          <div class="modal-field"><div class="modal-field-label">Ventilator</div><div class="modal-field-value" style="color:${p.ventilator?'#ef5350':'#66bb6a'}">${p.ventilator ? 'Yes – Active' : 'No'}</div></div>
          <div class="modal-field"><div class="modal-field-label">Isolation</div><div class="modal-field-value" style="color:${p.isolation?'#ffa726':'var(--text-primary)'}">${p.isolation ? 'Yes' : 'No'}</div></div>
        </div>

        <!-- Vitals -->
        <div class="modal-section-title">Current Vitals</div>
        <div class="modal-grid-3">
          <div class="vital-card">
            <div class="vital-label">Blood Pressure</div>
            <div class="vital-value" style="color:${vitBpColor}">${p.vitals.bp}</div>
            <div class="vital-unit">mmHg</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Heart Rate</div>
            <div class="vital-value" style="color:${vitHrColor}">${p.vitals.hr}</div>
            <div class="vital-unit">bpm</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">SpO₂</div>
            <div class="vital-value" style="color:${vitSpo2Color}">${p.vitals.spo2}%</div>
            <div class="vital-unit">Oxygen Saturation</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Respiratory Rate</div>
            <div class="vital-value" style="color:${p.vitals.rr > 25 ? '#ef5350' : 'var(--text-primary)'}">${p.vitals.rr}</div>
            <div class="vital-unit">breaths/min</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">Temperature</div>
            <div class="vital-value" style="color:${vitTempColor}">${p.vitals.temp}°C</div>
            <div class="vital-unit">Body Temp</div>
          </div>
          <div class="vital-card">
            <div class="vital-label">GCS Score</div>
            <div class="vital-value" style="color:${p.vitals.gcs < 9 ? '#ef5350' : p.vitals.gcs < 13 ? '#ffa726' : '#66bb6a'}">${p.vitals.gcs}</div>
            <div class="vital-unit">Glasgow Coma Scale</div>
          </div>
        </div>

        <!-- Risk Summary -->
        <div class="modal-section-title">Risk Summary</div>
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:42px;height:42px;border-radius:50%;background:${riskColor}22;border:2px solid ${riskColor};display:flex;align-items:center;justify-content:center;font-size:18px">
                ${p.risk==='high'?'🔴':p.risk==='medium'?'🟠':'🟢'}
              </div>
              <div>
                <div style="font-size:14px;font-weight:700;color:${riskColor}">${p.risk.charAt(0).toUpperCase()+p.risk.slice(1)} Risk Patient</div>
                <div style="font-size:11px;color:var(--text-muted)">SOFA: ${p.sofa} &nbsp;|&nbsp; NEWS2: ${p.news2} &nbsp;|&nbsp; Status: ${p.status}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline" style="font-size:12px" onclick="closePatientModal()">Close</button>
              <button class="btn btn-primary" style="font-size:12px">Generate Report</button>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closePatientModal(); });
  document.body.appendChild(overlay);
  document.addEventListener('keydown', _escClose);
}

function _escClose(e) {
  if (e.key === 'Escape') closePatientModal();
}

function closePatientModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', _escClose);
}

// ─── DOCTOR PROFILE MODAL ────────────────────────────────────
const DOCTOR_META = {
  'Dr. Sarah Kim':      { specialty:'Infection Control',  dept:'Microbiology', phone:'+1 (555) 101-2001', email:'s.kim@medshield.org',       status:'Online',  img:'SK' },
  'Dr. Raj Patel':      { specialty:'Intensivist',        dept:'ICU',          phone:'+1 (555) 101-2002', email:'r.patel@medshield.org',     status:'Online',  img:'RP' },
  'Dr. Emily Chen':     { specialty:'Pulmonologist',      dept:'Respiratory',  phone:'+1 (555) 101-2003', email:'e.chen@medshield.org',      status:'Away',    img:'EC' },
  'Dr. Carlos Rivera':  { specialty:'General Medicine',   dept:'MED',          phone:'+1 (555) 101-2004', email:'c.rivera@medshield.org',    status:'Online',  img:'CR' },
  'Dr. James Okafor':   { specialty:'Surgeon',            dept:'Surgery',      phone:'+1 (555) 101-2005', email:'j.okafor@medshield.org',    status:'Offline', img:'JO' },
  'Dr. Priya Nair':     { specialty:'Microbiologist',     dept:'Microbiology', phone:'+1 (555) 101-2006', email:'p.nair@medshield.org',      status:'Online',  img:'PN' },
  'Dr. Thomas Walsh':   { specialty:'Cardiologist',       dept:'Cardiology',   phone:'+1 (555) 101-2007', email:'t.walsh@medshield.org',     status:'Away',    img:'TW' },
  'Dr. Fatima Al-Hassan':{ specialty:'Neurologist',       dept:'Neurology',    phone:'+1 (555) 101-2008', email:'f.alhassan@medshield.org',  status:'Online',  img:'FA' },
  'Dr. Michael Torres': { specialty:'Oncologist',         dept:'Oncology',     phone:'+1 (555) 101-2009', email:'m.torres@medshield.org',    status:'Online',  img:'MT' },
  'Dr. Lisa Wang':      { specialty:'Paediatrician',      dept:'Paediatrics',  phone:'+1 (555) 101-2010', email:'l.wang@medshield.org',      status:'Offline', img:'LW' },
  'Dr. Ahmed Hassan':   { specialty:'Nephrologist',       dept:'Nephrology',   phone:'+1 (555) 101-2011', email:'a.hassan@medshield.org',    status:'Online',  img:'AH' },
  'Dr. Julia Roberts':  { specialty:'Gastroenterologist', dept:'Gastro',       phone:'+1 (555) 101-2012', email:'j.roberts@medshield.org',   status:'Away',    img:'JR' },
  'Dr. Admin':          { specialty:'Administrator',      dept:'All Departments', phone:'+1 (555) 100-0001', email:'admin@medshield.org',    status:'Online',  img:'DA' },
};

function openDoctorModal(doctorName) {
  const existing = document.querySelector('.dr-modal-overlay');
  if (existing) existing.remove();

  const db       = window.PATIENTS_DB || [];
  const patients = db.filter(p => p.doctor === doctorName);
  const meta     = DOCTOR_META[doctorName] || { specialty:'Physician', dept:'General', phone:'—', email:'—', status:'Online', img: doctorName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() };

  const statusColor = { Online:'#4caf50', Away:'#ffa726', Offline:'#8b949e' }[meta.status] || '#8b949e';

  const high   = patients.filter(p => p.risk === 'high').length;
  const medium = patients.filter(p => p.risk === 'medium').length;
  const low    = patients.filter(p => p.risk === 'low').length;
  const active = patients.filter(p => p.status !== 'Discharged').length;

  const riskColor = r => ({ high:'#ef5350', medium:'#ffa726', low:'#66bb6a' }[r] || '#8b949e');
  const statusCol = s => ({ Critical:'#ef5350', Stable:'#ffa726', Improving:'#66bb6a', 'Under Observation':'#29b6f6', Discharged:'#8b949e' }[s] || '#8b949e');

  const patientRows = patients.length
    ? patients.map(p => `
        <tr class="dr-pt-row" onclick="closeDoctorModal();openPatientModal('${p.id}')" title="View full patient record">
          <td style="color:var(--accent-blue);font-weight:600">${p.id}</td>
          <td style="color:var(--text-primary);font-weight:500;white-space:nowrap">${p.name}</td>
          <td>${p.age}</td>
          <td>${p.ward}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.diag}">${p.diag}</td>
          <td><span class="badge badge-${p.risk}">${p.risk.toUpperCase()}</span></td>
          <td style="color:${statusCol(p.status)};font-weight:500">${p.status}</td>
          <td style="color:var(--text-muted)">${p.adm}</td>
        </tr>`).join('')
    : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px">No patients assigned to this doctor</td></tr>`;

  const overlay = document.createElement('div');
  overlay.className = 'dr-modal-overlay';
  overlay.innerHTML = `
    <div class="dr-modal-box">

      <!-- Header -->
      <div class="dr-modal-header">
        <div class="dr-modal-avatar">${meta.img}</div>
        <div class="dr-modal-info">
          <div class="dr-modal-name">${doctorName}</div>
          <div class="dr-modal-sub">${meta.specialty} &nbsp;·&nbsp; ${meta.dept}</div>
          <div class="dr-modal-status">
            <span class="dr-status-dot" style="background:${statusColor}"></span>
            <span style="font-size:11px;color:${statusColor}">${meta.status}</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="closeDoctorModal()">✕</button>
      </div>

      <!-- Contact & Summary row -->
      <div class="dr-meta-row">
        <div class="dr-meta-item">
          <div class="dr-meta-label">📞 Phone</div>
          <div class="dr-meta-value">${meta.phone}</div>
        </div>
        <div class="dr-meta-item">
          <div class="dr-meta-label">✉️ Email</div>
          <div class="dr-meta-value">${meta.email}</div>
        </div>
        <div class="dr-meta-item">
          <div class="dr-meta-label">🏥 Department</div>
          <div class="dr-meta-value">${meta.dept}</div>
        </div>
        <div class="dr-meta-item">
          <div class="dr-meta-label">🩺 Specialty</div>
          <div class="dr-meta-value">${meta.specialty}</div>
        </div>
      </div>

      <!-- Patient count chips -->
      <div class="dr-count-row">
        <div class="dr-count-chip" style="border-color:var(--accent-blue)">
          <div class="dr-chip-val" style="color:var(--accent-blue)">${patients.length}</div>
          <div class="dr-chip-label">Total Patients</div>
        </div>
        <div class="dr-count-chip" style="border-color:#66bb6a">
          <div class="dr-chip-val" style="color:#66bb6a">${active}</div>
          <div class="dr-chip-label">Active</div>
        </div>
        <div class="dr-count-chip" style="border-color:#ef5350">
          <div class="dr-chip-val" style="color:#ef5350">${high}</div>
          <div class="dr-chip-label">High Risk</div>
        </div>
        <div class="dr-count-chip" style="border-color:#ffa726">
          <div class="dr-chip-val" style="color:#ffa726">${medium}</div>
          <div class="dr-chip-label">Medium Risk</div>
        </div>
        <div class="dr-count-chip" style="border-color:#66bb6a">
          <div class="dr-chip-val" style="color:#66bb6a">${low}</div>
          <div class="dr-chip-label">Low Risk</div>
        </div>
      </div>

      <!-- Patient list table -->
      <div class="dr-modal-section-title">
        Assigned Patients
        <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:6px">(click any row to view full record)</span>
      </div>
      <div class="dr-pt-table-wrap">
        <table class="dr-pt-table">
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Age</th><th>Ward</th>
              <th>Diagnosis</th><th>Risk</th><th>Status</th><th>Admitted</th>
            </tr>
          </thead>
          <tbody>${patientRows}</tbody>
        </table>
      </div>

    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeDoctorModal(); });
  document.addEventListener('keydown', _escDrClose);
  document.body.appendChild(overlay);
}

function _escDrClose(e) {
  if (e.key === 'Escape') closeDoctorModal();
}

function closeDoctorModal() {
  const overlay = document.querySelector('.dr-modal-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', _escDrClose);
}

// ─── CSV EXPORT ───────────────────────────────────────────────
function exportPatientCSV() {
  const rows = ptFiltered.length ? ptFiltered : (window.PATIENTS_DB || []);
  const headers = ['ID','Name','Age','Gender','Ward','Room','Diagnosis','Risk','Status','Admitted','LOS(days)','Blood Group','Antibiotic','Comorbidities','Organism','Infection Site','SOFA','NEWS2','Ventilator','Isolation','Doctor','BP','HR','SpO2','RR','Temp','GCS'];
  const csvRows = [headers.join(',')];
  rows.forEach(p => {
    csvRows.push([
      p.id, `"${p.name}"`, p.age, p.gender, p.ward, p.roomNo,
      `"${p.diag}"`, p.risk, p.status, p.adm, p.los, p.blood,
      p.antibiotic, `"${p.comorbid}"`, `"${p.organism}"`, p.infectionSite,
      p.sofa, p.news2, p.ventilator?'Yes':'No', p.isolation?'Yes':'No',
      `"${p.doctor}"`, p.vitals.bp, p.vitals.hr, p.vitals.spo2,
      p.vitals.rr, p.vitals.temp, p.vitals.gcs
    ].join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'medshield_patients.csv';
  a.click();
}

// ─── ADD PATIENT MODAL ────────────────────────────────────────
function openAddPatientModal() {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'addPatientOverlay';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:780px">
      <div class="modal-header">
        <div>
          <div class="modal-patient-name">Add New Patient</div>
          <div class="modal-patient-id">Fill in all required fields to register a new patient</div>
        </div>
        <button class="modal-close-btn" onclick="closeAddPatientModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="addPatientForm" onsubmit="submitAddPatient(event)" autocomplete="off">

          <!-- ── Personal Information ── -->
          <div class="modal-section-title">Personal Information</div>
          <div class="modal-grid-3">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">First Name <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_firstName" type="text" placeholder="e.g. James" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Last Name <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_lastName" type="text" placeholder="e.g. Wilson" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Age <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_age" type="number" min="1" max="120" placeholder="e.g. 45" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Gender <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_gender" required>
                <option value="">Select...</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Blood Group <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_blood" required>
                <option value="">Select...</option>
                <option>A+</option><option>A-</option>
                <option>B+</option><option>B-</option>
                <option>AB+</option><option>AB-</option>
                <option>O+</option><option>O-</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Admission Date <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_adm" type="date" required />
            </div>
          </div>

          <!-- ── Location ── -->
          <div class="modal-section-title">Location</div>
          <div class="modal-grid-3">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Ward <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_ward" required>
                <option value="">Select ward...</option>
                <option>ICU-1</option><option>ICU-2</option><option>ICU-3</option>
                <option>MED-1</option><option>MED-2</option><option>MED-3</option><option>MED-4</option>
                <option>SUR-1</option><option>SUR-2</option>
                <option>ISO-1</option><option>ISO-2</option><option>ISO-3</option>
                <option>GEN-1</option><option>GEN-2</option><option>GEN-3</option>
                <option>NEU-1</option><option>CAR-1</option><option>ONC-1</option>
                <option>PED-1</option><option>EMG-1</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Room No. <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_room" type="text" placeholder="e.g. A214" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Attending Doctor <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_doctor" required>
                <option value="">Select doctor...</option>
                <option>Dr. Sarah Kim</option><option>Dr. Raj Patel</option>
                <option>Dr. Emily Chen</option><option>Dr. Carlos Rivera</option>
                <option>Dr. James Okafor</option><option>Dr. Priya Nair</option>
                <option>Dr. Thomas Walsh</option><option>Dr. Fatima Al-Hassan</option>
                <option>Dr. Michael Torres</option><option>Dr. Lisa Wang</option>
                <option>Dr. Ahmed Hassan</option><option>Dr. Julia Roberts</option>
              </select>
            </div>
          </div>

          <!-- ── Clinical Information ── -->
          <div class="modal-section-title">Clinical Information</div>
          <div class="modal-grid-3">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Primary Diagnosis <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_diag" required>
                <option value="">Select diagnosis...</option>
                <option>Sepsis</option><option>UTI</option><option>Pneumonia</option>
                <option>Post-op Infection</option><option>MRSA</option><option>SSI</option>
                <option>ARDS</option><option>HAI – UTI</option>
                <option>Carbapenem-Resistant Klebsiella</option>
                <option>Ventilator-Associated Pneumonia</option><option>Bacteremia</option>
                <option>Clostridium difficile Infection</option>
                <option>Central Line-Associated BSI</option>
                <option>Hospital-Acquired Pneumonia</option>
                <option>Urinary Catheter Infection</option>
                <option>ESBL E. coli</option>
                <option>Methicillin-Resistant S. aureus</option>
                <option>Vancomycin-Resistant Enterococcus</option>
                <option>COVID-19</option><option>Influenza A</option>
                <option>Tuberculosis</option><option>Endocarditis</option>
                <option>Meningitis</option><option>Peritonitis</option>
                <option>Cellulitis</option><option>Osteomyelitis</option>
                <option>Multidrug-Resistant Acinetobacter</option>
                <option>Pseudomonas Aeruginosa Infection</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Risk Level <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_risk" required>
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Patient Status <span class="apf-req">*</span></label>
              <select class="apf-input" id="apf_status" required>
                <option value="">Select...</option>
                <option>Critical</option><option>Stable</option>
                <option>Improving</option><option>Under Observation</option>
                <option>Discharged</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Infection Site</label>
              <select class="apf-input" id="apf_infectionSite">
                <option value="">Select...</option>
                <option>Blood</option><option>Urine</option>
                <option>Respiratory</option><option>Wound</option>
                <option>CSF</option><option>Unknown</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Causative Organism</label>
              <select class="apf-input" id="apf_organism">
                <option value="">Select...</option>
                <option>E. coli</option><option>Klebsiella pneumoniae</option>
                <option>Staphylococcus aureus</option><option>Pseudomonas aeruginosa</option>
                <option>Acinetobacter baumannii</option><option>Enterococcus faecium</option>
                <option>Streptococcus pneumoniae</option><option>Candida albicans</option>
                <option>Clostridium difficile</option><option>SARS-CoV-2</option>
                <option>None identified</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Current Antibiotic</label>
              <select class="apf-input" id="apf_antibiotic">
                <option value="">Select...</option>
                <option>Meropenem</option><option>Vancomycin</option>
                <option>Piperacillin-Tazobactam</option><option>Ceftriaxone</option>
                <option>Ciprofloxacin</option><option>Metronidazole</option>
                <option>Amoxicillin-Clavulanate</option><option>Doxycycline</option>
                <option>Azithromycin</option><option>Linezolid</option>
                <option>Colistin</option><option>Tigecycline</option>
                <option>Imipenem</option><option>Cefepime</option>
                <option>None</option>
              </select>
            </div>
          </div>

          <div class="modal-grid-2" style="margin-top:10px">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Comorbidities</label>
              <input class="apf-input" id="apf_comorbid" type="text" placeholder="e.g. Diabetes, Hypertension" />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Length of Stay (days) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_los" type="number" min="1" max="365" placeholder="e.g. 5" required />
            </div>
          </div>

          <!-- ── Vitals ── -->
          <div class="modal-section-title">Current Vitals</div>
          <div class="modal-grid-3">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Blood Pressure (mmHg) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_bp" type="text" placeholder="e.g. 120/80" required pattern="\\d{2,3}\\/\\d{2,3}" title="Format: 120/80" />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Heart Rate (bpm) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_hr" type="number" min="20" max="250" placeholder="e.g. 80" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">SpO₂ (%) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_spo2" type="number" min="50" max="100" placeholder="e.g. 97" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Respiratory Rate (/min) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_rr" type="number" min="5" max="60" placeholder="e.g. 16" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Temperature (°C) <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_temp" type="number" min="32" max="43" step="0.1" placeholder="e.g. 37.2" required />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">GCS Score <span class="apf-req">*</span></label>
              <input class="apf-input" id="apf_gcs" type="number" min="3" max="15" placeholder="e.g. 15" required />
            </div>
          </div>

          <!-- ── Scores & Flags ── -->
          <div class="modal-section-title">Severity Scores & Flags</div>
          <div class="modal-grid-4">
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">SOFA Score</label>
              <input class="apf-input" id="apf_sofa" type="number" min="0" max="24" placeholder="0–24" />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">NEWS2 Score</label>
              <input class="apf-input" id="apf_news2" type="number" min="0" max="20" placeholder="0–20" />
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">On Ventilator?</label>
              <select class="apf-input" id="apf_ventilator">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div class="modal-field" style="background:none;border:none;padding:0">
              <label class="apf-label">Isolation Required?</label>
              <select class="apf-input" id="apf_isolation">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          <!-- ── Error message ── -->
          <div id="apf_error" style="display:none;color:#ef5350;font-size:12px;margin-top:12px;padding:10px 12px;background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.3);border-radius:8px"></div>

          <!-- ── Footer buttons ── -->
          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
            <button type="button" class="btn btn-outline" onclick="closeAddPatientModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="apf_submitBtn">
              <span id="apf_submitLabel">Add Patient</span>
            </button>
          </div>

        </form>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAddPatientModal(); });
  document.addEventListener('keydown', _escAddClose);
  document.body.appendChild(overlay);

  // Set today's date as default for admission
  const today = new Date().toISOString().split('T')[0];
  const admEl = document.getElementById('apf_adm');
  if (admEl) admEl.value = today;
}

function _escAddClose(e) {
  if (e.key === 'Escape') closeAddPatientModal();
}

function closeAddPatientModal() {
  const overlay = document.getElementById('addPatientOverlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', _escAddClose);
}

function submitAddPatient(e) {
  e.preventDefault();

  const get    = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const getBool= id => { const el = document.getElementById(id); return el ? el.value === 'true' : false; };
  const getNum = id => { const el = document.getElementById(id); return el && el.value ? parseInt(el.value, 10) : 0; };
  const getFlt = id => { const el = document.getElementById(id); return el && el.value ? parseFloat(el.value) : 0; };

  const errEl = document.getElementById('apf_error');

  // Required field validation
  const required = [
    ['apf_firstName','First Name'],['apf_lastName','Last Name'],
    ['apf_age','Age'],['apf_gender','Gender'],['apf_blood','Blood Group'],
    ['apf_adm','Admission Date'],['apf_ward','Ward'],['apf_room','Room No.'],
    ['apf_doctor','Attending Doctor'],['apf_diag','Primary Diagnosis'],
    ['apf_risk','Risk Level'],['apf_status','Patient Status'],
    ['apf_los','Length of Stay'],
    ['apf_bp','Blood Pressure'],['apf_hr','Heart Rate'],
    ['apf_spo2','SpO₂'],['apf_rr','Respiratory Rate'],
    ['apf_temp','Temperature'],['apf_gcs','GCS Score'],
  ];
  for (const [id, label] of required) {
    if (!get(id)) {
      errEl.textContent = `⚠ Please fill in the required field: ${label}`;
      errEl.style.display = 'block';
      document.getElementById(id).focus();
      return;
    }
  }
  errEl.style.display = 'none';

  // Build new patient object
  const db = window.PATIENTS_DB || [];
  const nextNum = 4500 + db.length;
  const newId   = `P-${nextNum}`;

  const admRaw  = get('apf_adm');  // "2024-05-16"
  const admDate = new Date(admRaw);
  const admFormatted = admDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const patient = {
    id:           newId,
    name:         `${get('apf_firstName')} ${get('apf_lastName')}`,
    firstName:    get('apf_firstName'),
    lastName:     get('apf_lastName'),
    age:          getNum('apf_age'),
    gender:       get('apf_gender'),
    ward:         get('apf_ward'),
    roomNo:       get('apf_room'),
    diag:         get('apf_diag'),
    risk:         get('apf_risk'),
    status:       get('apf_status'),
    adm:          admFormatted,
    blood:        get('apf_blood'),
    antibiotic:   get('apf_antibiotic') || 'None',
    comorbid:     get('apf_comorbid')   || 'None',
    organism:     get('apf_organism')   || 'None identified',
    infectionSite:get('apf_infectionSite') || 'Unknown',
    doctor:       get('apf_doctor'),
    los:          getNum('apf_los'),
    sofa:         getNum('apf_sofa'),
    news2:        getNum('apf_news2'),
    ventilator:   getBool('apf_ventilator'),
    isolation:    getBool('apf_isolation'),
    vitals: {
      bp:   get('apf_bp'),
      hr:   getNum('apf_hr'),
      rr:   getNum('apf_rr'),
      spo2: getNum('apf_spo2'),
      temp: getFlt('apf_temp').toFixed(1),
      gcs:  getNum('apf_gcs'),
    },
  };

  // Show loading state
  const btn = document.getElementById('apf_submitBtn');
  const lbl = document.getElementById('apf_submitLabel');
  if (btn) btn.disabled = true;
  if (lbl) lbl.textContent = 'Adding...';

  // Push into dataset
  window.PATIENTS_DB.push(patient);

  // Recompute all stats from the updated DB
  computeStatsFromDB();

  // Brief delay for UX feedback, then close & refresh
  setTimeout(() => {
    closeAddPatientModal();
    // Refresh the Patient Surveillance page
    renderPatients();
    // Jump to last page so new patient is visible
    const total      = window.PATIENTS_DB.length;
    const totalPages = Math.ceil(total / PT_PER_PAGE);
    goPatientPage(totalPages);
    // Flash success toast
    showToast(`✓ Patient ${patient.name} (${newId}) added successfully`, 'success');
    // If overview is pinned in another tab context, keep DATA fresh — already done above
  }, 300);
}

// ─── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(msg, type) {
  const existing = document.querySelector('.ms-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'ms-toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${type === 'success' ? '#1b5e20' : '#b71c1c'};
    border:1px solid ${type === 'success' ? '#2e7d32' : '#c62828'};
    color:#fff; padding:12px 18px; border-radius:10px;
    font-size:13px; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,0.4);
    display:flex; align-items:center; gap:8px;
    animation:slideUpToast 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; setTimeout(() => toast.remove(), 400); }, 3500);
}

function buildMiniStatCard(label, value, change, dir, color) {
  return `
    <div class="stat-card">
      <div class="stat-card-label">${label}</div>
      <div class="stat-card-value" style="font-size:22px;margin-top:4px">${value}</div>
      <div class="stat-card-footer" style="margin-top:6px">
        <span class="stat-change ${dir}">${change}</span>
        <span style="font-size:10px;color:${color}">●</span>
      </div>
    </div>`;
}


// ─── INFECTION TRACKING PAGE ──────────────────────────────────
function renderInfection() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Infection Tracking</div>
        <div class="page-subtitle">Hospital-Acquired Infections • Real-time Surveillance</div>
      </div>
      <div class="live-badge"><span class="live-dot"></span> LIVE</div>
    </div>
    <div class="dash-grid-2 fade-in">
      <div class="card">
        <div class="card-header"><div class="card-title">Infection Trend (Last 7 Days)</div></div>
        <div class="card-body"><div style="height:220px"><canvas id="trendChartInf"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Top Pathogens</div></div>
        <div class="card-body"><div style="height:220px"><canvas id="pathogenChartInf"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">AMR Alerts</div></div>
        <div class="card-body" style="padding:0 16px">${buildAMRTable()}</div>
        <div class="card-footer"><a class="view-link" onclick="navigateTo('amr')">View All →</a></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Infection by Ward</div></div>
        <div class="card-body">
          ${[
            { ward:'ICU-1',    count:28, pct:85 },
            { ward:'ICU-2',    count:21, pct:70 },
            { ward:'ISO-1',    count:18, pct:60 },
            { ward:'MED-1',    count:14, pct:45 },
            { ward:'SUR-2',    count:5,  pct:18 },
          ].map(w => `
            <div class="pathogen-row" style="margin-bottom:10px">
              <span class="pathogen-name">${w.ward}</span>
              <div class="pathogen-bar-bg"><div class="pathogen-bar-fill" style="width:${w.pct}%;background:#42a5f5"></div></div>
              <span class="pathogen-count">${w.count}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  requestAnimationFrame(() => {
    makeTrendChart('trendChartInf');
    makePathogenChart('pathogenChartInf');
  });
}

// ─── AMR PAGE ─────────────────────────────────────────────────
function renderAMR() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">AMR Intelligence</div>
        <div class="page-subtitle">Antimicrobial Resistance Monitoring & Analytics</div>
      </div>
      <div class="live-badge"><span class="live-dot"></span> LIVE</div>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr)">
      ${buildMiniStatCard('AMR Isolates','247','▲ 11%','up','#ef5350')}
      ${buildMiniStatCard('New Resistances','12','▲ 3','up','#ffa726')}
      ${buildMiniStatCard('Carbapenem Resistant','38','▲ 6%','up','#ef5350')}
      ${buildMiniStatCard('MRSA Cases','29','▼ 2%','down','#66bb6a')}
    </div>
    <div class="dash-grid-2 fade-in">
      <div class="card">
        <div class="card-header"><div class="card-title">AMR Alert Table</div><span class="badge badge-high">5 CRITICAL</span></div>
        <div class="card-body" style="padding:0 16px">${buildAMRTable()}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Resistance by Antibiotic Class</div></div>
        <div class="card-body">
          ${[
            { name:'Carbapenems',    pct:78, color:'#ef5350' },
            { name:'ESBL',           pct:65, color:'#ffa726' },
            { name:'Fluoroquinolone',pct:55, color:'#ab47bc' },
            { name:'MRSA',           pct:45, color:'#29b6f6' },
            { name:'Aminoglycosides',pct:30, color:'#66bb6a' },
          ].map(r => `
            <div class="pathogen-row" style="margin-bottom:10px">
              <span class="pathogen-name">${r.name}</span>
              <div class="pathogen-bar-bg"><div class="pathogen-bar-fill" style="width:${r.pct}%;background:${r.color}"></div></div>
              <span class="pathogen-count">${r.pct}%</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─── ICU PAGE ─────────────────────────────────────────────────
function renderICU() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">ICU Monitoring</div>
        <div class="page-subtitle">Intensive Care Unit • Real-time Patient Vitals & Risk</div>
      </div>
      <div class="live-badge"><span class="live-dot"></span> LIVE</div>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr)">
      ${buildMiniStatCard('ICU Beds Occupied','36/50','▲ 5%','up','#42a5f5')}
      ${buildMiniStatCard('High Risk Patients','45','▲ 3','up','#ef5350')}
      ${buildMiniStatCard('On Ventilators','12','—','neutral','#ffa726')}
      ${buildMiniStatCard('New Admissions Today','8','▲ 2','up','#ab47bc')}
    </div>
    <div class="dash-grid fade-in">
      <div class="card">
        <div class="card-header"><div class="card-title">ICU Patient Risk Distribution</div></div>
        <div class="card-body">
          <div class="donut-wrap">
            <div class="donut-chart-area" style="width:160px;height:160px;position:relative">
              <canvas id="icuDonutFull"></canvas>
              <div class="donut-center"><div class="donut-center-val">124</div><div class="donut-center-label">Total</div></div>
            </div>
            <div class="donut-legend">
              <div class="donut-legend-item"><div class="legend-dot" style="background:#ef5350"></div><span class="legend-name">High Risk</span><span class="legend-val">45</span><span class="legend-pct">(36%)</span></div>
              <div class="donut-legend-item"><div class="legend-dot" style="background:#ffa726"></div><span class="legend-name">Medium Risk</span><span class="legend-val">50</span><span class="legend-pct">(40%)</span></div>
              <div class="donut-legend-item"><div class="legend-dot" style="background:#66bb6a"></div><span class="legend-name">Low Risk</span><span class="legend-val">29</span><span class="legend-pct">(24%)</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Bed Occupancy</div></div>
        <div class="card-body" style="padding:8px 16px">
          <div class="bed-gauge-wrap">
            <div style="width:200px;height:120px;position:relative">
              <canvas id="bedGaugeFull"></canvas>
              <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);text-align:center">
                <div class="bed-gauge-val">78%</div>
                <div style="font-size:11px;color:var(--text-muted)">312 / 400 Beds</div>
              </div>
            </div>
            <div class="bed-legend">
              <div class="donut-legend-item"><div class="legend-dot" style="background:#66bb6a"></div><span class="legend-name">Occupied</span><span class="legend-val">312</span></div>
              <div class="donut-legend-item"><div class="legend-dot" style="background:#29b6f6"></div><span class="legend-name">Available</span><span class="legend-val">78</span></div>
              <div class="donut-legend-item"><div class="legend-dot" style="background:#ab47bc"></div><span class="legend-name">Reserved</span><span class="legend-val">10</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Critical Alerts</div></div>
        <div class="card-body">${buildCriticalAlerts()}</div>
      </div>
    </div>
    <div class="card fade-in" style="margin-top:12px">
      <div class="card-header"><div class="card-title">ICU Patient List</div></div>
      <div class="card-body" style="padding:0">${buildICUTable()}</div>
    </div>`;
  requestAnimationFrame(() => {
    makeICUDonut('icuDonutFull');
    makeBedGauge('bedGaugeFull');
  });
}

function buildICUTable() {
  const rows = [
    { id:'ICU-001', name:'James Wilson',  age:67, bed:'ICU-1-A', risk:'high',   bp:'85/55',  hr:110, spo2:88, temp:38.9, vent:true  },
    { id:'ICU-002', name:'Robert Chen',   age:72, bed:'ICU-1-B', risk:'high',   bp:'90/60',  hr:102, spo2:91, temp:39.1, vent:true  },
    { id:'ICU-003', name:'David Martinez',age:81, bed:'ICU-2-A', risk:'high',   bp:'78/50',  hr:118, spo2:86, temp:38.5, vent:true  },
    { id:'ICU-004', name:'Helen Thomas',  age:63, bed:'ICU-2-B', risk:'medium', bp:'110/70', hr:88,  spo2:95, temp:37.8, vent:false },
    { id:'ICU-005', name:'Frank Lee',     age:55, bed:'ICU-3-A', risk:'medium', bp:'118/75', hr:79,  spo2:97, temp:37.2, vent:false },
  ];
  return `
    <table class="amr-table" style="width:100%">
      <thead>
        <tr><th>ID</th><th>Patient</th><th>Age</th><th>Bed</th><th>Risk</th><th>BP</th><th>HR</th><th>SpO2</th><th>Temp (°C)</th><th>Ventilator</th></tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="color:var(--accent-blue)">${r.id}</td>
            <td style="font-weight:500;color:var(--text-primary)">${r.name}</td>
            <td>${r.age}</td>
            <td>${r.bed}</td>
            <td><span class="badge badge-${r.risk}">${r.risk.toUpperCase()}</span></td>
            <td style="color:${r.risk==='high'?'#ef5350':'var(--text-secondary)'}">${r.bp}</td>
            <td>${r.hr}</td>
            <td style="color:${r.spo2<92?'#ef5350':r.spo2<95?'#ffa726':'#66bb6a'}">${r.spo2}%</td>
            <td style="color:${r.temp>38.5?'#ef5350':r.temp>37.5?'#ffa726':'var(--text-secondary)'}">${r.temp}</td>
            <td>${r.vent?'<span class="badge badge-high">YES</span>':'<span class="badge badge-low">NO</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── GENOMIC SURVEILLANCE PAGE ────────────────────────────────
function renderGenomic() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Genomic Surveillance</div>
        <div class="page-subtitle">Pathogen Genomic Sequencing • Variant Tracking</div>
      </div>
      <button class="btn btn-primary">+ New Sequence</button>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr)">
      ${buildMiniStatCard('Total Samples','571','▲ 8%','up','#ab47bc')}
      ${buildMiniStatCard('New Variants','4','▲ 1','up','#ef5350')}
      ${buildMiniStatCard('Pending Analysis','23','▼ 5','down','#ffa726')}
      ${buildMiniStatCard('Sequences Today','12','—','neutral','#29b6f6')}
    </div>
    <div class="card fade-in">
      <div class="card-header"><div class="card-title">Genomic Sequencing Records</div><span class="badge badge-info">Live Feed</span></div>
      <div class="card-body" style="padding:0">
        <table class="geno-table" style="width:100%">
          <thead>
            <tr><th>Sample ID</th><th>Organism</th><th>Variant</th><th>Ward</th><th>Sequenced On</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${GENOMIC_DATA.map(g => `
              <tr>
                <td class="geno-sample">${g.id}</td>
                <td style="font-style:italic;color:var(--text-primary)">${g.organism}</td>
                <td class="geno-variant">${g.variant}</td>
                <td>${g.ward}</td>
                <td>${g.date}</td>
                <td><span class="badge badge-info">Completed</span></td>
              </tr>`).join('')}
            <tr><td class="geno-sample">SG-24571</td><td style="font-style:italic;color:var(--text-primary)">S. aureus</td><td class="geno-variant">USA300</td><td>ICU-2</td><td>15 May 2024</td><td><span class="badge badge-medium">Processing</span></td></tr>
            <tr><td class="geno-sample">SG-24572</td><td style="font-style:italic;color:var(--text-primary)">A. baumannii</td><td class="geno-variant">ST2</td><td>ISO-3</td><td>14 May 2024</td><td><span class="badge badge-info">Completed</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── RESOURCE MANAGEMENT PAGE ─────────────────────────────────
function renderResources() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Resource Management</div>
        <div class="page-subtitle">Hospital Resources • Real-time Availability</div>
      </div>
      <div class="live-badge"><span class="live-dot"></span> LIVE</div>
    </div>
    <div class="resource-grid fade-in" style="grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px">
      ${RESOURCES.map(r => {
        const colorFor = pct => pct >= 80 ? '#ef5350' : pct >= 60 ? '#ffa726' : '#66bb6a';
        return `
          <div class="card">
            <div class="card-body" style="text-align:center">
              <div style="font-size:32px;margin-bottom:8px">${r.icon}</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px">${r.name}</div>
              <div style="font-size:32px;font-weight:800;color:${colorFor(r.pct)}">${r.pct}%</div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">${r.used} / ${r.total} units</div>
              <div class="resource-bar-bg" style="height:8px;border-radius:4px">
                <div class="resource-bar-fill" style="width:${r.pct}%;background:${colorFor(r.pct)};height:8px;border-radius:4px"></div>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>
    <div class="dash-grid-2 fade-in">
      <div class="card">
        <div class="card-header"><div class="card-title">Bed Occupancy Details</div></div>
        <div class="card-body">
          ${[
            { ward:'ICU-1', occ:12, total:14, pct:86 },
            { ward:'ICU-2', occ:11, total:14, pct:79 },
            { ward:'MED-1', occ:28, total:40, pct:70 },
            { ward:'MED-2', occ:22, total:40, pct:55 },
            { ward:'SUR-1', occ:18, total:24, pct:75 },
            { ward:'ISO-1', occ:8,  total:10, pct:80 },
          ].map(w => `
            <div class="pathogen-row" style="margin-bottom:10px">
              <span class="pathogen-name">${w.ward}</span>
              <div class="pathogen-bar-bg"><div class="pathogen-bar-fill" style="width:${w.pct}%;background:${w.pct>=80?'#ef5350':w.pct>=65?'#ffa726':'#66bb6a'}"></div></div>
              <span class="pathogen-count">${w.occ}/${w.total}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Supply Alerts</div></div>
        <div class="card-body">
          ${[
            { item:'Meropenem',         level:'Low',      icon:'⚠️',  color:'#ef5350' },
            { item:'Blood Units (O-)',   level:'Critical', icon:'🔴',  color:'#ef5350' },
            { item:'N95 Masks',          level:'Moderate', icon:'🟠',  color:'#ffa726' },
            { item:'Oxygen Cylinders',   level:'Adequate', icon:'🟢',  color:'#66bb6a' },
            { item:'Vancomycin',         level:'Low',      icon:'⚠️',  color:'#ffa726' },
          ].map(s => `
            <div class="alert-item">
              <div style="font-size:18px">${s.icon}</div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:500;color:var(--text-primary)">${s.item}</div>
                <div style="font-size:10px;color:${s.color}">${s.level}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─── ALERTS PAGE ──────────────────────────────────────────────
function renderAlerts() {
  const content = $('pageContent');
  const allAlerts = [
    { level:'high',   title:'5 New High Risk Patients in ICU',       detail:'ICU-1 & ICU-2 – Patients exceed SOFA score threshold', time:'10 min ago', dept:'ICU' },
    { level:'high',   title:'3 Infection Clusters Detected',          detail:'Ward MED-2 – Possible HAI cluster – isolate immediately', time:'25 min ago', dept:'MED-2' },
    { level:'medium', title:'2 Ventilator Associated Pneumonia',       detail:'ICU-1 – VAP suspected – commence BAL culture', time:'45 min ago', dept:'ICU-1' },
    { level:'info',   title:'Low Stock: Meropenem',                   detail:'Pharmacy – Meropenem stock < 10 units remaining', time:'1 hr ago', dept:'Pharmacy' },
    { level:'high',   title:'Carbapenem-Resistant Klebsiella Alert',  detail:'ICU-2 – New CRE isolate – activate contact precautions', time:'2 hr ago', dept:'Microbiology' },
    { level:'medium', title:'Antibiotic Stewardship Warning',         detail:'MED-1 – Broad-spectrum overuse detected in ward', time:'3 hr ago', dept:'MED-1' },
    { level:'info',   title:'Genomic Sequencing Complete',            detail:'Sample SG-24568 – K. pneumoniae ST147 identified', time:'4 hr ago', dept:'Genomics' },
    { level:'low',    title:'Scheduled Maintenance: ICU Ventilator', detail:'Ventilator #7 due for calibration – 16:00 today', time:'5 hr ago', dept:'Engineering' },
  ];

  const icons = {
    high: `<div style="width:36px;height:36px;border-radius:50%;background:rgba(239,83,80,0.15);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef5350" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`,
    medium: `<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,167,38,0.15);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffa726" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
    info: `<div style="width:36px;height:36px;border-radius:50%;background:rgba(41,182,246,0.15);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#29b6f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>`,
    low: `<div style="width:36px;height:36px;border-radius:50%;background:rgba(102,187,106,0.15);display:flex;align-items:center;justify-content:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#66bb6a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>`,
  };

  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Alerts &amp; Notifications</div>
        <div class="page-subtitle">Real-time Hospital Alerts • ${allAlerts.length} Active</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline">Mark All Read</button>
        <button class="btn btn-primary">Configure Alerts</button>
      </div>
    </div>
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-title">All Alerts</div>
        <div style="display:flex;gap:6px">
          ${['All','Critical','High','Medium','Info'].map(f => `
            <button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.style.background='');this.style.background='var(--bg-card-hover)'">${f}</button>`).join('')}
        </div>
      </div>
      <div class="card-body" style="padding:0">
        ${allAlerts.map(a => `
          <div class="alert-item" style="padding:14px 16px;cursor:pointer" onmouseenter="this.style.background='var(--bg-card-hover)'" onmouseleave="this.style.background=''">
            ${icons[a.level] || icons.info}
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.title}</span>
                <span class="badge badge-${a.level==='info'?'info':a.level}">${a.level.toUpperCase()}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted)">${a.detail}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:11px;color:var(--text-muted)">${a.time}</div>
              <div style="font-size:10px;color:var(--accent-blue);margin-top:3px">${a.dept}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ─── REPORTS PAGE ─────────────────────────────────────────────
function renderReports() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Reports</div>
        <div class="page-subtitle">Generate & Download Clinical Reports</div>
      </div>
      <button class="btn btn-primary">+ Generate Report</button>
    </div>
    <div class="dash-grid-2 fade-in">
      ${[
        { title:'Infection Surveillance Report', date:'16 May 2024', type:'PDF', size:'2.4 MB', status:'Ready' },
        { title:'AMR Analytics Summary',         date:'15 May 2024', type:'PDF', size:'1.8 MB', status:'Ready' },
        { title:'ICU Patient Risk Report',       date:'14 May 2024', type:'XLSX',size:'890 KB', status:'Ready' },
        { title:'Genomic Sequencing Report',     date:'13 May 2024', type:'PDF', size:'3.1 MB', status:'Ready' },
        { title:'Antibiotic Usage (DDD) Report', date:'12 May 2024', type:'PDF', size:'1.2 MB', status:'Ready' },
        { title:'Weekly Outbreak Summary',       date:'11 May 2024', type:'PDF', size:'2.7 MB', status:'Processing' },
      ].map(r => `
        <div class="card">
          <div class="card-body" style="display:flex;align-items:center;gap:14px">
            <div style="width:44px;height:44px;border-radius:10px;background:rgba(66,165,245,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              ${r.type==='PDF'?'📄':'📊'}
            </div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${r.title}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${r.date} • ${r.type} • ${r.size}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              <span class="badge ${r.status==='Ready'?'badge-low':'badge-medium'}">${r.status}</span>
              ${r.status==='Ready'?`<button class="btn btn-outline" style="padding:4px 10px;font-size:11px">Download</button>`:''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────
function renderAnalytics() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Analytics</div>
        <div class="page-subtitle">AI-Powered Predictive Analytics • Trend Analysis</div>
      </div>
      <div class="live-badge"><span class="live-dot"></span> AI ENGINE</div>
    </div>
    <div class="dash-grid-2 fade-in">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Infection Trend (7 Days)</div>
        </div>
        <div class="card-body"><div style="height:220px"><canvas id="analyticsTrend"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top Pathogens</div>
        </div>
        <div class="card-body"><div style="height:220px"><canvas id="analyticsPathogens"></canvas></div></div>
      </div>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr);margin-top:12px">
      ${buildMiniStatCard('Outbreak Probability','34%','▲ 8%','up','#ef5350')}
      ${buildMiniStatCard('Patient Deterioration Risk','22%','▼ 3%','down','#66bb6a')}
      ${buildMiniStatCard('AMR Spread Index','6.8','▲ 0.4','up','#ffa726')}
      ${buildMiniStatCard('Resource Demand Forecast','87%','▲ 5%','up','#ab47bc')}
    </div>
    <div class="card fade-in" style="margin-top:12px">
      <div class="card-header"><div class="card-title">AI Predictions & Insights</div><span class="badge badge-info">AI Powered</span></div>
      <div class="card-body">
        ${[
          { icon:'🦠', text:'Outbreak probability in Ward MED-2 elevated to 34% – recommend enhanced surveillance', conf:'87% Confidence' },
          { icon:'👤', text:'Patient P-4521 (James Wilson) shows deterioration markers – consider escalation protocol', conf:'91% Confidence' },
          { icon:'💊', text:'Carbapenem resistance trend suggests rising CRE burden over next 7 days', conf:'83% Confidence' },
          { icon:'🛏️', text:'ICU bed demand forecast: 94% occupancy expected within 48 hours', conf:'79% Confidence' },
        ].map(p => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:22px;flex-shrink:0">${p.icon}</div>
            <div style="flex:1;font-size:13px;color:var(--text-secondary)">${p.text}</div>
            <div style="font-size:11px;color:var(--accent-green);font-weight:600;flex-shrink:0">${p.conf}</div>
          </div>`).join('')}
      </div>
    </div>`;
  requestAnimationFrame(() => {
    makeTrendChart('analyticsTrend');
    makePathogenChart('analyticsPathogens');
  });
}

// ─── USER MANAGEMENT PAGE ─────────────────────────────────────
function renderUserMgmt() {
  const content = $('pageContent');
  const users = [
    { name:'Dr. Admin',      role:'Administrator',     dept:'All',          last:'Just now',      status:'Online' },
    { name:'Dr. Sarah Kim',  role:'Infection Control', dept:'Microbiology', last:'5 min ago',     status:'Online' },
    { name:'Nurse Johnson',  role:'ICU Nurse',         dept:'ICU',          last:'12 min ago',    status:'Online' },
    { name:'Dr. Patel',      role:'Intensivist',       dept:'ICU',          last:'1 hr ago',      status:'Away' },
    { name:'Lab Tech Brown', role:'Lab Technician',    dept:'Laboratory',   last:'2 hr ago',      status:'Offline' },
  ];
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">User Management</div>
        <div class="page-subtitle">Manage roles, permissions, and access control</div>
      </div>
      <button class="btn btn-primary">+ Add User</button>
    </div>
    <div class="card fade-in">
      <div class="card-header"><div class="card-title">Users (${users.length})</div></div>
      <div class="card-body" style="padding:0">
        <table class="amr-table" style="width:100%">
          <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Last Active</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td style="font-weight:500;color:var(--text-primary);padding:10px 8px">
                  <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1976d2,#42a5f5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${u.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                  ${u.name}</div>
                </td>
                <td>${u.role}</td>
                <td>${u.dept}</td>
                <td style="color:var(--text-muted)">${u.last}</td>
                <td><span class="badge ${u.status==='Online'?'badge-low':u.status==='Away'?'badge-medium':'badge-info'}">${u.status}</span></td>
                <td><button class="btn btn-outline" style="padding:3px 8px;font-size:11px">Edit</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── SETTINGS PAGE ────────────────────────────────────────────
function renderSettings() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">System Settings</div>
        <div class="page-subtitle">Configure dashboard preferences and system parameters</div>
      </div>
      <button class="btn btn-primary">Save Changes</button>
    </div>
    <div class="dash-grid-2 fade-in">
      <div class="card">
        <div class="card-header"><div class="card-title">Appearance</div></div>
        <div class="card-body">
          ${[
            { label:'Dark Mode', sub:'Use dark color scheme', ctrl:`<label class="toggle-switch"><input type="checkbox" ${document.documentElement.getAttribute('data-theme')==='dark'?'checked':''} onchange="document.getElementById('darkModeToggle').checked=this.checked;toggleDarkMode()"><span class="toggle-slider"></span></label>` },
            { label:'Compact View', sub:'Show more data per screen', ctrl:`<label class="toggle-switch"><input type="checkbox"><span class="toggle-slider"></span></label>` },
            { label:'Show Animations', sub:'Enable UI transitions', ctrl:`<label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label>` },
          ].map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${s.label}</div>
                <div style="font-size:11px;color:var(--text-muted)">${s.sub}</div>
              </div>
              ${s.ctrl}
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Notifications</div></div>
        <div class="card-body">
          ${[
            { label:'Critical Alerts',     on:true  },
            { label:'High Risk Patients',  on:true  },
            { label:'AMR Alerts',          on:true  },
            { label:'Resource Low Stock',  on:true  },
            { label:'Genomic Results',     on:false },
            { label:'Daily Summary',       on:true  },
          ].map(n => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:13px;color:var(--text-secondary)">${n.label}</span>
              <label class="toggle-switch"><input type="checkbox" ${n.on?'checked':''}><span class="toggle-slider"></span></label>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Data Refresh</div></div>
        <div class="card-body">
          <div style="margin-bottom:14px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Auto-refresh interval</div>
            <select style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:8px 12px;font-size:13px;outline:none">
              <option>Every 30 seconds</option>
              <option selected>Every 1 minute</option>
              <option>Every 5 minutes</option>
              <option>Manual only</option>
            </select>
          </div>
          <div style="margin-bottom:14px">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Default date range</div>
            <select style="width:100%;background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:8px 12px;font-size:13px;outline:none">
              <option>Last 7 days</option>
              <option>Last 14 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">About MediShield AI</div></div>
        <div class="card-body">
          ${[
            { label:'Version', value:'v2.4.1' },
            { label:'Build', value:'20240516-stable' },
            { label:'AI Engine', value:'MediShield ML v3.2' },
            { label:'Database', value:'CentralDB v5.1' },
            { label:'Last Backup', value:'16 May 2024 – 03:00' },
            { label:'License', value:'Hospital Enterprise' },
          ].map(i => `
            <div class="info-row">
              <span class="info-label">${i.label}</span>
              <span class="info-value">${i.value}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

// ─── PAGE ROUTER ─────────────────────────────────────────────
function renderPage(page) {
  // Destroy existing charts
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  Object.keys(charts).forEach(k => delete charts[k]);

  switch(page) {
    case 'overview':   renderOverview();  break;
    case 'patients':   renderPatients();  break;
    case 'infection':  renderInfection(); break;
    case 'amr':        renderAMR();       break;
    case 'icu':        renderICU();       break;
    case 'genomic':    renderGenomic();   break;
    case 'resources':  renderResources(); break;
    case 'alerts':     renderAlerts();    break;
    case 'reports':    renderReports();   break;
    case 'analytics':  renderAnalytics(); break;
    case 'usermgmt':   renderUserMgmt();  break;
    case 'settings':   renderSettings();  break;
    default:           renderOverview();
  }
}

// ─── LIVE DATA SIMULATION ─────────────────────────────────────
function simulateLiveData() {
  // patients, infections, highRisk are always derived from PATIENTS_DB — never randomised
  // Only secondary metrics that are not directly patient-count-driven vary slightly
  DATA.antibioticUsage.value = 1562 + randomBetween(-10, 10);
  DATA.alerts.value          = 23   + randomBetween(-1, 2);

  if (currentPage === 'overview') {
    // Update stat values live without full re-render
    const el_p = $('statVal_patients');
    if (el_p) el_p.textContent = fmtFull(DATA.patients.value);
    const el_i = $('statVal_infections');
    if (el_i) el_i.textContent = fmtFull(DATA.infections.value);
    const el_h = $('statVal_highRisk');
    if (el_h) el_h.textContent = fmtFull(DATA.highRisk.value);
    const el_ab = $('statVal_antibioticUsage');
    if (el_ab) el_ab.textContent = fmtFull(DATA.antibioticUsage.value);
    const el_al = $('statVal_alerts');
    if (el_al) el_al.textContent = fmtFull(DATA.alerts.value);
    const icuEl = $('statVal_icuOccupancy');
    if (icuEl) icuEl.textContent = DATA.icuOccupancy.value + '%';

    // Vary trend data slightly
    TREND_DATA.HAI = TREND_DATA.HAI.map(v => Math.max(5, v + randomBetween(-2, 3)));
    TREND_DATA.UTI = TREND_DATA.UTI.map(v => Math.max(10, v + randomBetween(-2, 3)));
    TREND_DATA.BSI = TREND_DATA.BSI.map(v => Math.max(3, v + randomBetween(-1, 2)));
    TREND_DATA.SSI = TREND_DATA.SSI.map(v => Math.max(2, v + randomBetween(-1, 2)));

    const tc = charts['trendChart'];
    if (tc) {
      tc.data.datasets[0].data = [...TREND_DATA.HAI];
      tc.data.datasets[1].data = [...TREND_DATA.UTI];
      tc.data.datasets[2].data = [...TREND_DATA.BSI];
      tc.data.datasets[3].data = [...TREND_DATA.SSI];
      tc.update('none');
    }

    // Update notification badge
    const badge = $('notifBadge');
    if (badge) badge.textContent = DATA.alerts.value;
    const navBadge = $('navAlertBadge');
    if (navBadge) navBadge.textContent = Math.max(1, DATA.alerts.value - 18);
  }
}

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  computeStatsFromDB();          // populate DATA from real PATIENTS_DB before first render
  startClock();
  renderPage('overview');
  setInterval(simulateLiveData, 4000);
}

document.addEventListener('DOMContentLoaded', init);
