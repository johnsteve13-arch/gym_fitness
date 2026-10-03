# Apex Iron Athletic Club — World-Class Fitness Gym Management Platform

> A production-ready, enterprise-grade Fitness Gym Membership & Athletic Facility Management Platform.
> Built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, **Node.js REST API**, **Express**, and **TiDB Cloud / MySQL**.

---

## 🏛️ System Architecture

```
                                  +----------------------------+
                                  |    Next.js 14 Frontend     |
                                  | (Vercel / Edge Optimized)  |
                                  +--------------+-------------+
                                                 |
                                     HTTPS REST / JWT Auth
                                                 |
                                  +--------------v-------------+
                                  |   Express Node.js Backend  |
                                  |    (Render / Multi-stage)  |
                                  +--------------+-------------+
                                                 |
                                      Prisma ORM (Pooled)
                                                 |
                                  +--------------v-------------+
                                  |  TiDB Cloud / MySQL 8.0+   |
                                  |  (Relational Database)     |
                                  +----------------------------+
```

---

## 🌟 10 Major World-Class Features Implemented

### 1. Smart Membership & Subscription Engine
- Flexible plans: Trial Day Pass, Monthly Athlete, Quarterly Pro, Annual All-Access Championship, Student, Corporate.
- Dynamic subscription controls: **Upgrades, Downgrades, Term Extensions, Temporary Freezing, Cancellations, and Renewals**.
- Real-time expiration tracking, grace period calculations, and automated renewal reminders.

### 2. Advanced Gym Attendance & Access Control
- Cryptographically signed member **QR Code Tokens** and **Member ID** lookup.
- High-contrast, full-screen **Reception Kiosk Terminal** (`/kiosk`) with audio chime and instant visual pass validation.
- Prevents duplicate check-ins, unauthorized entry, expired memberships, and suspended accounts.
- Peak-hour traffic density analytics and visit duration calculations.

### 3. Advanced Workout & Fitness Progress System
- Multi-day workout program builders for trainers and athletes.
- Interactive Workout Logger: track sets, repetitions, weights, duration, and calories burned.
- **Automatic Personal Record (PR) Detection**: detects when an athlete smashes their previous best and awards bonus reward coins.
- Trophy Wall highlighting lifetime PRs.

### 4. Body Composition & Measurement Tracking
- Complete biometric tracker: Weight, Height, Automatic BMI calculation (`weight / height^2`), Body Fat %, Muscle Mass, Chest, Waist, and Arm circumferences.
- Progress comparison engine: compares baseline enrollment measurements with current values.

### 5. Advanced Payment & Financial Management
- Atomic database transactions (`prisma.$transaction`) for error-proof billing.
- Standardized invoice numbers (`INV-2026-XXXX`) and transaction identifiers.
- Interactive **Printable Tax Receipts & Invoices** with line-item breakdowns.
- Revenue analytics dashboard: Daily, Monthly, Annual, by plan type, and by trainer.

### 6. Gym Class & Group Booking System
- Classes: Olympic Barbell Clinics, Tactical HIIT, Athletic Mobility & Yoga, CrossFit, Boxing, and Cycling.
- Capacity limits and **Automated Waitlist Queue**: if a booked athlete cancels, the #1 waitlisted member is automatically promoted and notified.

### 7. AI Fitness Coach
- Contextual, conversational athletic assistant utilizing actual member data (goals, logged attendance, current BMI, personal records).
- Generates progressive overload schemes, training splits, and nutrition guidelines.
- Prominent and transparent **Medical Disclaimer**: general athletic guidance distinct from clinical healthcare advice.

### 8. Smart Member Retention & Engagement Engine
- Identifies at-risk inactive members (> 14 days absent from facility) and upcoming expirations (within 7 days).
- Staff direct intervention actions: One-click calling, gift 50 re-engagement coins, or email renewal reminders.
- AI Activity Scores (0–100) based on attendance, workouts, and consistency.

### 9. Complete Notification Center
- Real-time in-app notification center with read/unread tracking and category badges.
- Instant notifications for payments, personal records, booking updates, and announcements.

### 10. Admin Analytics & Business Intelligence
- Executive control room with interactive SVG charts for monthly revenue trends and daily attendance density.
- One-click **Member Directory CSV Export**.
- System health monitoring and comprehensive security audit logging.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm or pnpm

### 1. Installation
Clone the repository:
```bash
git clone https://github.com/johnsteve13-arch/gym_fitness.git
cd gym_fitness
```

Install backend and frontend dependencies:
```bash
# Backend
cd backend
npm install
npx prisma generate
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### 2. Running Locally
Start both servers:
```bash
# Terminal 1 (Backend REST API on http://localhost:5000)
cd backend
npm run dev

# Terminal 2 (Next.js Frontend on http://localhost:3000)
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 🔑 Demo Access Accounts

Use the one-click **Demo Portal Switcher** at the bottom-right corner of any page, or log in with credentials:

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@apexfitness.com` | `Password@123` |
| **Desk Staff** | `staff@apexfitness.com` | `Password@123` |
| **Personal Trainer** | `marcus@apexfitness.com` | `Password@123` |
| **Gym Member** | `sarah@example.com` | `Password@123` |

---

## ☁️ Deployment Guide

### Vercel (Frontend)
1. Push this repository to GitHub.
2. Import the project in Vercel and set the **Root Directory** to `frontend`.
3. Set Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your Render backend API URL (e.g., `https://gym-fitness-api.onrender.com/api`).
4. Click **Deploy**.

### Render (Backend)
1. In Render, select **New Web Service** pointing to this repository.
2. Set **Root Directory** to `backend`.
3. Build Command: `npm install && npx prisma generate && npm run build`
4. Start Command: `npm start`
5. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your TiDB Cloud connection string.
   - `JWT_SECRET`: Random 32+ character key.
   - `CORS_ORIGIN`: Your Vercel frontend URL.

### TiDB Cloud (Database)
1. Create a free **TiDB Serverless** cluster on [TiDB Cloud](https://tidbcloud.com).
2. Obtain the MySQL connection string:
   ```
   mysql://<user>.<prefix>:<password>@<host>:4000/gym_fitness?sslaccept=strict
   ```
3. Set `DATABASE_URL` in backend `.env` and deploy migrations:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

---

## 🧪 Testing

Run backend tests:
```bash
cd backend
npm test
```
7/7 integration and security unit tests verify authentication, health monitoring, QR token verification, and payment ledger idempotency.

---

## 📄 License
This project is licensed under the ISC License. Commercial fitness software architecture.
