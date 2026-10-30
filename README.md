<h1 align="center">
  <br />
  🔱 Trinetra
  <br />
</h1>

<h3 align="center">AI-Powered Public Safety Platform for Large-Scale Events</h3>

<p align="center">
  Real-time crowd intelligence · Weapon detection · Disaster prediction · Missing person tracing · Emergency response
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-React%20Native-blue?logo=expo&style=flat-square" />
  <img src="https://img.shields.io/badge/Flask-Python-lightgrey?logo=flask&style=flat-square" />
  <img src="https://img.shields.io/badge/Gemini-Vision%20AI-orange?logo=google&style=flat-square" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-yellow?logo=firebase&style=flat-square" />
  <img src="https://img.shields.io/badge/YOLO-Person%20Detection-red?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## Overview

Trinetra ("three eyes" in Sanskrit) is a full-stack, AI-first public safety platform purpose-built for high-density events — pilgrimages, melas, and mass gatherings like Pandharpur Wari and Mahakumbh. It gives authorities a single pane of glass to monitor crowds, detect threats, predict disasters, and coordinate emergency response in real time.

The system is split across five independent services that work together:

| Service | What it does |
|---|---|
| `app/` | Expo React Native mobile app for citizens and field admins |
| `client/` | Vite + React web dashboard for command-centre operators |
| `gundetection/` | Flask microservice — weapon & threat detection via Gemini Vision |
| `backend-disaster/` | Flask microservice — disaster prediction, weather, earthquake, satellite |
| `lost-and-found/` | Flask microservice — YOLO-based missing person detection |
| `landing/` | Next.js public marketing site |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
│  ┌──────────────────┐          ┌──────────────────────────┐ │
│  │  Expo Mobile App │          │  Vite React Web Dashboard│ │
│  │  (citizens +     │          │  (command centre admins) │ │
│  │   field admins)  │          └──────────────────────────┘ │
│  └──────────────────┘                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ Firebase Auth + Firestore
            ┌──────────────┼──────────────┐
            │              │              │
   ┌────────▼─────┐ ┌──────▼──────┐ ┌───▼──────────────────┐
   │ Crowd Agent  │ │ Disaster    │ │ Weapon Detection     │
   │ (Agno/Gemini)│ │ Prediction  │ │ (Gemini Vision)      │
   │ Port 5000    │ │ Port 5001   │ │ Port 5002            │
   └──────────────┘ └─────────────┘ └──────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Lost & Found│
                    │ (YOLO)      │
                    │ Port 5003   │
                    └─────────────┘
```

---

## Features

### 🧠 AI Detection Engine
- **Weapon & Threat Detection** — Gemini 2.5 Flash analyses CCTV frames to classify guns, knives, fire, fighting, and suspicious behaviour. Returns per-frame risk level (`safe → anomaly → danger → critical`) with screenshot evidence.
- **Crowd Density Analysis** — Agno LLM agent powered by Gemini 1.5 Flash processes video frames and returns structured crowd assessments: headcount estimate, stampede risk, police/medical staffing recommendations, and chokepoint detection.
- **Face Recognition / Missing Persons** — YOLO-v8 person detector combined with face embeddings to match uploaded reference photos against CCTV footage. Powers both the app's missing person reporting and the admin search portal.

### 🗺️ Live Geofenced Map
- Real-time location tracking for citizens attending events
- Geofence zones with automatic breach alerts sent to family contacts
- Evacuation route overlays, assembly points, and facility finder
- Google Maps integration on iOS/Android with offline fallback

### 🌩️ Disaster Prediction
- **Weather** — OpenWeatherMap current conditions + 5-day forecast with configurable alert thresholds
- **Earthquakes** — USGS public feed with magnitude filtering and proximity-to-event checks
- **Satellite Imagery** — Sentinel Hub flood analysis and terrain mapping via bounding box queries
- **Risk Score Engine** — Composite risk calculation across weather, seismic, crowd, and traffic signals, broadcast over WebSocket to all connected dashboards
- **SOS Reporting** — Pilgrim distress reports geotagged and surfaced to admin in real time

### 🏥 Medical & Emergency Response
- Ambulance dispatch request flow with live status tracking
- Nearby hospital lookup with geo-radius query
- Doctor video queue for remote triage (VideoSDK integration)
- Emergency offline mode — core SOS works without internet

### 🔍 Lost & Found
- Citizens upload a photo of a missing person; YOLO detects and crops all persons from crowd footage
- Face similarity matching returns top candidates with confidence scores
- Admin portal to manage reports, update status, and reunite families

---

## Repository Structure

```
trinetra/
├── app/                          # Expo React Native mobile app
│   ├── app/                      # Expo Router screens
│   │   ├── (tabs)/               # Citizen-facing tab screens
│   │   ├── (adminTabs)/          # Field admin tab screens
│   │   ├── (medicalAdminTabs)/   # Medical admin screens
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── lib/                      # Firebase, hospital, notification services
│   ├── components/               # Shared UI primitives
│   ├── app.py                    # Crowd analysis LLM agent (Flask)
│   └── app.json                  # Expo app manifest
│
├── client/                       # Vite + React web dashboard
│   └── src/
│       ├── pages/                # All dashboard pages
│       │   ├── disaster/         # Disaster module sub-pages
│       │   ├── medical/          # Medical module sub-pages
│       │   └── doctor/           # Doctor portal sub-pages
│       ├── components/           # Shared layout, UI, animated components
│       └── context/              # AuthContext, DisasterDataContext
│
├── gundetection/                 # Weapon/threat detection microservice
│   ├── main.py                   # Flask API + Gemini Vision pipeline
│   ├── requirements.txt
│   └── render.yaml
│
├── backend-disaster/             # Disaster prediction microservice
│   ├── app.py                    # Flask REST API + WebSocket
│   ├── config.py                 # City configs, API keys, thresholds
│   └── services/
│       ├── weather_service.py
│       ├── earthquake_service.py
│       ├── satellite_service.py
│       ├── crowd_service.py
│       ├── traffic_service.py
│       ├── alert_service.py
│       ├── pilgrim_service.py
│       └── data_store.py         # SQLite persistence layer
│
├── lost-and-found/               # YOLO person detection microservice
│   ├── app.py                    # Flask API
│   ├── person_detector.py        # YOLOv8 + face matching logic
│   └── Dockerfile
│
└── landing/                      # Next.js public landing page
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Auth + Firestore enabled

---

### 1. Mobile App (`app/`)

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go on iOS or Android, or press `a` for Android emulator / `i` for iOS simulator.

**Key environment variables** — set inside `app.json` or via EAS:
```
GOOGLE_MAPS_API_KEY=...
FIREBASE_API_KEY=...
```

---

### 2. Web Dashboard (`client/`)

```bash
cd client
npm install
npm run dev           # starts at http://localhost:5173
```

---

### 3. Weapon Detection Service (`gundetection/`)

```bash
cd gundetection
pip install -r requirements.txt
cp env.example .env   # fill in GEMINI_API_KEY
python main.py        # runs on port 5002
```

**Endpoints:**
- `POST /analyze` — upload image or video; returns per-frame threat analysis
- `GET /health` — service health check

---

### 4. Disaster Prediction Service (`backend-disaster/`)

```bash
cd backend-disaster
pip install -r requirements.txt
cp env.example .env   # fill in OPENWEATHER_API_KEY, GOOGLE_MAPS_API_KEY, SENTINEL_HUB_CLIENT_ID/SECRET
python app.py         # runs on port 5001
```

**Key endpoints:**
```
GET  /api/dashboard          — full dashboard snapshot
GET  /api/weather            — current weather
GET  /api/earthquakes        — USGS seismic data
GET  /api/crowd/stampede-risk
GET  /api/satellite/flood-analysis
POST /api/pilgrim/sos        — submit SOS report
WS   /socket.io              — real-time dashboard updates
```

---

### 5. Lost & Found Service (`lost-and-found/`)

```bash
cd lost-and-found
pip install -r requirements.txt
python app.py         # runs on port 5003
```

Or with Docker:
```bash
docker build -t trinetra-laf .
docker run -p 5003:5003 trinetra-laf
```

---

### 6. Landing Page (`landing/`)

```bash
cd landing
npm install
npm run dev           # starts at http://localhost:3000
```

---

## Deployment

All Python microservices include a `render.yaml` for one-click deployment on [Render](https://render.com). The `lost-and-found` service also ships with a `Dockerfile` and `Procfile` for Heroku/Railway.

| Service | Deployed URL |
|---|---|
| Weapon Detection | `https://gun-detection.onrender.com` |
| Disaster Prediction | configure via `REACT_APP_DISASTER_API` |
| Lost & Found | configure via `REACT_APP_LAF_API` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo (React Native), Expo Router, TypeScript |
| Web Dashboard | Vite, React, TypeScript, Tailwind CSS, shadcn/ui |
| Landing Page | Next.js 15, TypeScript |
| AI / LLM | Google Gemini 2.5 Flash (vision), Agno agent framework |
| Computer Vision | OpenCV, YOLOv8 (Ultralytics) |
| Backend | Flask, Flask-SocketIO, Flask-CORS, Gunicorn |
| Database | Firebase Firestore (app data), SQLite (disaster events) |
| Auth | Firebase Authentication |
| Maps | Google Maps (mobile + web) |
| External APIs | OpenWeatherMap, USGS Earthquake, Sentinel Hub, Cloudinary |
| Push Notifications | Expo Push Notification Service |
| Deployment | Render, Docker, Railway |

---

## Environment Variables Reference

### `gundetection/.env`
```env
GEMINI_API_KEY=your_key
PORT=5002
```

### `backend-disaster/.env`
```env
OPENWEATHER_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
SENTINEL_HUB_CLIENT_ID=your_id
SENTINEL_HUB_CLIENT_SECRET=your_secret
SECRET_KEY=your_flask_secret
DEFAULT_CITY=pandharpur
```

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request

---

## License

MIT © 2025 Samarth Kolarkar

---

<p align="center">Built for MahaKumbh · Pandharpur Wari · and every gathering where safety can't wait.</p>
