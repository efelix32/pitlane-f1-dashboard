# 🏎️ Pitlane — F1 Dashboard

> A modern, real-time Formula 1 companion app built with React. Track standings, drivers, circuits, live sessions, and manage your fantasy F1 team — all in one beautifully designed app.

## 🚀 Live Demo
[https://pitlanef1.vercel.app](https://pitlanef1.vercel.app)

---

## 📖 What is it?

Pitlane is a comprehensive Formula 1 dashboard that combines live race data with a stunning dark-mode UI. It's designed to be the go-to app for F1 fans who want real-time information, driver stats, and an immersive experience — all on one screen.

---

## ✨ Features

- 🏁 **Live Dashboard** — Real-time race data powered by the OpenF1 API
- 📊 **Driver & Constructor Standings** — Up-to-date championship tables
- 🧑‍✈️ **Driver Profiles** — Detailed stats, portraits, and team colors for every 2026 driver
- 🗺️ **Race Calendar** — Full 2026 season schedule with circuit details
- ⚔️ **Driver Comparison** — Compare two drivers head-to-head across key metrics
- 🏆 **Fantasy Team** — Build your own fantasy F1 team and run a race simulator
- 👤 **User Profiles** — Save favorite drivers and teams with Firebase Auth
- 🌐 **Progressive Web App** — Installable on mobile, works offline
- 🌓 **Dark / Light Mode** — System-aware theme switching

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 + Vite | Frontend Framework |
| Firebase Auth + Firestore | Authentication & Database |
| OpenF1 API | Live Session Data |
| Jolpica / Ergast API | Historical F1 Data |
| React Router | Client-side Routing |
| CSS (Vanilla) | Custom Styling |
| Vercel | Deployment |

---

## 🔧 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/efelix32/pitlane-f1-dashboard.git
cd pitlane-f1-dashboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root:
```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run locally
```bash
npm run dev
```

---

## 📸 Screenshots

Check out the [live demo](https://pitlanef1.vercel.app) to see it in action.

---

# 🏎️ Pitlane — F1 Gösterge Paneli (Türkçe)

> React ile geliştirilmiş modern ve gerçek zamanlı bir Formula 1 yardımcı uygulaması. Puan durumları, pilotlar, pistler, canlı seanslar ve fantezi F1 takımını tek, güzel tasarımlı bir uygulamada takip et.

## 🚀 Canlı Demo
[https://pitlanef1.vercel.app](https://pitlanef1.vercel.app)

## 📖 Bu Uygulama Nedir?

Pitlane, canlı yarış verilerini çarpıcı bir karanlık mod arayüzüyle birleştiren kapsamlı bir Formula 1 kontrol panelidir. Gerçek zamanlı bilgilere, pilot istatistiklerine ve sürükleyici bir deneyime tek ekranda erişmek isteyen F1 hayranları için tasarlanmıştır.

## ✨ Özellikler

- 🏁 **Canlı Dashboard** — OpenF1 API ile gerçek zamanlı yarış verileri
- 📊 **Pilot ve Takım Sıralamaları** — Güncel şampiyona tabloları
- 🧑‍✈️ **Pilot Profilleri** — 2026 sezonu tüm pilotları için detaylı istatistikler
- 🗺️ **Yarış Takvimi** — Pist detaylarıyla birlikte 2026 sezonu tam takvimi
- ⚔️ **Pilot Karşılaştırması** — İki pilotu temel metriklerde karşılaştır
- 🏆 **Fantezi Takım** — Kendi fantezi F1 takımını kur ve yarış simülatörü çalıştır
- 👤 **Kullanıcı Profilleri** — Firebase Auth ile favori pilot ve takımları kaydet
- 🌐 **İlerleyen Web Uygulaması (PWA)** — Mobilde kurulabilir, çevrimdışı çalışır
- 🌓 **Karanlık / Aydınlık Mod** — Sisteme göre otomatik tema değişimi

## 🛠️ Kullanılan Teknolojiler

- React 18 + Vite
- Firebase Auth + Firestore
- OpenF1 API (Canlı Veriler)
- Jolpica / Ergast API (Tarihsel Veriler)
- React Router
- Vercel (Barındırma)

## 🔧 Kurulum

```bash
git clone https://github.com/efelix32/pitlane-f1-dashboard.git
cd pitlane-f1-dashboard
npm install
# .env dosyası oluştur ve Firebase bilgilerini ekle
npm run dev
```

## 📄 Lisans
MIT
