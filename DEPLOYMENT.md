# MediSync — Deployment Guide

This manual walks through deploying the **MediSync** healthcare application for development and production environments.

---

## 1. Prerequisites
Ensure you have the following installed on the target machine:
- **Node.js** (v18 or higher)
- **NPM** (v9 or higher)
- **Docker** and **Docker Compose**
- **Git**

---

## 2. Configuration (`.env`)
Create a `.env` configuration file in the `backend/` directory based on the following template:

```ini
# Server Port
PORT=5000

# Database URLs (Postgres)
# Replace ash123 with your actual password. If using Docker, default matches below.
DATABASE_URL="postgresql://postgres:ash123@localhost:5432/medisync?schema=public"

# Redis Server Connection URL (Used by BullMQ)
REDIS_URL="redis://127.0.0.1:6379"

# JWT Token Secret Configurations
JWT_ACCESS_SECRET="your-super-secret-access-key-random-string"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-random-string"

# Anthropic Claude API Configuration (Leave as placeholder to run on mock fallbacks)
ANTHROPIC_API_KEY="dummy-key-for-now"

# SMTP Transactional Email Config (SendGrid or Custom SMTP)
SENDGRID_API_KEY="dummy-key-for-now"
EMAIL_FROM="noreply@medisync.com"

# Google Calendar OAuth Credentials (Optional)
GOOGLE_CLIENT_ID="dummy-client-id"
GOOGLE_CLIENT_SECRET="dummy-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/v1/auth/google/callback"

# Frontend Application Origin Link
FRONTEND_URL="http://localhost:3000"
```

---

## 3. Database & Cache Services Setup (Docker)
Launch the PostgreSQL database and Redis server containers in the background using Docker Compose:

```bash
docker compose up -d
```

Verify that both containers are running successfully:
```bash
docker compose ps
```

---

## 4. Compile Shared, Backend, and Seed Data
Build and prepare the database configurations in order:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build Shared Library**:
   ```bash
   npm run build:shared
   ```

3. **Deploy Database Migrations**:
   Run the migrations to create the schemas and apply the custom double-booking partial unique indexes:
   ```bash
   npx prisma migrate dev --schema=backend/prisma/schema.prisma
   ```

4. **Populate Database (Seed)**:
   Run the seed script to create initial admin, doctor, patient, and appointment bookings:
   ```bash
   npm run seed --workspace=backend
   ```

5. **Build Backend**:
   ```bash
   npm run build --workspace=backend
   ```

6. **Build Frontend**:
   ```bash
   npm run build --workspace=frontend
   ```

---

## 5. Running the Application

### Development Servers (Hot Reloading)
To run both development environments concurrently:
- Backend server runs on `http://localhost:5000`
- Frontend Vite server runs on `http://localhost:3000`

```bash
# In separate terminal tabs:
npm run dev:backend
npm run dev:frontend
```

### Production Servers (PM2 Example)
For production deployments, manage node server clusters using PM2:

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Launch backend process:
   ```bash
   pm2 start backend/dist/server.js --name "medisync-backend"
   ```

3. Serve frontend:
   Vite builds production assets into `frontend/dist/`. Serve these static files using Nginx, Apache, or a simple Node static server (e.g. `serve`):
   ```bash
   npm install -g serve
   pm2 start "serve -s frontend/dist -l 3000" --name "medisync-frontend"
   ```
