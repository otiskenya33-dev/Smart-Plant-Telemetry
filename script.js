// ======================= CONFIGURATION =======================
// 👇👇👇 REPLACE WITH YOUR ThingSpeak CHANNEL DETAILS 👇👇👇
const CHANNEL_ID = '3321220';       // e.g., '1234567'
const READ_API_KEY = 'AAN97TR1HU85UFRF';   // Optional: only for private channels
const FIELDS_COUNT = 2;                     // How many fields you use (1 to 8)

// Optional: Friendly names & units for each field (customize as you like)
const FIELD_META = {
  1: { name: 'Temperature', unit: '°C', icon: '🌡️' },
  2: { name: 'Humidity',    unit: '%',   icon: '💧' },
  3: { name: 'Pressure',    unit: 'hPa', icon: '⏲️' },
  4: { name: 'Air Quality', unit: 'ppm', icon: '🌿' },
  5: { name: 'Voltage',     unit: 'V',   icon: '⚡' },
  6: { name: 'Current',     unit: 'mA',  icon: '🔌' },
  7: { name: 'Distance',    unit: 'cm',  icon: '📏' },
  8: { name: 'Custom',      unit: '',    icon: '📊' }
};
// ==============================================================

// DOM elements
const dataContainer = document.getElementById('dataContainer');
const lastUpdateSpan = document.getElementById('lastUpdateText');
const nextRefreshSpan = document.getElementById('nextRefreshText');
const refreshBtn = document.getElementById('refreshNowBtn');
const entryInfoDiv = document.getElementById('entryInfo');
const channelIdBadge = document.getElementById('channelIdBadge');

// Refresh interval in milliseconds (10 minutes)
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 600,000 ms

let countdownInterval = null;
let nextRefreshTime = Date.now() + REFRESH_INTERVAL_MS;

// Display channel ID
if (CHANNEL_ID !== 'YOUR_CHANNEL_ID') {
  channelIdBadge.textContent = `Channel: ${CHANNEL_ID}`;
} else {
  channelIdBadge.textContent = '⚠️ Channel not configured';
}

// Helper: build API URL for reading the last entry of all fields (JSON)
function buildApiUrl() {
  let url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds/last.json`;
  const params = new URLSearchParams();
  
  if (READ_API_KEY && READ_API_KEY !== 'YOUR_READ_API_KEY' && READ_API_KEY.trim() !== '') {
    params.append('api_key', READ_API_KEY);
  }
  
  const queryString = params.toString();
  if (queryString) {
    url += '?' + queryString;
  }
  return url;
}

// Fetch data from ThingSpeak
async function fetchThingSpeakData() {
  if (!CHANNEL_ID || CHANNEL_ID === 'YOUR_CHANNEL_ID') {
    showError('⚠️ Please configure your ThingSpeak CHANNEL_ID in the script.');
    return null;
  }

  const url = buildApiUrl();
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || (Object.keys(data).length === 0)) {
      throw new Error('Empty response from ThingSpeak');
    }
    
    return data;
  } catch (err) {
    console.error('Fetch error:', err);
    showError(`Failed to fetch data: ${err.message}. Check channel ID, API key (if private), and network.`);
    return null;
  }
}

// Display error message inside the grid
function showError(message) {
  dataContainer.innerHTML = `
    <div class="error" style="grid-column: 1/-1;">
      ❌ ${message}
      <br><small style="display:block; margin-top:8px;">Make sure your Channel ID is correct.
      ${!READ_API_KEY || READ_API_KEY === 'YOUR_READ_API_KEY' ? 'If your channel is private, add the Read API Key.' : ''}
      </small>
    </div>
  `;
  entryInfoDiv.textContent = '⚠️ Error loading data. Check console for details.';
}

// Render fields on the page
function renderData(feedEntry) {
  if (!feedEntry) {
    showError('No data received from ThingSpeak.');
    return;
  }

  const entryId = feedEntry.entry_id || 'N/A';
  const createdAt = feedEntry.created_at ? new Date(feedEntry.created_at).toLocaleString() : 'Unknown time';
  
  let cardsHtml = '';
  let hasAnyData = false;
  
  for (let i = 1; i <= FIELDS_COUNT; i++) {
    const fieldKey = `field${i}`;
    let value = feedEntry[fieldKey];
    
    const hasValue = (value !== null && value !== undefined && value !== '');
    if (hasValue) hasAnyData = true;
    
    const displayValue = hasValue ? value : '—';
    const meta = FIELD_META[i] || { name: `Field ${i}`, unit: '', icon: '📟' };
    
    cardsHtml += `
      <div class="data-card">
        <div class="field-label">${meta.icon} ${meta.name} · Field ${i}</div>
        <div class="field-value">
          ${displayValue}
          ${meta.unit && hasValue ? `<span class="field-unit">${meta.unit}</span>` : ''}
        </div>
        <div class="timestamp-small">
          Last recorded: ${createdAt}
        </div>
      </div>
    `;
  }
  
  if (!hasAnyData) {
    cardsHtml = `
      <div class="error" style="grid-column: 1/-1;">
        📭 No sensor data available yet.<br>
        <small>Make sure your device is sending data to ThingSpeak fields 1–${FIELDS_COUNT}.</small>
      </div>
    `;
  }
  
  dataContainer.innerHTML = cardsHtml;
  
  entryInfoDiv.innerHTML = `
    📍 Last entry ID: <strong>${entryId}</strong> &nbsp;|&nbsp;
    🕒 ThingSpeak timestamp: ${createdAt}
  `;
  
  const now = new Date();
  lastUpdateSpan.innerHTML = `🕘 Last update: ${now.toLocaleTimeString()}`;
}

// Main refresh routine
async function refreshData() {
  dataContainer.innerHTML = `<div class="loading"><div class="spinner"></div> Fetching latest data...</div>`;
  entryInfoDiv.textContent = '⏳ Updating...';
  
  const latestEntry = await fetchThingSpeakData();
  if (latestEntry) {
    renderData(latestEntry);
  }
  
  nextRefreshTime = Date.now() + REFRESH_INTERVAL_MS;
  updateCountdownDisplay();
  
  if (countdownInterval) clearInterval(countdownInterval);
  startCountdownTimer();
}

// Update the countdown text every second
function updateCountdownDisplay() {
  const now = Date.now();
  const remainingMs = Math.max(0, nextRefreshTime - now);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
  
  if (remainingMs <= 0) {
    nextRefreshSpan.textContent = '⟳ Refreshing soon...';
  } else {
    nextRefreshSpan.textContent = `⏱️ Next refresh in ${remainingMinutes}m ${remainingSeconds}s`;
  }
}

function startCountdownTimer() {
  updateCountdownDisplay();
  countdownInterval = setInterval(() => {
    const now = Date.now();
    if (now >= nextRefreshTime) {
      refreshData();
    } else {
      updateCountdownDisplay();
    }
  }, 1000);
}

// Auto-refresh every 10 minutes
let autoRefreshInterval = null;

function startAutoRefreshTimer() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    refreshData();
  }, REFRESH_INTERVAL_MS);
}

// Manual refresh button
refreshBtn.addEventListener('click', () => {
  refreshData();
});

// Initialize everything
function init() {
  if (CHANNEL_ID === 'YOUR_CHANNEL_ID') {
    dataContainer.innerHTML = `<div class="error" style="grid-column:1/-1;">
      🔧 <strong>Configuration required</strong><br>
      Edit the JavaScript section: set CHANNEL_ID to your ThingSpeak channel ID.<br>
      ${READ_API_KEY === 'YOUR_READ_API_KEY' ? '<small>If your channel is private, also set READ_API_KEY.</small>' : ''}
    </div>`;
    entryInfoDiv.textContent = '⚙️ Please configure CHANNEL_ID in the code.';
    return;
  }
  
  refreshData();
  startAutoRefreshTimer();
  startCountdownTimer();
}

// Run initialization
init();