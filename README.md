# Partner CRM Enterprise Web Application

A full-stack, production-quality **Partner CRM** web application. It enables external business partners (DSAs, dealers, channel partners) to log cases, track appraisal status in real-time, monitor Turnaround Time (TAT) SLA compliance, trigger manual escalations, and download report spreadsheets. Admins can view overall partner metrics, manage file statuses, resolve escalations, and toggle partner agency suspensions.

---

## Tech Stack Overview

- **Frontend:** React (Vite) + TypeScript + Tailwind CSS (HSL custom color parameters for modern light/dark themes) + Recharts for analytics + Lucide React icons.
- **Backend:** Node.js + Express with REST APIs + TypeScript + Prisma ORM.
- **Database:** SQLite (configured for zero-setup out of the box, with model syntax compatible for PostgreSQL transition).
- **Authentication:** JWT-based secure sessions (15-min Access Tokens & 7-day Refresh Tokens).

---

## Pre-seeded Credentials (for Demo Testing)

The database is pre-configured and populated with mock case files spanning the last 6 months, SLA breaches, and historical timelines. You can log in using these details:

| Role | Email Address | Password | Scoped Agency |
| :--- | :--- | :--- | :--- |
| **Admin Ops** | `admin@partnercrm.com` | `password123` | Global (All partners) |
| **Partner User 1** | `apex.user@partnercrm.com` | `password123` | Apex Auto Channel (`APEX100`) |
| **Partner User 2** | `elite.user@partnercrm.com` | `password123` | Elite Home Finance (`ELITE200`) |
| **Partner User 3** | `legacy.user@partnercrm.com` | `password123` | Legacy Partners (`LEGACY300` - Suspended) |

---

## Getting Started

### Prerequisites
Make sure **Node.js** (v18+) and **npm** are installed on your machine.

### Run the Application

To start the application, open two separate terminal sessions inside the project directory:

#### Tab 1: Backend Server
```bash
cd backend
npm run dev
```
*The backend API server will launch at: [http://localhost:5000](http://localhost:5000)*
*(Note: SQLite database migrations and mock data seeding have already been completed during setup!)*

#### Tab 2: Frontend Client
```bash
cd frontend
npm run dev
```
*The React Vite dashboard client will compile and host at: [http://localhost:5173](http://localhost:5173)*

Open [http://localhost:5173](http://localhost:5173) in your browser to experience the application.

---

## Database Configuration

We use **Prisma ORM** with SQLite as the default provider for ease of local evaluation.

### Transitioning to PostgreSQL
To change the database provider to PostgreSQL:
1. Open [backend/prisma/schema.prisma](file:///C:/Users/Aryan/.gemini/antigravity-ide/scratch/partner-crm/backend/prisma/schema.prisma) and change the datasource provider block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set your `DATABASE_URL` connection string inside [backend/.env](file:///C:/Users/Aryan/.gemini/antigravity-ide/scratch/partner-crm/backend/.env).
3. Run migrations to initialize the database:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
