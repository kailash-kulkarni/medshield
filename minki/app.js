/* ============================================================
   MediShield AI – Hospital Surveillance Dashboard
   app.js – Dynamic Data Engine + UI Renderer
   ============================================================ */

'use strict';

// ─── LIVE DATA STORE ──────────────────────────────────────────
const DATA = {
  patients:       { value: 1248, change: 12,  dir: 'up',   vs: 'vs last week' },
  infections:     { value: 86,   change: 8,   dir: 'up',   vs: 'vs last week' },
  highRisk:       { value: 243,  change: 15,  dir: 'up',   vs: 'vs last week' },
  icuOccupancy:   { value: 78,   change: 5,   dir: 'up',   vs: 'vs last week', beds: { occ: 312, total: 400 } },
  antibioticUsage:{ value: 1562, change: 4,   dir: 'down', vs: 'vs last week' },
  alerts:         { value: 23,   change: null, dir: 'neutral', vs: 'New this week' },
};

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

  const sparklines = {
    patients:       [1100,1150,1180,1220,1200,1240,1248],
    infections:     [70,75,78,80,79,83,86],
    highRisk:       [200,210,220,230,235,240,243],
    icuOccupancy:   [70,72,74,75,76,77,78],
    antibioticUsage:[1600,1590,1580,1565,1570,1558,1562],
    alerts:         [15,18,20,19,22,21,23],
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
  const sparklines = {
    patients:       [1100,1150,1180,1220,1200,1240,1248],
    infections:     [70,75,78,80,79,83,86],
    highRisk:       [200,210,220,230,235,240,243],
    icuOccupancy:   [70,72,74,75,76,77,78],
    antibioticUsage:[1600,1590,1580,1565,1570,1558,1562],
    alerts:         [15,18,20,19,22,21,23],
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
function renderPatients() {
  const content = $('pageContent');
  content.innerHTML = `
    <div class="section-page-header fade-in">
      <div>
        <div class="section-page-title">Patient Surveillance</div>
        <div class="page-subtitle">Monitor all admitted patients in real-time</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline">Export</button>
        <button class="btn btn-primary">+ Add Patient</button>
      </div>
    </div>
    <div class="stats-grid fade-in" style="grid-template-columns:repeat(4,1fr)">
      ${buildMiniStatCard('Total Admitted','1,248','▲ 12%','up','#42a5f5')}
      ${buildMiniStatCard('Discharged Today','34','▲ 5%','up','#66bb6a')}
      ${buildMiniStatCard('Critical Condition','43','▲ 8%','up','#ef5350')}
      ${buildMiniStatCard('Avg. Stay (days)','5.2','▼ 3%','down','#ab47bc')}
    </div>
    <div class="card fade-in">
      <div class="card-header">
        <div class="card-title">Patient List</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" placeholder="Search patient..." style="background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);border-radius:6px;padding:5px 10px;font-size:12px;outline:none" />
          <select style="background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);border-radius:6px;padding:5px 8px;font-size:12px;outline:none">
            <option>All Wards</option><option>ICU</option><option>General</option><option>Isolation</option>
          </select>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        ${buildPatientTable()}
      </div>
    </div>`;
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

function buildPatientTable() {
  const rows = [
    { id:'P-4521', name:'James Wilson',    age:67, ward:'ICU-1',   diag:'Sepsis',           risk:'high',   adm:'14 May 2024', status:'Critical' },
    { id:'P-4522', name:'Maria Garcia',    age:54, ward:'MED-2',   diag:'UTI',               risk:'medium', adm:'15 May 2024', status:'Stable' },
    { id:'P-4523', name:'Robert Chen',     age:72, ward:'ICU-2',   diag:'Pneumonia',         risk:'high',   adm:'13 May 2024', status:'Critical' },
    { id:'P-4524', name:'Susan Taylor',    age:45, ward:'GEN-3',   diag:'Post-op Infection', risk:'low',    adm:'16 May 2024', status:'Improving' },
    { id:'P-4525', name:'Michael Brown',   age:59, ward:'ISO-1',   diag:'MRSA',              risk:'high',   adm:'12 May 2024', status:'Stable' },
    { id:'P-4526', name:'Linda Anderson',  age:38, ward:'SUR-2',   diag:'SSI',               risk:'medium', adm:'15 May 2024', status:'Improving' },
    { id:'P-4527', name:'David Martinez',  age:81, ward:'ICU-1',   diag:'ARDS',              risk:'high',   adm:'11 May 2024', status:'Critical' },
    { id:'P-4528', name:'Jennifer Davis',  age:29, ward:'MED-1',   diag:'HAI – UTI',         risk:'medium', adm:'16 May 2024', status:'Stable' },
  ];
  return `
    <table class="amr-table" style="width:100%">
      <thead>
        <tr>
          <th>ID</th><th>Patient Name</th><th>Age</th><th>Ward</th>
          <th>Diagnosis</th><th>Risk</th><th>Admitted</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr style="cursor:pointer" onclick="alert('Patient ${r.name} – ${r.diag}')">
            <td style="color:var(--accent-blue)">${r.id}</td>
            <td style="color:var(--text-primary);font-weight:500">${r.name}</td>
            <td>${r.age}</td>
            <td>${r.ward}</td>
            <td>${r.diag}</td>
            <td><span class="badge badge-${r.risk}">${r.risk.toUpperCase()}</span></td>
            <td>${r.adm}</td>
            <td style="color:${r.status==='Critical'?'#ef5350':r.status==='Improving'?'#66bb6a':'#ffa726'}">${r.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
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
  // Vary patient count slightly
  DATA.patients.value   = 1248 + randomBetween(-5, 10);
  DATA.infections.value = 86   + randomBetween(-2, 3);
  DATA.highRisk.value   = 243  + randomBetween(-3, 5);
  DATA.icuOccupancy.value = 78 + randomBetween(-1, 2);
  DATA.antibioticUsage.value = 1562 + randomBetween(-10, 10);
  DATA.alerts.value     = 23   + randomBetween(-1, 2);

  if (currentPage === 'overview') {
    // Update stat values live without full re-render
    const keys = ['patients','infections','highRisk','antibioticUsage','alerts'];
    keys.forEach(k => {
      const el = $(`statVal_${k}`);
      if (el) el.textContent = fmtFull(DATA[k].value);
    });
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
  startClock();
  renderPage('overview');
  setInterval(simulateLiveData, 4000);
}

document.addEventListener('DOMContentLoaded', init);
