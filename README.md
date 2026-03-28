

# 🧠 NeuroLens – Smart Assistance for Alzheimer’s Patients

## 🚀 Overview

**NeuroLens** is a smart assistive system designed to improve the independence and safety of Alzheimer’s patients. It simulates the functionality of AI-powered smart glasses using a **phone-based web application**, making it accessible, affordable, and easy to deploy.

The system provides **real-time guidance, facial recognition assistance, and location tracking**, while enabling guardians to monitor and support patients remotely.

---

## 💡 Problem Statement

Alzheimer’s patients often struggle with:

* Recognizing familiar faces
* Navigating environments
* Remembering daily tasks
* Staying within safe areas

This leads to anxiety, dependency, and safety risks.

---

## 🎯 Solution

NeuroLens bridges this gap by offering:

* 👁️ **Facial Recognition Assistance** – Identifies people and displays their names
* 📍 **Live Location Tracking** – Helps patients stay oriented
* 🎤 **AI Voice Assistant** – Guides patients with reminders and instructions
* 🚨 **Emergency Alerts** – Instant help with one tap
* 👨‍👩‍👧 **Guardian Dashboard** – Real-time monitoring and control

---

## 🏗️ System Architecture

The application consists of two interconnected interfaces:

### 🧓 Patient Interface (Glass Simulation)

* Simulates smart glasses using phone camera
* Displays recognized faces (mock AI)
* Provides voice-based assistance
* Shows location and navigation prompts
* Emergency alert system

### 👨‍👩‍👧 Guardian Interface (Dashboard)

* Tracks patient’s live location
* Monitors activity status
* Receives emergency alerts
* Sets reminders for patient
* Simulates geofencing (safe zones)

---

## 🔗 How It Works

* Built entirely using **HTML, CSS, and JavaScript**
* Uses browser APIs:

  * 📷 Camera (getUserMedia)
  * 📍 Geolocation
  * 🔊 Speech Synthesis
* Data synchronization simulated using:

  * Local Storage / Shared JS State
* Real-time behavior simulated via dynamic updates

---

## 🧪 Demo Data

* **Patient:** Shanti Devi
* **Guardian:** Aanchal
* **Recognized Faces:**

  * Riya (Daughter)
  * Rajesh (Son)

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **APIs Used:**

  * Web Camera API
  * Geolocation API
  * Speech Synthesis API
* **Optional Libraries:**

  * Leaflet.js (for maps)
  * Font Awesome (icons)

---

## 📁 Project Structure

```
/project-root
│── index.html        # Role selection page
│── patient.html      # Patient interface
│── guardian.html     # Guardian dashboard
│── style.css         # Styling
│── script.js         # Shared logic
│── patient.js        # Patient-specific logic
│── guardian.js       # Guardian-specific logic
```

---

## ⚙️ Installation & Setup

1. Download or clone the repository
2. Open the project folder
3. Run `index.html` in any modern browser (Chrome recommended)
4. Allow camera and location permissions

---

## ▶️ Usage

* Select role: **Patient** or **Guardian**
* Patient interface simulates smart glasses experience
* Guardian interface monitors and controls patient activity
* Use **Demo Mode** for simulated real-time interaction

---

## ✨ Key Features

* Elderly-friendly UI (large buttons, simple design)
* Real-time simulated tracking
* Voice feedback for accessibility
* Emergency alert system
* Interactive dashboard for guardians

---

## 🔮 Future Scope

* Real AI-based facial recognition (TensorFlow / OpenCV)
* Integration with wearable smart glasses
* Backend with real-time database (Firebase)
* Advanced health monitoring (heart rate, fall detection)
* Multilingual voice assistant

---

## 🏆 Hackathon Impact

NeuroLens is not just a project — it’s a step toward:

* Restoring independence for patients
* Reducing caregiver stress
* Making assistive tech more accessible

---

## 👩‍💻 Team

* Aanchal Tanwar
* Diya Gupta
* Bhumika Khaim
* Apoorva Jha

---

## ❤️ Acknowledgment

Inspired by real-world challenges faced by Alzheimer’s patients and their families.

---

## 📜 License

This project is for educational and hackathon purposes.
