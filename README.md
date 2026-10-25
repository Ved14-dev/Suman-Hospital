# Suman Multispecialty Hospital - Website & Hospital ERP System

A modern, high-polish healthcare web platform and clinical ERP tailored for **Suman Multispecialty Hospital** (pre-launch upcoming hospital).

Deployment instructions for Render, Vercel, and MongoDB Atlas are in
[docs/DEPLOY.md](docs/DEPLOY.md).

---

## 🏥 Hospital Overview & Department Structure

Suman Multispecialty Hospital is configured with **4 core departments** and an intimate roster of 2 to 4 physicians per department:

1. **General Checkup** (`general-checkup`) - Primary care, preventive diagnostics, and chronic illness management. HOD: Dr. Rajesh Sharma (MD).
2. **Pediatrics** (`pediatrics`) - Neonatal monitoring, infant vaccinations, child development, and pediatric medicine. HOD: Dr. Ananya Sen (MD).
3. **Orthopedics** (`orthopedics`) - Joint pain therapy, fracture reduction, casting, and mobility rehabilitation. HOD: Dr. Vikramaditya Rao (MS Ortho).
4. **Gynaecology & Panchakarma** (`gynaecology-panchakarma`) - Integrated women's healthcare, prenatal/postnatal care, PCOS clinic, and authentic Ayurvedic Panchakarma rejuvenation therapy. **HOD: Dr. Gauri Warhekar (BAMS)**.

---

## 🔐 Role-Based Access Control (RBAC) & Demo Credentials

The ERP supports 6 distinct roles. Run `npm run seed` from the `server` directory to initialize the database with demo accounts. Set `SEED_PASSWORD` to choose the password; local development falls back to `password123`, but hosted demos must use a private value.

| Role | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sumanhospital.com` | `password123` | Full ERP access, analytics, staff directory, reports |
| **Receptionist** | `receptionist@sumanhospital.com` | `password123` | Patient registry, front-desk walk-ins, daily token slips, check-ins |
| **Doctor (HOD)** | `dr.gauri.warhekar@sumanhospital.com` | `password123` | Today's OPD queue, call next, start/complete consultation, clinical notes |
| **Nurse** | `nurse@sumanhospital.com` | `password123` | Queue observation, vitals triage, inpatient notes |
| **Pharmacist** | `pharmacist@sumanhospital.com` | `password123` | Pharmacy dispensary, medicine master, view patient Rx & allergies |
| **Patient** | `patient@sumanhospital.com` | `password123` | Book online slots, view own visits, prescriptions and profile |

*All seeded doctors also have login accounts (`dr.firstname.lastname@sumanhospital.com`) with `password123`.*

---

## 🛠️ Architecture & Technical Decisions

### 1. Patient Model Extension Architecture
- We extended the existing `Patient` model to serve as the single, hospital-wide patient registry.
- Fields include: `uhid` (format `SMH-XXXXXX` generated via atomic counter), `name`, `gender`, `dob`, `approxAge`, `phone`, `alternatePhone`, `email`, `address`, `bloodGroup`, `emergencyContact`, `allergies`, `chronicConditions`, `isActive`, `registeredBy`, `registeredAt`, and optional sparse `userId`.
- **Portal Linking**: Self-registered portal patients automatically receive or link to an existing `Patient` registry record via phone/name matching, ensuring portal users and walk-in patients share the exact same UHID entity.
- **Duplicate Prevention**: Registration queries phone + name and phone + DOB, returning an interactive warning with link to the existing profile, and allowing explicit overrides with mandatory reason logging.

### 2. Multi-Document Consistency & Database Topology
- **Standalone MongoDB**: The local MongoDB runs in standalone mode (no replica set configured). Consequently, multi-document ACID transactions (`session.withTransaction`) cannot be executed.
- **Safe Ordering & Compensation**: Operations (such as walk-in visit creation with daily token generation, and cancellation with slot release and patient counter increment) are safely ordered using atomic MongoDB primitives (`$inc`, `findOneAndUpdate`, and partial unique indexes) with application-level compensation on error.

### 3. Centralized IST Date & Time Handling
- All dates are standardized as `YYYY-MM-DD` strings (matching `Appointment.date`) for calendar slots, and standard `Date` objects for timestamps.
- All "today" calculations, queue filters, and slot expiration checks use the centralized `server/utils/dateUtils.js` configured with `Asia/Kolkata` (IST) timezone via `Intl.DateTimeFormat`.
- Past slots for today automatically expire as time passes. Cancelled or no-show slots are released for rebooking only if the slot time has not elapsed.

### 4. Atomic Sequences
- Sequential counters (`Counter` collection) with `findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true })` guarantee that no two concurrent requests can obtain the same UHID or daily token number.
- Daily consultation tokens are keyed per doctor per IST date (`token_${doctorId}_${dateStr}`).

### 5. Universal ERP Shell & Reusable Component System
- **Unified Sidebar & Topbar**: Grouped navigation based on user permissions, collapsible mobile drawer, and sticky top bar.
- **Global Patient Search**: Instant autocomplete search accessible via `/` or `Ctrl+K` from any ERP screen.
- **Printable Slip**: Clean letterhead token slip preview with isolated `@media print` CSS.
- **Self-Contained Scroll**: Sidebars and wide data tables maintain independent scroll containers without horizontal layout breaks.

---

## 🚀 Running the Project Locally

### Prerequisites
1. Node.js (v18+)
2. Local MongoDB Server running at `mongodb://127.0.0.1:27017`

### 1. Database Seeding
```bash
cd server
npm install
npm run seed
```

### 2. Run Backend Server (Port 5000)
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

### 3. Run Frontend Client (Port 3000)
```bash
cd client
npm install
npm run dev
# Web application runs on http://localhost:3000
```
