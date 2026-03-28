/**
 * NeuroLens — patient.js
 * Patient interface logic: camera, voice, location, navigation, emergency
 */

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  startClock('patient-clock');
  initLocation();
  loadNextReminder();
  listenForGuardianReminders();
  autoSimulateAfterDelay();
});

// =====================================================
// CAMERA & FACE RECOGNITION
// =====================================================
let cameraStream = null;
let recognitionTimeout = null;

/** Start webcam feed */
function startCamera() {
  const video = document.getElementById('patient-video');
  const placeholder = document.getElementById('camera-placeholder');
  const overlay = document.getElementById('face-overlay');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(stream => {
      cameraStream = stream;
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      overlay.style.display = 'flex';
      // Start auto-scanning simulation
      startAutoScan();
    })
    .catch(() => {
      // Camera not available — show simulated camera
      placeholder.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <i class="fa-solid fa-camera-slash fa-2x" style="color:var(--text3);margin-bottom:12px;display:block;"></i>
          <p style="color:var(--text2);margin-bottom:16px;">Camera not available.<br>Use the face chips below to simulate recognition.</p>
        </div>`;
      overlay.style.display = 'flex';
      simulateVideoBackground();
    });
}

/** Animated gradient background when no camera */
function simulateVideoBackground() {
  const container = document.querySelector('.camera-container');
  container.style.background = 'linear-gradient(135deg, #0a1628, #0f2035, #0a1628)';
  container.style.backgroundSize = '200% 200%';
  container.style.animation = 'gradientShift 4s ease infinite';
  if (!document.getElementById('cam-style')) {
    const style = document.createElement('style');
    style.id = 'cam-style';
    style.textContent = '@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}';
    document.head.appendChild(style);
  }
}

/** Auto scan every 12 seconds after camera starts */
function startAutoScan() {
  const faces = ['Riya (Daughter)', 'Rajesh (Son)', 'Aanchal (Guardian)'];
  setTimeout(() => {
    const randomFace = faces[Math.floor(Math.random() * faces.length)];
    simulateRecognize(randomFace, 'fa-user', 'var(--primary)');
  }, 3000);
}

/**
 * Simulates recognizing a person
 * @param {string} name - Person's name
 * @param {string} icon - FA icon
 * @param {string} color - Color hint
 */
function simulateRecognize(name, icon, color) {
  const overlay = document.getElementById('face-overlay');
  const tag = document.getElementById('face-tag');
  const placeholder = document.getElementById('camera-placeholder');

  // Hide placeholder and show overlay if not started
  placeholder.style.display = 'none';
  overlay.style.display = 'flex';

  // Scanning phase
  tag.textContent = 'Scanning...';
  tag.style.background = 'rgba(255,255,255,0.15)';
  tag.style.color = '#fff';

  if (recognitionTimeout) clearTimeout(recognitionTimeout);
  recognitionTimeout = setTimeout(() => {
    // Recognition result
    tag.textContent = `👤 ${name}`;
    tag.style.background = 'rgba(78,205,196,0.9)';
    tag.style.color = '#000';

    // Speak the name
    speak(`This is ${name}`);

    // Log to shared state
    NL.logFace(name);
    NL.addAlert('face', 'Face Recognised', `Camera identified: ${name}`);

    // Show toast
    showToast('patient-toast-container', 'info', 'Face Recognised', `This is ${name}`);

    // Send activity update
    NL.patchState({ activity: 'Interacting' });

    // Clear after 5s
    recognitionTimeout = setTimeout(() => {
      tag.textContent = 'Scanning area...';
      tag.style.background = 'rgba(255,255,255,0.1)';
      tag.style.color = '#fff';
    }, 5000);
  }, 2000);
}

// =====================================================
// VOICE ASSISTANT
// =====================================================
const voiceResponses = {
  medicine: {
    text: 'Your next medicine is the BP tablet at 8 AM. Remember to take it with water.',
    display: '💊 Your next medicine is the BP tablet at 8 AM. Remember to take it with water.',
  },
  location: {
    text: 'You are currently at home in New Delhi. You are in a safe area.',
    display: '📍 You are at home in New Delhi. You are in a safe area.',
  },
  time: {
    text: () => `The time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
    display: () => `🕐 It is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`,
  },
  family: {
    text: 'Your family includes your daughter Riya, your son Rajesh, and your caregiver Aanchal. They love you very much.',
    display: '👨‍👩‍👧 Your family: Riya (Daughter), Rajesh (Son), Aanchal (Guardian). They love you! ❤️',
  },
};

/** Trigger a voice assistant response */
function askAssistant(key) {
  const resp = voiceResponses[key];
  if (!resp) return;

  const responseEl = document.getElementById('voice-response-text');
  const display = typeof resp.display === 'function' ? resp.display() : resp.display;
  const text    = typeof resp.text   === 'function' ? resp.text()   : resp.text;

  // Visual feedback
  responseEl.innerHTML = `<em style="color:var(--primary)">Thinking...</em>`;

  setTimeout(() => {
    responseEl.textContent = display;
    speak(text);
    // Brief ripple on the response box
    const box = document.getElementById('voice-response');
    box.style.borderColor = 'var(--primary)';
    setTimeout(() => { box.style.borderColor = ''; }, 1500);
  }, 600);
}

// =====================================================
// LOCATION
// =====================================================
function initLocation() {
  const statusEl  = document.getElementById('location-status');
  const coordsEl  = document.getElementById('location-coords');

  if (!navigator.geolocation) {
    statusEl.textContent = 'Near Home — New Delhi';
    coordsEl.textContent = '28.6139° N, 77.2090° E';
    NL.patchState({ location: { lat: 28.6139, lng: 77.2090, label: 'Near Home — New Delhi' } });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(4);
      const lng = pos.coords.longitude.toFixed(4);
      statusEl.textContent = 'You are near Home';
      coordsEl.textContent = `${lat}° N, ${lng}° E`;
      NL.patchState({ location: { lat: parseFloat(lat), lng: parseFloat(lng), label: 'Near Home' } });
    },
    () => {
      // Fallback to New Delhi coords
      statusEl.textContent = 'Near Home — New Delhi';
      coordsEl.textContent = '28.6139° N, 77.2090° E';
      NL.patchState({ location: { lat: 28.6139, lng: 77.2090, label: 'Near Home — New Delhi' } });
    }
  );

  // Simulate slight drift every 30s for demo realism
  setInterval(simulateLocationDrift, 30000);
}

/** Simulates small location movements */
function simulateLocationDrift() {
  const state = NL.getState();
  const lat = state.location.lat + (Math.random() - 0.5) * 0.001;
  const lng = state.location.lng + (Math.random() - 0.5) * 0.001;
  NL.patchState({ location: { lat, lng, label: state.location.label }, activity: pickRandomActivity() });
}

function pickRandomActivity() {
  const acts = ['Idle', 'Walking', 'Resting', 'At Home'];
  return acts[Math.floor(Math.random() * acts.length)];
}

// =====================================================
// NAVIGATION
// =====================================================
let navActive = false;
function navigateHome() {
  const stepsEl = document.getElementById('nav-steps');
  navActive = !navActive;

  if (navActive) {
    stepsEl.style.display = 'block';
    speak('I will guide you home. Walk straight for 50 metres, then turn right at the gate. Your home is on the left.');
    // Animate steps one by one
    const steps = stepsEl.querySelectorAll('.nav-step');
    steps.forEach(s => s.classList.remove('active'));
    let i = 0;
    const stepInterval = setInterval(() => {
      if (i < steps.length) { steps[i].classList.add('active'); i++; }
      else clearInterval(stepInterval);
    }, 2500);
    showToast('patient-toast-container', 'info', 'Navigation Started', 'Guiding you home…');
  } else {
    stepsEl.style.display = 'none';
  }
}

// =====================================================
// EMERGENCY
// =====================================================
function triggerEmergency() {
  const btn = document.getElementById('emergency-btn');

  // Prevent double triggers
  if (btn.dataset.triggered === 'true') return;
  btn.dataset.triggered = 'true';
  btn.style.opacity = '0.7';

  // Write emergency to shared state
  NL.patchState({ emergencyActive: true });
  NL.addAlert('emergency', '🚨 EMERGENCY', 'Shanti Devi pressed the emergency button!');

  // Play alert sound (oscillator beep)
  playAlertBeep();

  speak('Emergency alert sent to Aanchal. Help is on the way. Please stay calm.');
  showToast('patient-toast-container', 'danger', 'Emergency Sent!', 'Aanchal has been alerted. Stay calm.');

  setTimeout(() => {
    btn.dataset.triggered = 'false';
    btn.style.opacity = '1';
    NL.patchState({ emergencyActive: false });
  }, 30000);
}

/** Plays a beep sound using Web Audio API */
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.4 + 0.3);
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 0.3);
    }
  } catch(e) { /* Audio not available */ }
}

// =====================================================
// REMINDERS — sync from guardian
// =====================================================
function loadNextReminder() {
  const reminders = NL.getReminders();
  const chip = document.getElementById('next-reminder-text');
  if (!chip) return;

  if (!reminders.length) { chip.textContent = 'No reminders'; return; }

  // Find the next upcoming reminder
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  let next = reminders.find(r => {
    if (!r.time) return false;
    const [h, m] = r.time.split(':').map(Number);
    return (h * 60 + m) >= nowMins;
  }) || reminders[0];

  const timeStr = next.time
    ? new Date(`2000-01-01T${next.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';
  chip.textContent = `${next.msg}${timeStr ? ' at ' + timeStr : ''}`;
}

/** Poll for new reminders from guardian */
function listenForGuardianReminders() {
  window.addEventListener('nl:reminderAdded', (e) => {
    loadNextReminder();
    showToast('patient-toast-container', 'warning', 'New Reminder', e.detail.msg);
    speak(`Reminder from Aanchal: ${e.detail.msg}`);
  });
  // Also poll storage changes from other tab
  window.addEventListener('storage', (e) => {
    if (e.key === NL.REMINDERS_KEY) loadNextReminder();
    if (e.key === NL.ALERTS_KEY) {} // guardian writes, no action here
  });
}

// =====================================================
// AUTO-DEMO (after 8 seconds, simulate recognition if camera not started)
// =====================================================
function autoSimulateAfterDelay() {
  setTimeout(() => {
    const placeholder = document.getElementById('camera-placeholder');
    if (placeholder && placeholder.style.display !== 'none') {
      // Camera not started — simulate a recognition
      simulateRecognize('Riya (Daughter)', 'fa-heart', '#ff6b9d');
    }
  }, 8000);
}
