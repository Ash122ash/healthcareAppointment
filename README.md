# 🏥 MediSync: Next-Gen Healthcare Appointment System



**Live Demo:** [https://healthcare-appointment-frontend-sage.vercel.app/](https://healthcare-appointment-frontend-sage.vercel.app/)

MediSync is a robust, full-stack monorepo healthcare appointment management system. It goes beyond simple scheduling by integrating advanced concurrency control, AI-driven medical summaries, automated background workflows, and comprehensive doctor/patient portals.

---

## ✨ Unique Features & Highlights

### 1. 🛡️ Bulletproof Concurrency & Slot Holding
- **Redis-backed Slot Holds:** When a patient clicks a timeslot, it is immediately locked across the entire system. Other patients see it as "Held" instantly.
- **Race Condition Prevention:** Prisma transactions ensure that even if two patients attempt to confirm the exact same slot at the exact same millisecond, only one will succeed.

### 2. 🧠 AI-Powered Clinical Intelligence
- **Pre-Visit Urgency Assessment:** Patients fill out a symptom form before booking. An integrated LLM analyzes the symptoms, determines the urgency (e.g., HIGH for chest pain), and suggests probing questions for the doctor.
- **Post-Visit Summaries:** Doctors input quick clinical notes and prescriptions. The AI generates a simplified, jargon-free summary for the patient alongside a structured medication schedule.

### 3. 📅 Intelligent Leave Management
- When a doctor marks themselves as "On Leave" for a specific date, the system automatically sweeps the database and **auto-cancels all conflicting future appointments** for that day.
- Affected patients are instantly notified via email.

### 4. 💊 Automated Medication Reminders
- The system parses AI-generated prescriptions and schedules background cron jobs to send automated medication reminders to patients at the correct times.

### 5. 🏗️ Modern Monorepo Architecture
- **Shared Codebase:** Frontend and Backend share a common `@medisync/shared` library containing Zod schemas, TypeScript interfaces, and Enums, guaranteeing 100% type safety across the network boundary.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, bcrypt, jsonwebtoken
- **Database:** PostgreSQL (hosted on Neon Serverless)
- **Tooling:** npm workspaces (Monorepo), Zod (Validation), Anthropic API (AI)
- **Deployment:** Vercel (Frontend), Render (Backend), Neon (DB)

---

## 🔐 Demo Accounts

You can test all features of the application using the following seeded demo accounts:

### 👑 System Admin
- **Email:** `admin@medisync.com`
- **Password:** `adminpassword`

### 👨‍⚕️ Doctors (Password: `Demo@1234`)
- **Cardiology:** `dr.rajesh.kumar@medisync.com`
- **Pediatrics:** `dr.priya.sharma@medisync.com`
- **Orthopedics:** `dr.arjun.mehta@medisync.com`
- **Dermatology:** `dr.sunita.rao@medisync.com`

### 🏥 Patients (Password: `Patient@1234`)
- `amit.verma@gmail.com` *(Pre-loaded with a completed appointment, AI summaries, and medication reminders)*
- `sneha.patel@gmail.com`
- `rohit.singh@gmail.com`

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### 1. Clone & Install
```bash
git clone https://github.com/Ash122ash/healthcareAppointment.git
cd healthcareAppointment
npm install
```

### 2. Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/medisync"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
ANTHROPIC_API_KEY="your_api_key"
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Database Setup
```bash
npm run build:shared
cd backend
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

### 4. Start the Application
From the root directory, start both the frontend and backend concurrently:
```bash
npm run dev
```
- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:5000`

---
*Built with ❤️ for modern healthcare management.*
