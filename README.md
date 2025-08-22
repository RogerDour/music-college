```markdown
# 🎵 Music College Platform

A **full-stack MVP** for managing a small online music college — built with **React (Vite + MUI + Router + i18n)** and **Node.js (Express + MongoDB + JWT + Nodemailer)**.  
Supports **students, teachers, and admins** with role-based dashboards, scheduling algorithms (Greedy + Backtracking), lesson management, and multilingual UI.  
This project was my **technical software engineering graduation project**, iteratively delivered over ~3 months.

[![Stack](https://img.shields.io/badge/Stack-React%2C%20Node.js%2C%20MongoDB-blue)]()  
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

---

## ⚡ TL;DR (Recruiters / Professors)

- **Full-stack MVP**: Role-based dashboards for students, teachers, and admins.
- **Scheduling engine**: Greedy first, Backtracking fallback, recurring lessons, configurable buffers.
- **Core features**: Auth (JWT), password reset via email, availability/holidays, lessons CRUD, requests, tasks, submissions, materials, chat, notifications, analytics.
- **Stack**: React + Vite + MUI + Router + i18n; Node.js + Express + MongoDB + JWT; Nodemailer; optional Google OAuth; Jest tests.
- **Timeline**: Planned as a 30-day roadmap, actually shipped iteratively over ~3 months while learning.

---

## 🚀 Live Demo & Quick Links

- 🔗 **Live Demo**: _Coming soon_
- 📂 **Repo**: [github.com/RogerDour/music-college](https://github.com/RogerDour/music-college)
- 📖 **Docs**: _(TBD)_

---

## ✨ Features by Role

### 👨‍🎓 Student

- View dashboard with schedule & tasks
- Request lessons (auto-suggest via scheduling engine)
- Upload submissions, download course materials
- Receive notifications and chat with teachers

### 👨‍🏫 Teacher

- Manage availability & holidays
- Approve/reject lesson requests
- Upload course materials and tasks
- View student progress and submissions

### 👩‍💼 Admin

- Manage users, courses, and lessons (CRUD)
- Assign roles (student/teacher)
- Oversee scheduling conflicts & approvals
- Access analytics dashboard

---

## 🖼️ Screenshots

> (Placeholders — will be added later)

- Login & Signup
- Role-based dashboards
- Suggest Lesson flow
- Chat & Notifications

---

## 🏗️ Architecture

**Repo layout:**
```

client/ → React (Vite, MUI, Router, i18n)
server/ → Node.js + Express + MongoDB

```

**Diagram:**
```

\[ React (client) ] ⇄ \[ Express API (server) ] ⇄ \[ MongoDB ]
\| | |
MUI, i18n Auth, Scheduling Data persistence

````

---

## 📅 Scheduling Engine

- **Greedy algorithm**: picks the earliest mutual slot.
- **Backtracking fallback**: explores alternative slots if conflicts exist.
- **Buffer**: configurable padding before/after lessons.
- **Recurring lessons**: supports weekly repetition rules.

This ensures fast suggestions for most cases (Greedy) while still handling edge conflicts (Backtracking).

---

## 🛠️ Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- Git

### Windows (PowerShell)

```powershell
git clone https://github.com/RogerDour/music-college.git
cd music-college

# install deps
cd client; npm install
cd ../server; npm install

# run client
cd ../client; npm run dev
# run server
cd ../server; npm run dev
````

### macOS / Linux (bash/zsh)

```bash
git clone https://github.com/RogerDour/music-college.git
cd music-college

cd client && npm install
cd ../server && npm install

npm --prefix client run dev
npm --prefix server run dev
```

---

### `.env` Samples

**server/.env**

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/music_college
JWT_SECRET=supersecretkey
EMAIL_USER=you@example.com
EMAIL_PASS=yourpassword
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**client/.env**

```env
VITE_API_URL=http://localhost:5000/api
VITE_DEFAULT_LANG=en
```

---

## 📜 NPM Scripts

### Client

| Script            | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start Vite dev server    |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |

### Server

| Script        | Description                |
| ------------- | -------------------------- |
| `npm run dev` | Start dev server (nodemon) |
| `npm start`   | Start production server    |
| `npm test`    | Run Jest tests             |

**One-command dev** (optional, root):

```bash
npm install -g concurrently
concurrently "npm --prefix client run dev" "npm --prefix server run dev"
```

---

## 🔌 API Overview

- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Login (JWT)
- `POST /api/auth/forgot` — Send password reset email
- `GET /api/lessons/suggest` — Suggest lesson (Greedy/Backtracking)
- `POST /api/lessons` — Create lesson
- `PATCH /api/lessons/:id` — Update lesson
- `DELETE /api/lessons/:id` — Delete lesson
- `GET /api/courses/:id/materials` — Fetch course materials
- `POST /api/chat/:room` — Send message

---

## 🧪 Testing

Server tests with Jest:

```bash
cd server
npm test
```

Client tests _(if present)_:

```bash
cd client
npm test
```

---

## ☁️ Deployment

### Client

- Deploy to **Vercel** or **Netlify**
- Set `VITE_API_URL` in environment variables

### Server

- Deploy to **Render** or **Railway**
- Set all vars from `.env` (PORT, MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, Google OAuth keys if used)

---

## 📊 Roadmap vs Actual

**Planned: 30-day roadmap**

- Phase 1: Setup & fundamentals (Days 1–5)
- Phase 2: React basics (6–11)
- Phase 3: Backend + auth (12–17)
- Phase 4: Scheduling + features (18–25)
- Phase 5: Testing & polish (26–28)
- Phase 6: Deployment + docs (29–30)

**Actual: \~3 months delivery**

- **May 28**: Initial repo + client/server skeleton
- **Jun 1–Jun 30**: React UI, basic auth, Mongo setup
- **Jul**: Role-based dashboards, scheduling engine (Greedy + Backtracking), lessons CRUD
- **Aug**: Notifications, chat, analytics, i18n polish, tests, docs

---

## 📝 Changelog (Selected)

- **Aug 6** — Final polish, docs, analytics, notifications
- **Jul 15** — Scheduling engine (Greedy + Backtracking) integrated
- **Jun 10** — JWT auth + role-based dashboards
- **May 28** — Repo initialized (client + server)

---

## 📄 License & Credits

- Licensed under **MIT**.
- Built as a graduation project at ORT Braude College / Open University.
- Stack inspiration from MERN boilerplates and scheduling algorithm references.

---

## 🎬 Demo Script (3–5 min)

1. **Login** as student, teacher, and admin — show role-based dashboards.
2. **Student**: request a lesson → see “Suggest Lesson” auto-fill.
3. **Teacher**: approve request, upload material, assign task.
4. **Student**: upload submission, check notifications, switch language (EN/HE).
5. **Admin**: view analytics dashboard, manage users/courses.

---

```

```
