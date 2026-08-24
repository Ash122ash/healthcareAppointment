# MediSync — Healthcare Appointment & Follow-up Manager

**MediSync** is a production-grade, full-stack healthcare appointment and follow-up management workspace. It features secure JWT role authorization, a 3D DNA landing portal, a concurrency-safe checkout slot hold mechanism, AI-powered symptoms analysis (pre-visit) & plain-language diagnosis summaries (post-visit), and automated background reminder sweeps.

---

## 🌟 Key Features

- **Public Landing & 3D DNA Portal**: Elegant glassmorphic landing page backed by a fully interactive 3D DNA helix canvas (React Three Fiber) with fallback configuration for user motion restrictions.
- **JWT & Role Authentication**: Dual token validation (15-minute access token in memory, 7-day refresh token in HTTP-only cookies) with role protection filters (Admin, Doctor, Patient).
- **Concurrency-Safe Slot Booking**: Dual-layer lock model using temporary expirable locks (90 seconds) combined with serializable database transactions to prevent race conditions under load.
- **AI Diagnostics (Claude API)**:
  - *Pre-Visit summary*: Classifies symptom intake forms, marks urgency, and suggests targeted questions for doctors.
  - *Post-Visit note translator*: Converts clinical notes into plain language summaries and builds a medication schedule for the patient.
- **Medication reminders & Alerts**: Background worker sweeps configured to track medication compliance logs, prune expired slot holds, and dispatch 24h/1h appointment alerts.
- **Google Calendar Sync**: Integrates Google Calendar API OAuth redirects to sync confirmed consultations directly onto calendars.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Framer Motion, React Three Fiber.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, BullMQ, Nodemailer.
- **Shared**: Zod validation schemas, TypeScript interfaces.

---

## 📂 Project Structure

```
├── backend/                  # Express REST API & workers
│   ├── prisma/               # Schema, migrations, seed configurations
│   ├── src/
│   │   ├── middlewares/      # Authentication, rate limit, role filters
│   │   ├── routes/           # REST endpoints (auth, admin, doctor, patient)
│   │   ├── services/         # Booking transactions, Claude AI, email, calendar
│   │   ├── workers/          # BullMQ queue handlers & database sweepers
│   │   └── server.ts         # App bootstrap
├── frontend/                 # Vite Single-Page Application
│   ├── src/
│   │   ├── components/       # UI components (R3F Helix, buttons, inputs)
│   │   ├── context/          # Auth state, custom Axios-like apiFetch
│   │   ├── pages/            # Dashboards, login, landing pages
│   │   └── App.tsx           # Route configurations & layout frames
├── shared/                   # Workspace-shared code
│   └── src/index.ts          # Shared Zod schemas & types
├── docker-compose.yml        # Docker compose config for Postgres & Redis
├── SYSTEM_DESIGN.md          # Architectural specifications
└── DEPLOYMENT.md             # Installation & deployment guides
```

---

## 🚀 Quick Start

### 1. Launch Services
Start the database and Redis services using Docker:
```bash
docker compose up -d
```

### 2. Setup Environment Variables
Create `backend/.env` based on the template in [DEPLOYMENT.md](file:///d:/vs%20code%20programs/healthcareAppointment/DEPLOYMENT.md).

### 3. Deploy Schemas & Seed
Deploy migrations and populate seed records:
```bash
npm install
npm run build:shared
npx prisma migrate dev --schema=backend/prisma/schema.prisma
npm run seed --workspace=backend
```

### 4. Build & Start Servers
Start the dev servers (backend port 5000, frontend port 3000):
```bash
npm run dev:backend
npm run dev:frontend
```

---

## 📚 Technical Manuals
For deep dives, check:
- [SYSTEM_DESIGN.md](file:///d:/vs%20code%20programs/healthcareAppointment/SYSTEM_DESIGN.md): Visualizes state flows, locking transactions, and queue systems.
- [DEPLOYMENT.md](file:///d:/vs%20code%20programs/healthcareAppointment/DEPLOYMENT.md): Technical checklist for setting up production process controls and SMTP variables.
