// EnergySight AI - Client Dashboard Logic

const state = {
  features: {
    X1: 0.76,
    X2: 661.5,
    X3: 416.5,
    X4: 122.5,
    X5: 7.0,
    X6: 3,
    X7: 0.25,
    X8: 2,
  },
  context: {
    project_type: 'Residential',
    climate_zone: 'Cold',
    insulation: 'High',
    glazing: 'Triple',
    model_name: 'Gradient Boosting',
  },
  autoCalc: true,
  currentBenchmark: null,
  presets: {},
  benchmarks: [],
  debounceTimer: null,
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  await loadInitialData();
  renderSvgBuilding();
  triggerPrediction();
});

// Setup Tab Navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach((v) => v.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');

      if (targetId === 'tab-importance') {
        loadFeatureImportance();
      }
    });
  });
}

// Load Initial Data from Flask
async function loadInitialData() {
  try {
    const [configRes, samplesRes] = await Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/samples').then((r) => r.json()),
    ]);

    state.presets = configRes.presets || {};
    state.benchmarks = samplesRes || [];

    populatePresets();
    populateBenchmarks();
  } catch (err) {
    console.error('Error loading config:', err);
  }
}

// Populate Preset Pills
function populatePresets() {
  const container = document.getElementById('presetPills');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(state.presets).forEach(([key, preset], index) => {
    const pill = document.createElement('button');
    pill.className = `preset-pill ${index === 0 ? 'active' : ''}`;
    pill.innerHTML = `<span>${getPresetIcon(key)}</span> ${preset.title}`;
    pill.addEventListener('click', () => {
      document.querySelectorAll('.preset-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      applyPreset(preset);
    });
    container.appendChild(pill);
  });
}

function getPresetIcon(name) {
  if (name.includes('Eco')) return '🏡';
  if (name.includes('Villa')) return '🏠';
  if (name.includes('Office')) return '🏢';
  if (name.includes('Warehouse')) return '🏭';
  return '📐';
}

function applyPreset(preset) {
  state.currentBenchmark = null;
  hideGroundTruthBanner();

  state.features = { ...preset.features };
  if (preset.context) {
    state.context = { ...state.context, ...preset.context };
    updateContextSelects();
  }

  updateAllInputControls();
  renderSvgBuilding();
  triggerPrediction();
  showToast(`Loaded preset: ${preset.title}`);
}

// Populate Benchmarks Dropdown
function populateBenchmarks() {
  const select = document.getElementById('benchmarkSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose a benchmark test building --</option>';

  state.benchmarks.forEach((bm, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${bm.title} (Actual: H=${bm.actual.heating_load}, C=${bm.actual.cooling_load})`;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    const idx = e.target.value;
    if (idx === '') return;
    const bm = state.benchmarks[Number(idx)];
    if (bm) {
      applyBenchmark(bm);
    }
  });
}

function applyBenchmark(bm) {
  state.currentBenchmark = bm;
  state.features = { ...bm.features };

  document.querySelectorAll('.preset-pill').forEach((p) => p.classList.remove('active'));
  updateAllInputControls();
  renderSvgBuilding();
  triggerPrediction();
}

// Setup Event Listeners for Range Inputs & Segmented Buttons
function setupEventListeners() {
  // Continuous features X1 to X4
  ['X1', 'X2', 'X3', 'X4'].forEach((feat) => {
    const slider = document.getElementById(`slider-${feat}`);
    const numInput = document.getElementById(`num-${feat}`);

    if (slider && numInput) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        numInput.value = val;
        state.features[feat] = val;
        onFeatureChanged();
      });

      numInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          slider.value = val;
          state.features[feat] = val;
          onFeatureChanged();
        }
      });
    }
  });

  // Segmented Buttons for X5 (Height)
  setupSegmentGroup('X5', (val) => {
    state.features.X5 = parseFloat(val);
    onFeatureChanged();
  });

  // Segmented Buttons for X6 (Orientation)
  setupSegmentGroup('X6', (val) => {
    state.features.X6 = parseInt(val, 10);
    onFeatureChanged();
  });

  // Segmented Buttons for X7 (Glazing Area)
  setupSegmentGroup('X7', (val) => {
    state.features.X7 = parseFloat(val);
    onFeatureChanged();
  });

  // Segmented Buttons for X8 (Glazing Distribution)
  setupSegmentGroup('X8', (val) => {
    state.features.X8 = parseInt(val, 10);
    onFeatureChanged();
  });

  // Context Selects
  const contextKeys = ['project_type', 'climate_zone', 'insulation', 'glazing', 'model_name'];
  contextKeys.forEach((key) => {
    const elem = document.getElementById(`select-${key}`);
    if (elem) {
      elem.addEventListener('change', (e) => {
        state.context[key] = e.target.value;
        onFeatureChanged();
      });
    }
  });

  // Auto Calc Toggle
  const autoToggle = document.getElementById('autoCalcToggle');
  if (autoToggle) {
    autoToggle.addEventListener('change', (e) => {
      state.autoCalc = e.target.checked;
    });
  }

  // Calculate Button
  const calcBtn = document.getElementById('btnCalculate');
  if (calcBtn) {
    calcBtn.addEventListener('click', () => {
      triggerPrediction();
    });
  }

  // Reset Button
  const resetBtn = document.getElementById('btnReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const firstPreset = Object.values(state.presets)[0];
      if (firstPreset) applyPreset(firstPreset);
    });
  }

  // Batch CSV Upload
  setupBatchPredictor();
}

function setupSegmentGroup(feat, callback) {
  const buttons = document.querySelectorAll(`[data-group="${feat}"]`);
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.val);
    });
  });
}

function onFeatureChanged() {
  renderSvgBuilding();
  if (state.autoCalc) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
      triggerPrediction();
    }, 180);
  }
}

function updateAllInputControls() {
  // Continuous
  ['X1', 'X2', 'X3', 'X4'].forEach((feat) => {
    const slider = document.getElementById(`slider-${feat}`);
    const numInput = document.getElementById(`num-${feat}`);
    if (slider) slider.value = state.features[feat];
    if (numInput) numInput.value = state.features[feat];
  });

  // Segmented
  ['X5', 'X6', 'X7', 'X8'].forEach((feat) => {
    const val = state.features[feat];
    const buttons = document.querySelectorAll(`[data-group="${feat}"]`);
    buttons.forEach((btn) => {
      if (parseFloat(btn.dataset.val) === parseFloat(val)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });
}

function updateContextSelects() {
  Object.entries(state.context).forEach(([key, val]) => {
    const elem = document.getElementById(`select-${key}`);
    if (elem) elem.value = val;
  });
}

// Trigger Prediction Call to Server
async function triggerPrediction() {
  const payload = {
    ...state.features,
    ...state.context,
  };

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Prediction request failed');
    const data = await response.json();
    renderPredictionResults(data);
  } catch (err) {
    console.error('Prediction error:', err);
    showToast('Failed to calculate energy forecast.');
  }
}

// Render Prediction UI Elements
function renderPredictionResults(data) {
  // Update Numeric Metrics
  animateNumber('valHeating', data.heating_load);
  animateNumber('valCooling', data.cooling_load);
  animateNumber('valTotal', data.total_load);
  animateNumber('valAvg', data.average_load);

  // Update Progress Bars
  const heatingPct = Math.min(100, Math.round((data.heating_load / 45) * 100));
  const coolingPct = Math.min(100, Math.round((data.cooling_load / 45) * 100));
  document.getElementById('barHeating').style.width = `${heatingPct}%`;
  document.getElementById('barCooling').style.width = `${coolingPct}%`;

  // Update Eco Stats
  document.getElementById('valCarbon').textContent = `${data.carbon_footprint_kg_m2} kg/m²`;
  document.getElementById('valCost').textContent = `$${data.estimated_annual_cost_usd_m2}/m²`;
  document.getElementById('valModelUsed').textContent = data.model_used;

  // Update Energy Rating Badge
  const ratingBadge = document.getElementById('energyRatingBadge');
  const ratingGrade = document.getElementById('energyRatingGrade');
  const ratingTitle = document.getElementById('energyRatingTitle');
  const ratingDesc = document.getElementById('energyRatingDesc');

  if (ratingBadge && data.rating) {
    ratingBadge.className = `grade-badge-huge ${data.rating.badge_class}`;
    ratingGrade.textContent = data.rating.grade;
    ratingTitle.textContent = `${data.rating.label} Envelope`;
    ratingDesc.textContent = data.rating.summary;

    // Highlight rating scale bar
    document.querySelectorAll('.scale-segment').forEach((seg) => {
      seg.classList.remove('active-grade');
      if (seg.dataset.grade === data.rating.grade) {
        seg.classList.add('active-grade');
      }
    });
  }

  // Update Ground Truth Comparison (if benchmark selected)
  updateGroundTruthBanner(data);

  // Update Recommendations List
  const recList = document.getElementById('recommendationsList');
  if (recList && Array.isArray(data.recommendations)) {
    recList.innerHTML = '';
    data.recommendations.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      recList.appendChild(li);
    });
  }

  // Update SVG Hue tint
  updateSvgThermalTint(data.total_load);
}

function updateGroundTruthBanner(data) {
  const banner = document.getElementById('groundTruthBanner');
  if (!banner) return;

  if (state.currentBenchmark) {
    const actH = state.currentBenchmark.actual.heating_load;
    const actC = state.currentBenchmark.actual.cooling_load;
    const predH = data.heating_load;
    const predC = data.cooling_load;

    const errH = Math.abs(predH - actH);
    const errC = Math.abs(predC - actC);

    banner.innerHTML = `
      <strong>🎯 Benchmark Verification:</strong>
      Actual Heating: <b>${actH}</b> kWh (Predicted: <b>${predH}</b>, Diff: ±${errH.toFixed(2)}) |
      Actual Cooling: <b>${actC}</b> kWh (Predicted: <b>${predC}</b>, Diff: ±${errC.toFixed(2)})
    `;
    banner.classList.add('active');
  } else {
    banner.classList.remove('active');
  }
}

function hideGroundTruthBanner() {
  const banner = document.getElementById('groundTruthBanner');
  if (banner) banner.classList.remove('active');
  const select = document.getElementById('benchmarkSelect');
  if (select) select.value = '';
}

// Animate numbers smoothly
function animateNumber(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = Number(targetValue).toFixed(2);
}

// Dynamic 2.5D Isometric SVG Building Architecture
function renderSvgBuilding() {
  const container = document.getElementById('svgCanvas');
  if (!container) return;

  const heightVal = state.features.X5 || 7.0; // 3.5 or 7.0
  const isTwoStory = heightVal >= 5.0;
  const glazingRatio = state.features.X7 || 0.25; // 0.0 to 0.40
  const orientation = state.features.X6 || 2; // 2: North, 3: East, 4: South, 5: West

  // Orientation text & angle
  const compassAngles = { 2: 0, 3: 90, 4: 180, 5: 270 };
  const compassLabels = { 2: 'North (0°)', 3: 'East (90°)', 4: 'South (180°)', 5: 'West (270°)' };
  const compassText = compassLabels[orientation] || 'North';

  // SVG Dimensions & Isometric Projection
  // Box base: center (200, 140)
  const bHeight = isTwoStory ? 90 : 48;
  const bWidth = 85;
  const bDepth = 75;

  // Window rows and columns depending on glazingRatio
  let windowCount = 0;
  if (glazingRatio >= 0.35) windowCount = 4;
  else if (glazingRatio >= 0.2) windowCount = 3;
  else if (glazingRatio > 0.05) windowCount = 2;

  let windowsSvg = '';
  if (windowCount > 0) {
    const stories = isTwoStory ? 2 : 1;
    for (let s = 0; s < stories; s++) {
      const yOffset = s * (bHeight / stories) + 12;
      for (let w = 0; w < windowCount; w++) {
        // Front-left face windows
        const wx = 135 + w * (bWidth / windowCount) * 0.75;
        const wy = 125 - yOffset + w * 12;
        windowsSvg += `<polygon points="${wx},${wy} ${wx + 10},${wy + 6} ${wx + 10},${wy + 18} ${wx},${wy + 12}" fill="#38bdf8" opacity="0.85" stroke="#0284c7" stroke-width="1"/>`;
      }
    }
  }

  const svgContent = `
    <svg viewBox="0 0 400 200" class="svg-building" xmlns="http://www.w3.org/2000/svg">
      <!-- Ground Grid -->
      <ellipse cx="200" cy="165" rx="140" ry="28" fill="#e2e8f0" opacity="0.6"/>
      <ellipse cx="200" cy="165" rx="110" ry="20" fill="#cbd5e1" opacity="0.4"/>

      <!-- Building Shadows -->
      <polygon points="200,165 285,125 320,135 235,175" fill="rgba(15, 23, 42, 0.1)"/>

      <!-- Building Front-Left Face -->
      <polygon id="facadeLeft" points="115,125 200,165 200,${165 - bHeight} 115,${125 - bHeight}"
        fill="#94a3b8" stroke="#64748b" stroke-width="1.5"/>

      <!-- Building Front-Right Face -->
      <polygon id="facadeRight" points="200,165 285,125 285,${125 - bHeight} 200,${165 - bHeight}"
        fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>

      <!-- Building Roof -->
      <polygon id="facadeRoof" points="200,${165 - bHeight} 285,${125 - bHeight} 200,${85 - bHeight} 115,${125 - bHeight}"
        fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>

      <!-- Floor Division Line for Two-Story -->
      ${
        isTwoStory
          ? `<path d="M 115,${125 - bHeight / 2} L 200,${165 - bHeight / 2} L 285,${125 - bHeight / 2}" stroke="#475569" stroke-dasharray="3,2" stroke-width="1.5" fill="none"/>`
          : ''
      }

      <!-- Windows -->
      ${windowsSvg}

      <!-- Cardinal Compass Indicator in corner -->
      <g transform="translate(340, 45)">
        <circle cx="0" cy="0" r="24" fill="white" stroke="#cbd5e1" stroke-width="1.5"/>
        <text x="0" y="-12" font-size="9" font-weight="bold" fill="#64748b" text-anchor="middle">N</text>
        <text x="14" y="3" font-size="9" font-weight="bold" fill="#64748b" text-anchor="middle">E</text>
        <text x="0" y="18" font-size="9" font-weight="bold" fill="#64748b" text-anchor="middle">S</text>
        <text x="-14" y="3" font-size="9" font-weight="bold" fill="#64748b" text-anchor="middle">W</text>
        <!-- Needle rotating to orientation -->
        <g transform="rotate(${compassAngles[orientation] || 0})">
          <polygon points="0,-18 4,0 -4,0" fill="#ef4444"/>
          <polygon points="0,18 4,0 -4,0" fill="#94a3b8"/>
        </g>
        <circle cx="0" cy="0" r="3" fill="#1e293b"/>
      </g>

      <!-- Dimension Tags -->
      <text x="110" y="180" font-size="10" font-weight="600" fill="#64748b">Height: ${heightVal}m (${isTwoStory ? '2-Story' : '1-Story'})</text>
      <text x="250" y="180" font-size="10" font-weight="600" fill="#64748b">Glazing: ${Math.round(glazingRatio * 100)}%</text>
    </svg>
  `;

  container.innerHTML = svgContent;
  document.getElementById('legendOrientation').textContent = `Orientation: ${compassText}`;
  document.getElementById('legendStories').textContent = `${isTwoStory ? '2 Floors' : '1 Floor'} (${heightVal}m)`;
}

function updateSvgThermalTint(totalLoad) {
  const leftFace = document.getElementById('facadeLeft');
  const rightFace = document.getElementById('facadeRight');
  const roof = document.getElementById('facadeRoof');
  if (!leftFace || !rightFace || !roof) return;

  if (totalLoad < 35) {
    // Highly efficient (Cool / Passive)
    leftFace.setAttribute('fill', '#93c5fd');
    rightFace.setAttribute('fill', '#bfdbfe');
    roof.setAttribute('fill', '#dbeafe');
  } else if (totalLoad < 60) {
    // Moderate (Neutral)
    leftFace.setAttribute('fill', '#cbd5e1');
    rightFace.setAttribute('fill', '#e2e8f0');
    roof.setAttribute('fill', '#f8fafc');
  } else {
    // High thermal load (Warm / Overheating)
    leftFace.setAttribute('fill', '#fdba74');
    rightFace.setAttribute('fill', '#fed7aa');
    roof.setAttribute('fill', '#ffedd5');
  }
}

// Feature Importance View
async function loadFeatureImportance() {
  const container = document.getElementById('featureImportanceContainer');
  if (!container || container.dataset.loaded === 'true') return;

  try {
    const res = await fetch('/api/feature-importance');
    const data = await res.json();
    const gb = data.gradient_boosting;

    if (!gb) return;

    renderImportanceBars('heatingBars', gb.heating_load, 'bar-fill-orange');
    renderImportanceBars('coolingBars', gb.cooling_load, 'bar-fill-cyan');

    container.dataset.loaded = 'true';
  } catch (err) {
    console.error('Error fetching feature importance:', err);
  }
}

const FEATURE_NAMES = {
  X1: 'Relative Compactness',
  X2: 'Surface Area',
  X3: 'Wall Area',
  X4: 'Roof Area',
  X5: 'Overall Height',
  X6: 'Orientation',
  X7: 'Glazing Area',
  X8: 'Glazing Area Distribution',
};

function renderImportanceBars(containerId, importanceMap, colorClass) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(importanceMap).sort((a, b) => b[1] - a[1]);
  const maxVal = entries[0] ? entries[0][1] : 1;

  entries.forEach(([feat, val]) => {
    const pct = Math.round((val / maxVal) * 100);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-header">
        <span>${feat}: ${FEATURE_NAMES[feat] || feat}</span>
        <span>${(val * 100).toFixed(1)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${colorClass}" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

// Batch Predictor Logic
function setupBatchPredictor() {
  const fileInput = document.getElementById('batchFileInput');
  const uploadBox = document.getElementById('batchUploadBox');
  const tableContainer = document.getElementById('batchResultsTableContainer');
  const tableBody = document.getElementById('batchTableBody');
  const downloadBtn = document.getElementById('btnDownloadBatchCsv');

  let batchData = [];

  if (uploadBox && fileInput) {
    uploadBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/predict-batch', {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();
        if (result.results) {
          batchData = result.results;
          renderBatchTable(batchData);
          showToast(`Successfully processed ${result.count} buildings!`);
        }
      } catch (err) {
        showToast('Error parsing batch CSV file');
      }
    });
  }

  // Load Sample Batch Button
  const btnSampleBatch = document.getElementById('btnLoadSampleBatch');
  if (btnSampleBatch) {
    btnSampleBatch.addEventListener('click', async () => {
      // 4 sample rows
      const sampleRows = [
        { X1: 0.98, X2: 514.5, X3: 294.0, X4: 110.25, X5: 7.0, X6: 2, X7: 0.1, X8: 1 },
        { X1: 0.86, X2: 588.0, X3: 318.5, X4: 134.75, X5: 3.5, X6: 3, X7: 0.25, X8: 2 },
        { X1: 0.74, X2: 686.0, X3: 245.0, X4: 220.5, X5: 3.5, X6: 4, X7: 0.4, X8: 3 },
        { X1: 0.62, X2: 808.5, X3: 367.5, X4: 220.5, X5: 7.0, X6: 5, X7: 0.0, X8: 0 },
      ];

      const res = await fetch('/api/predict-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: sampleRows }),
      });
      const result = await res.json();
      batchData = result.results;
      renderBatchTable(batchData);
      showToast('Loaded demo batch data!');
    });
  }

  function renderBatchTable(rows) {
    if (!tableContainer || !tableBody) return;
    tableContainer.style.display = 'block';
    tableBody.innerHTML = '';

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${row.index}</td>
        <td>${row.X1}</td>
        <td>${row.X2}</td>
        <td>${row.X3}</td>
        <td>${row.X4}</td>
        <td>${row.X5}m</td>
        <td>${row.X6}</td>
        <td>${row.X7}</td>
        <td>${row.X8}</td>
        <td><b>${row.heating_load}</b></td>
        <td><b>${row.cooling_load}</b></td>
        <td><b>${row.total_load}</b></td>
        <td><span class="winner-tag">${row.rating}</span></td>
      `;
      tableBody.appendChild(tr);
    });

    if (downloadBtn) {
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.onclick = () => downloadCsv(rows);
    }
  }

  function downloadCsv(rows) {
    const headers = ['Index', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'Heating_Load', 'Cooling_Load', 'Total_Load', 'Rating'];
    const csvContent =
      headers.join(',') +
      '\n' +
      rows
        .map((r) =>
          [r.index, r.X1, r.X2, r.X3, r.X4, r.X5, r.X6, r.X7, r.X8, r.heating_load, r.cooling_load, r.total_load, r.rating].join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'energy_efficiency_predictions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Toast helper
function showToast(message) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
