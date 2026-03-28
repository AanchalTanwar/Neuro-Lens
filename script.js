/**
 * NeuroLens — script.js
 * Shared logic and state management (simulates a backend via localStorage)
 */

// =====================================================
// SHARED STATE OBJECT (written to localStorage for cross-page sync)
// =====================================================

const NL = {
  PATIENT_KEY: 'nl_patient_state',
  ALERTS_KEY: 'nl_alerts',
  REMINDERS_KEY: 'nl_reminders',
  FACE_LOG_KEY: 'nl_face_log',

  /** Return the current shared state */
  getState() {
    try {
      return JSON.parse(localStorage.getItem(this.PATIENT_KEY)) || this.defaultState();
    } catch { return this.defaultState(); }
  },

  /** Write a new state object */
  setState(state) {
    localStorage.setItem(this.PATIENT_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('nl:stateChange', { detail: state }));
  },

  /** Patch specific keys in state */
  patchState(patch) {
    const state = this.getState();
    const updated = { ...state, ...patch };
    this.setState(updated);
    return updated;
  },

  defaultState() {
    return {
      patient: 'Shanti Devi',
      guardian: 'Aanchal',
      activity: 'Idle',
      location: { lat: 28.6139, lng: 77.2090, label: 'Near Home — New Delhi' },
      inSafeZone: true,
      safeRadius: 200,
      lastFace: null,
      emergencyActive: false,
      demoMode: false,
    };
  },

  // ---- ALERTS ----
  getAlerts() {
    try { return JSON.parse(localStorage.getItem(this.ALERTS_KEY)) || []; }
    catch { return []; }
  },
  addAlert(type, title, message) {
    const alerts = this.getAlerts();
    const alert = {
      id: Date.now(),
      type, title, message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      read: false,
    };
    alerts.unshift(alert);
    // Keep last 50
    if (alerts.length > 50) alerts.pop();
    localStorage.setItem(this.ALERTS_KEY, JSON.stringify(alerts));
    window.dispatchEvent(new CustomEvent('nl:newAlert', { detail: alert }));
    return alert;
  },
  clearAlerts() {
    localStorage.setItem(this.ALERTS_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('nl:alertsCleared'));
  },

  // ---- REMINDERS ----
  getReminders() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.REMINDERS_KEY));
      if (stored) return stored;
    } catch {}
    // Default reminders
    return [
      { id: 1, type: 'medicine', icon: 'fa-pills', iconClass: 'medicine', msg: 'Take BP tablet', time: '08:00' },
      { id: 2, type: 'food',     icon: 'fa-bowl-food', iconClass: 'food',    msg: 'Lunch time',      time: '13:00' },
      { id: 3, type: 'medicine', icon: 'fa-pills', iconClass: 'medicine', msg: 'Evening medicine', time: '17:00' },
    ];
  },
  addReminder(reminder) {
    const reminders = this.getReminders();
    reminder.id = Date.now();
    reminders.push(reminder);
    localStorage.setItem(this.REMINDERS_KEY, JSON.stringify(reminders));
    window.dispatchEvent(new CustomEvent('nl:reminderAdded', { detail: reminder }));
  },
  deleteReminder(id) {
    let reminders = this.getReminders();
    reminders = reminders.filter(r => r.id !== id);
    localStorage.setItem(this.REMINDERS_KEY, JSON.stringify(reminders));
    window.dispatchEvent(new CustomEvent('nl:reminderDeleted', { detail: { id } }));
  },

  // ---- FACE LOG ----
  getFaceLog() {
    try { return JSON.parse(localStorage.getItem(this.FACE_LOG_KEY)) || {}; }
    catch { return {}; }
  },
  logFace(name) {
    const log = this.getFaceLog();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    log[name] = `${dateStr} at ${timeStr}`;
    localStorage.setItem(this.FACE_LOG_KEY, JSON.stringify(log));
    this.patchState({ lastFace: name });
    window.dispatchEvent(new CustomEvent('nl:faceLogged', { detail: { name, time: `${dateStr} at ${timeStr}` } }));
  },
};

// =====================================================
// CLOCK UTILITY
// =====================================================
function startClock(elementId) {
  function updateClock() {
    const el = document.getElementById(elementId);
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// =====================================================
// TOAST NOTIFICATION UTILITY
// =====================================================
function showToast(containerId, type, title, message, duration = 4000) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const icons = { success: 'fa-circle-check', danger: 'fa-triangle-exclamation', info: 'fa-circle-info', warning: 'fa-bell' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="toast-icon fa-solid ${icons[type] || icons.info}"></i>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// =====================================================
// SPEECH SYNTHESIS UTILITY
// =====================================================
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  // Try to pick a female voice
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google UK English Female'));
  if (femaleVoice) utterance.voice = femaleVoice;
  window.speechSynthesis.speak(utterance);
}

// Load voices on page load (browsers may lazy-load)
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { speechSynthesis.getVoices(); };
}

// =====================================================
// INITIALISE DEFAULT STATE IF FRESH
// =====================================================
(function initDefaultState() {
  if (!localStorage.getItem(NL.PATIENT_KEY)) {
    NL.setState(NL.defaultState());
  }
})();
