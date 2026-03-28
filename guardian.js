/**
 * NeuroLens — guardian.js
 * Guardian dashboard logic: maps, alerts, reminders, geofencing, demo mode
 */

// =====================================================
// STATE
// =====================================================
let miniMap = null;
let fullMap = null;
let patientMarker = null;
let patientMarkerFull = null;
let safeCircle = null;
let safeCircleFull = null;
let demoInterval = null;
let demoModeActive = false;
let alertCount = 0;
let activityLog = [];

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  startClock('guardian-clock');
  initMaps();
  renderAlerts();
  renderReminders();
  renderFaceLog();
  startPolling();
  listenForCrossTabEvents();
  updateStatCards();

  // Log initial activity
  logActivity('System started');
  logActivity('Patient monitoring active');
});

// =====================================================
// MAPS (Leaflet.js)
// =====================================================
function initMaps() {
  const state = NL.getState();
  const lat = state.location?.lat || 28.6139;
  const lng = state.location?.lng || 77.2090;

  // Mini map (overview tab)
  miniMap = L.map('mini-map', { zoomControl: false, scrollWheelZoom: false, dragging: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 18
  }).addTo(miniMap);
  miniMap.setView([lat, lng], 15);

  // Full map
  fullMap = L.map('full-map', { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 18
  }).addTo(fullMap);
  fullMap.setView([lat, lng], 15);

  // Custom marker icon
  const markerIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:44px;height:44px;
      background:linear-gradient(135deg,#4ecdc4,#2ab5ac);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 20px rgba(78,205,196,0.5);
      border:3px solid #fff;
      font-size:18px;
    ">👵</div>
    <div style="
      position:absolute;top:48px;left:50%;transform:translateX(-50%);
      background:#4ecdc4;color:#000;
      padding:3px 10px;border-radius:100px;
      font-size:11px;font-weight:700;white-space:nowrap;
    ">Shanti Devi</div>`,
    iconSize: [44, 70],
    iconAnchor: [22, 22],
  });

  patientMarker = L.marker([lat, lng], { icon: markerIcon }).addTo(miniMap);
  patientMarkerFull = L.marker([lat, lng], { icon: markerIcon }).addTo(fullMap);

  // Safe zone circles
  const radius = state.safeRadius || 200;
  safeCircle = L.circle([lat, lng], {
    radius, color: '#4ecdc4', fillColor: '#4ecdc4',
    fillOpacity: 0.08, weight: 2, dashArray: '6,6'
  }).addTo(miniMap);

  safeCircleFull = L.circle([lat, lng], {
    radius, color: '#4ecdc4', fillColor: '#4ecdc4',
    fillOpacity: 0.08, weight: 2, dashArray: '6,6'
  }).addTo(fullMap);

  updateMapCoords(lat, lng);
}

/** Centre the full map on patient */
function centerMap() {
  const state = NL.getState();
  if (fullMap) fullMap.setView([state.location.lat, state.location.lng], 15);
}

/** Update the patient marker position on both maps */
function updateMarkers(lat, lng) {
  if (patientMarker) patientMarker.setLatLng([lat, lng]);
  if (patientMarkerFull) patientMarkerFull.setLatLng([lat, lng]);
  miniMap?.panTo([lat, lng]);
  updateMapCoords(lat, lng);
}

function updateMapCoords(lat, lng) {
  const coordEl = document.getElementById('map-coord-mini');
  if (coordEl) coordEl.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

/** Update geofence radius from slider */
function updateRadius(val) {
  document.getElementById('radius-val').textContent = `${val}m`;
  document.getElementById('safe-radius').textContent = `${val}m`;
  if (safeCircle) safeCircle.setRadius(parseInt(val));
  if (safeCircleFull) safeCircleFull.setRadius(parseInt(val));
  NL.patchState({ safeRadius: parseInt(val) });
}

// =====================================================
// STAT CARDS
// =====================================================
function updateStatCards() {
  const state = NL.getState();
  setEl('ov-location', state.location?.label || 'Home Zone');
  setEl('ov-activity', state.activity || 'Idle');
  setEl('ov-alerts', alertCount);
  setEl('ov-safe', state.inSafeZone ? 'Safe ✅' : 'Outside ⚠️');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// =====================================================
// ALERTS
// =====================================================
function renderAlerts() {
  const alerts = NL.getAlerts();
  alertCount = alerts.length;
  updateAlertBadge();
  renderAlertsList(alerts, 'overview-alerts-list', 3);
  renderAlertsList(alerts, 'full-alerts-list', 100);
  setEl('ov-alerts', alertCount);
  setEl('unread-count', `${alerts.filter(a => !a.read).length} new`);
}

function renderAlertsList(alerts, containerId, max) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!alerts.length) {
    el.innerHTML = `<li class="no-alerts-msg">No alerts yet. System is calm 🌿</li>`;
    return;
  }

  const iconMap = { emergency: 'fa-triangle-exclamation', geofence: 'fa-map-pin', face: 'fa-eye' };

  el.innerHTML = alerts.slice(0, max).map(a => `
    <li class="alert-item" data-type="${a.type}">
      <div class="alert-icon ${a.type}">
        <i class="fa-solid ${iconMap[a.type] || 'fa-bell'}"></i>
      </div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-meta">${a.message}</div>
      </div>
      <div class="alert-time">${a.time}</div>
    </li>`).join('');
}

function updateAlertBadge() {
  const badge = document.getElementById('alerts-badge');
  if (badge) {
    badge.textContent = alertCount;
    badge.style.display = alertCount > 0 ? 'inline-block' : 'none';
  }
}

function clearAlerts() {
  NL.clearAlerts();
  alertCount = 0;
  renderAlerts();
  showToast('guardian-toast-container', 'info', 'Cleared', 'All alerts have been cleared.');
}

function filterAlerts(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const alerts = NL.getAlerts();
  const filtered = type === 'all' ? alerts : alerts.filter(a => a.type === type);
  renderAlertsList(filtered, 'full-alerts-list', 100);
}

// =====================================================
// REMINDERS
// =====================================================
function renderReminders() {
  const reminders = NL.getReminders();
  const list = document.getElementById('reminders-list');
  if (!list) return;

  const iconMap = {
    medicine: ['fa-pills', 'medicine'],
    food:     ['fa-bowl-food', 'food'],
    exercise: ['fa-person-walking', 'exercise'],
    appointment: ['fa-hospital', 'appointment'],
    custom:   ['fa-note-sticky', 'medicine'],
  };

  list.innerHTML = reminders.map(r => {
    const [icon, cls] = iconMap[r.type] || iconMap.custom;
    const timeStr = r.time
      ? new Date(`2000-01-01T${r.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      : '—';
    return `
      <li class="reminder-item" id="ri-${r.id}">
        <div class="ri-icon ${cls}"><i class="fa-solid ${icon}"></i></div>
        <div class="ri-info">
          <div class="ri-msg">${r.msg}</div>
          <div class="ri-time"><i class="fa-regular fa-clock"></i> ${timeStr}</div>
        </div>
        <div class="ri-status sent">Synced</div>
        <button class="ri-delete-btn" onclick="deleteReminder(${r.id})" title="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </li>`;
  }).join('') || '<li class="no-alerts-msg">No reminders added yet.</li>';
}

function addReminder() {
  const type = document.getElementById('reminder-type').value;
  const msg  = document.getElementById('reminder-msg').value.trim();
  const time = document.getElementById('reminder-time').value;

  if (!msg) {
    showToast('guardian-toast-container', 'warning', 'Empty Reminder', 'Please enter a reminder message.');
    return;
  }

  NL.addReminder({ type, msg, time });
  renderReminders();
  showToast('guardian-toast-container', 'success', 'Reminder Sent', `"${msg}" synced to patient.`);
  logActivity(`Reminder added: ${msg}`);

  // Clear form
  document.getElementById('reminder-msg').value = '';
  document.getElementById('reminder-time').value = '';
}

function deleteReminder(id) {
  NL.deleteReminder(id);
  renderReminders();
  showToast('guardian-toast-container', 'info', 'Reminder Deleted', 'Reminder removed from patient view.');
}

// =====================================================
// FACE LOG
// =====================================================
function renderFaceLog() {
  const log = NL.getFaceLog();

  const faces = [
    { key: 'Riya (Daughter)', id: 'riya-last' },
    { key: 'Rajesh (Son)', id: 'rajesh-last' },
    { key: 'Aanchal (Guardian)', id: 'aanchal-last' },
  ];

  faces.forEach(({ key, id }) => {
    const el = document.getElementById(id);
    if (el) el.textContent = log[key] ? `Last seen: ${log[key]}` : 'Not seen yet';
  });

  // Overview face log
  const overviewLog = document.getElementById('overview-face-log');
  if (overviewLog) {
    const items = overviewLog.querySelectorAll('.fl-time');
    items.forEach((el, i) => {
      const key = faces[i]?.key;
      if (key && log[key]) el.textContent = `Last seen: ${log[key]}`;
    });
  }
}

// =====================================================
// EMERGENCY HANDLING
// =====================================================
function showEmergencyModal(state) {
  const modal = document.getElementById('emergency-modal');
  const meta  = document.getElementById('em-meta');
  modal.classList.add('active');

  const { lat, lng, label } = state.location || {};
  if (meta) meta.textContent = `📍 Location: ${label || `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}`;

  // Play alert beep
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.5 + 0.4);
      osc.start(ctx.currentTime + i * 0.5);
      osc.stop(ctx.currentTime + i * 0.5 + 0.4);
    }
  } catch(e) {}
}

function dismissEmergency() {
  const modal = document.getElementById('emergency-modal');
  modal.classList.remove('active');
  NL.patchState({ emergencyActive: false });
  logActivity('Emergency acknowledged by Aanchal');
  showToast('guardian-toast-container', 'success', 'Alert Acknowledged', 'Emergency has been marked as handled.');
}

function simulateCall() {
  showToast('guardian-toast-container', 'info', 'Calling...', 'Connecting to Shanti Devi…');
  setTimeout(() => {
    showToast('guardian-toast-container', 'success', 'Call Connected', 'Speaking with Shanti Devi.');
  }, 2000);
}

// =====================================================
// GEOFENCING CHECK
// =====================================================
function checkGeofence(lat, lng) {
  const state = NL.getState();
  const center = { lat: state.location?.lat || 28.6139, lng: state.location?.lng || 77.2090 };
  const radius = state.safeRadius || 200;
  const dist = haversineDistance(center.lat, center.lng, lat, lng) * 1000; // metres
  const inZone = dist <= radius;

  if (!inZone && state.inSafeZone) {
    // Just exited!
    NL.patchState({ inSafeZone: false });
    NL.addAlert('geofence', '⚠️ Geofence Alert', 'Shanti Devi has left the safe zone!');
    renderAlerts();
    showToast('guardian-toast-container', 'danger', 'Geofence Breach', 'Patient left the safe zone!');
    logActivity('Patient exited safe zone');
    setZoneChipDanger(true);
  } else if (inZone && !state.inSafeZone) {
    NL.patchState({ inSafeZone: true });
    logActivity('Patient returned to safe zone');
    setZoneChipDanger(false);
  }
}

function setZoneChipDanger(isDanger) {
  ['zone-chip-mini', 'zone-chip-full'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isDanger) {
      el.textContent = 'Outside Safe Zone';
      el.className = 'zone-chip danger';
    } else {
      el.textContent = 'In Safe Zone';
      el.className = 'zone-chip';
    }
  });
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// =====================================================
// ACTIVITY LOG
// =====================================================
function logActivity(desc) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  activityLog.unshift({ time: now, desc });
  if (activityLog.length > 20) activityLog.pop();
  renderActivityLog();
}

function renderActivityLog() {
  const list = document.getElementById('activity-list');
  if (!list) return;
  list.innerHTML = activityLog.map(item => `
    <li class="activity-item">
      <span class="activity-time">${item.time}</span>
      <span class="activity-desc">${item.desc}</span>
    </li>`).join('');
}

// =====================================================
// POLLING — Check shared state every 2 seconds
// =====================================================
let lastEmergencyState = false;
let lastLocation = null;

function startPolling() {
  setInterval(() => {
    const state = NL.getState();

    // Emergency check
    if (state.emergencyActive && !lastEmergencyState) {
      showEmergencyModal(state);
      renderAlerts();
      updateStatCards();
    }
    lastEmergencyState = state.emergencyActive;

    // Location update
    const loc = state.location;
    if (loc && (lastLocation?.lat !== loc.lat || lastLocation?.lng !== loc.lng)) {
      updateMarkers(loc.lat, loc.lng);
      lastLocation = { ...loc };
      setEl('ov-location', loc.label || 'Tracking...');
    }

    // Activity update
    if (state.activity) setEl('ov-activity', state.activity);

    // Geofence check
    if (loc) checkGeofence(loc.lat, loc.lng);

  }, 2000);
}

// =====================================================
// CROSS-TAB EVENTS (localStorage changes from patient tab)
// =====================================================
function listenForCrossTabEvents() {
  window.addEventListener('storage', (e) => {
    if (e.key === NL.ALERTS_KEY) {
      renderAlerts();
      updateStatCards();
      // Show toast for new emergency alerts
      try {
        const alerts = JSON.parse(e.newValue) || [];
        const newest = alerts[0];
        if (newest?.type === 'emergency') {
          showToast('guardian-toast-container', 'danger', '🚨 Emergency!', 'Shanti Devi needs help!', 8000);
          showEmergencyModal(NL.getState());
        } else if (newest?.type === 'face') {
          showToast('guardian-toast-container', 'info', 'Face Recognised', newest.message);
          renderFaceLog();
        }
      } catch {}
    }
    if (e.key === NL.PATIENT_KEY) {
      renderFaceLog();
      updateStatCards();
    }
    if (e.key === NL.FACE_LOG_KEY) {
      renderFaceLog();
    }
  });

  // Also listen for same-tab events
  window.addEventListener('nl:newAlert', (e) => {
    renderAlerts();
    updateStatCards();
  });
  window.addEventListener('nl:faceLogged', (e) => {
    renderFaceLog();
    logActivity(`Face recognised: ${e.detail.name}`);
  });
  window.addEventListener('nl:reminderAdded', () => renderReminders());
  window.addEventListener('nl:reminderDeleted', () => renderReminders());
  window.addEventListener('nl:alertsCleared', () => renderAlerts());
}

// =====================================================
// TAB SWITCHING
// =====================================================
function switchTab(tabName, linkEl) {
  // Content panels
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabName}`)?.classList.add('active');

  // Sidebar links
  if (linkEl) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    linkEl.classList.add('active');
  } else {
    // Find and activate by data-tab
    document.querySelectorAll('.sidebar-link').forEach(l => {
      if (l.dataset.tab === tabName) l.classList.add('active');
      else l.classList.remove('active');
    });
  }

  // Invalidate map size on render (Leaflet needs this)
  if (tabName === 'map') {
    setTimeout(() => { fullMap?.invalidateSize(); }, 100);
  }
}

// =====================================================
// SIDEBAR TOGGLE (mobile)
// =====================================================
function toggleSidebar() {
  const sidebar = document.getElementById('guardian-sidebar');
  sidebar.classList.toggle('open');
}

// =====================================================
// DEMO MODE
// =====================================================
function toggleDemoMode() {
  demoModeActive = !demoModeActive;
  const btn = document.getElementById('demo-btn');
  btn.classList.toggle('active', demoModeActive);
  btn.innerHTML = demoModeActive
    ? '<i class="fa-solid fa-stop"></i> Stop Demo'
    : '<i class="fa-solid fa-wand-magic-sparkles"></i> Demo Mode';

  if (demoModeActive) {
    startDemoMode();
    showToast('guardian-toast-container', 'info', 'Demo Mode On', 'Simulating real-time patient activity…');
  } else {
    stopDemoMode();
    showToast('guardian-toast-container', 'info', 'Demo Mode Off', 'Simulation stopped.');
  }
}

function startDemoMode() {
  const demoEvents = [
    () => {
      const state = NL.getState();
      const lat = state.location.lat + (Math.random() - 0.5) * 0.002;
      const lng = state.location.lng + (Math.random() - 0.5) * 0.002;
      NL.patchState({ location: { lat, lng, label: 'Near Home' }, activity: 'Walking' });
      updateMarkers(lat, lng);
      logActivity('Patient is walking');
    },
    () => {
      const faces = ['Riya (Daughter)', 'Rajesh (Son)', 'Aanchal (Guardian)'];
      const face = faces[Math.floor(Math.random() * faces.length)];
      NL.logFace(face);
      NL.addAlert('face', 'Face Recognised', `Camera identified: ${face}`);
      renderAlerts();
      renderFaceLog();
      showToast('guardian-toast-container', 'info', 'Face Recognised', face);
      logActivity(`Face recognised: ${face}`);
    },
    () => {
      NL.patchState({ activity: 'Idle' });
      logActivity('Patient is idle');
      updateStatCards();
    },
    () => {
      showToast('guardian-toast-container', 'warning', 'Reminder Due', 'Evening medicine time!');
      logActivity('Medicine reminder triggered');
    },
  ];

  let idx = 0;
  demoInterval = setInterval(() => {
    demoEvents[idx % demoEvents.length]();
    idx++;
    updateStatCards();
  }, 3500);
}

function stopDemoMode() {
  if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
}
