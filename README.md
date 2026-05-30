# E-Cliniq Medical Practice Management System

A comprehensive medical practice management system built with React and Node.js, designed to streamline healthcare operations through appointment scheduling, patient and medical-records management, and inventory tracking.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

E-Cliniq is a full-stack medical management application that gives healthcare professionals the tools to manage patients, appointments, medical records, and medicine/supply inventory. The system features role-based access control, a role-aware dashboard, real-time inventory integration, and a modern, responsive interface. This is a public-facing version of my project submitted as my project-based learning portfolio.

## Key Features

### 🔐 Authentication & Authorization
- **Role-Based Access Control** with four user types:
  - **Nurse**: Schedule appointments, manage inventory, record patient visits
  - **Doctor**: Full access to medical records, prescribe medications
  - **Admin**: Complete system access including deletions
  - **Patient**: View their own records and **book/cancel their own appointments**
- **Secure Session Management** with JWT tokens
- **Persistent Login** across browser sessions
- **Protected API Routes** with middleware authorization

### 📊 Role-Aware Dashboard
- Personalized greeting and at-a-glance stats tailored to each role
- Staff: today's schedule, recent records, low-stock alerts, quick actions
- Patient: upcoming visits, care summary, and active prescriptions

### 📅 Appointment Scheduling
- **Week time-grid (default)** and **Month overview**, with 30-minute slots from 8:00 AM–4:30 PM
- **Status lifecycle**: appointments are *Scheduled*, automatically become *Completed* once their time passes, or can be *Cancelled* (kept as history, not deleted)
- **Patient self-service**: patients can book and cancel their own appointments; cancelling a slot frees it for rebooking
- **Cancellation notifications**: when a patient cancels, all staff are notified
- **Patient privacy**: a patient sees other patients' booked slots only as "Unavailable" (no personal details), via a dedicated availability endpoint
- **Conflict detection** with alternative time-slot suggestions, plus past-date prevention
- **Open patient record** shortcut directly from an appointment, with details pre-filled
- **Sundays disabled** in the calendar
- Service-type categorization and color coding

### 🧑‍⚕️ Patient Management
- Dedicated **patients directory** with search by name, ID number, or email
- **Patient lookup** when booking appointments or creating records (no need to re-type details)
- Patient profiles include demographics, date of birth (auto-calculates age), and allergies
- Ships with **50 seeded demo patients** for realistic testing

### 🏥 Medical Records Management
- **Patient-centric** view: open a patient to see their full **visit history**
- Each visit captures:
  - Clinical information (symptoms, diagnosis, treatment)
  - Vital signs (blood pressure, heart rate, temperature)
  - Lab results and X-ray notes
  - Allergies and follow-up scheduling
- **Electronic Prescriptions** with real-time inventory integration:
  - Browse available medicines, with low-stock warnings
  - Quantity selection with stock validation
  - Automatic inventory deduction on save, and reconciliation on edit
- **Organized tabbed form** (Basic, Clinical, Vitals, Prescription)
- **Search** by patient name, ID number, or email

### 💊 Inventory Management (Medicines & Supplies)
- Tracks both **medicines** and **medical supplies** with a type filter
- **Real-time stock tracking** with live +/- quantity steppers
- **Statistics**: medicines count, supplies count, and items needing restock
- **Item details**: name, dosage (medicines) or size (supplies), and unit (mg/ml, pcs, rolls, boxes, …)
- **Low-stock highlighting and alerts** (threshold: 10 units)
- **Automatic inventory updates** when medicines are prescribed
- **Role-Based Controls** (Nurses and Admins can add/edit/delete; Doctors view-only)

### 🔔 Notifications
- Topbar notification bell with an unread badge (staff)
- Per-user read state — opening the bell clears it for that user only
- Currently surfaces patient appointment cancellations

### 🎨 Modern User Interface
- **Warm design system**: royal blue + golden yellow palette, Hanken Grotesk typeface, soft surfaces (see `theme.css`)
- **App shell** with collapsible Sidebar and sticky Topbar
- **React Icons** (Font Awesome) iconography
- **Responsive design** for desktop and mobile
- **Toasts, modals, empty states, and loading indicators** throughout
- Role-aware navigation (patients see relabeled nav and no Inventory)

## Technology Stack

### Frontend
- **React 18** with Vite
- **React Icons** for iconography
- **Context API** for state management (Auth + Toast)
- **CSS design tokens** (`theme.css`) with a custom warm theme
- **LocalStorage** for session persistence

### Backend
- **Node.js** with Express
- **SQLite** database with better-sqlite3
- **JWT** (JSON Web Tokens) for authentication
- **RESTful API** architecture
- **Middleware** for authentication and authorization

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/MrDarkey45/E-Cliniq.git
   cd E-Cliniq
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the backend server**
   ```bash
   cd ../backend
   npm start
   ```
   Server runs on `http://localhost:3001`. On first launch it creates and seeds the SQLite database automatically (the `.db` file is git-ignored and regenerated locally).

5. **Start the frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   ```
   Application runs on `http://localhost:5173`

## Default User Credentials

The system comes with four pre-configured staff/demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Nurse | nurse@email.com | nursePassword123 |
| Doctor | doctor@email.com | doctorPassword123 |
| Admin | admin@email.com | adminPassword123 |
| Patient | patient@email.com | patientPassword123 |

In addition, **50 demo patients** are seeded with the email pattern `flastname@patient.com` and password `patientpassword` (e.g. `pparker@patient.com` for Peter Parker).

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Appointments
- `GET /api/appointments` - Get all appointments (authenticated)
- `POST /api/appointments` - Create appointment (Nurse, Admin, Patient — patients book for themselves)
- `GET /api/appointments/patient/:identifier` - Get a patient's appointments
- `GET /api/appointments/availability` - Get taken slots (no personal data; used for privacy)
- `DELETE /api/appointments/:id` - Cancel appointment (Nurse/Admin any; Patient their own)

### Patients
- `GET /api/patients` - List patients (Nurse, Doctor, Admin)
- `GET /api/patients/search?q=` - Search by name, ID, or email
- `GET /api/patients/me` - Current patient's profile
- `GET /api/patients/:id` - Patient with visit history
- `POST /api/patients` - Create patient (Nurse, Doctor, Admin)
- `PUT /api/patients/:id` - Update patient
- `GET /api/patients/:id/visits` - A patient's visit records

### Medical Records
- `GET /api/medical-records` - Get records (patients see only their own)
- `POST /api/medical-records` - Create a visit record (Doctor, Nurse, Admin)
- `GET /api/medical-records/:id` - Get record by ID
- `PUT /api/medical-records/:id` - Update record (Doctor, Nurse, Admin)
- `DELETE /api/medical-records/:id` - Delete record (Doctor, Nurse, Admin)
- `GET /api/medical-records/search/:name` - Search records by name

### Inventory
- `GET /api/inventory` - Get all inventory items (authenticated)
- `POST /api/inventory` - Add item (Nurse, Admin)
- `PUT /api/inventory/:id` - Update item (Nurse, Admin)
- `DELETE /api/inventory/:id` - Delete item (Nurse, Admin)

### Notifications
- `GET /api/notifications` - Unread notifications + count for the current user (staff)
- `PUT /api/notifications/read` - Mark all as read for the current user

## Key Features in Detail

### Appointment Status Lifecycle
- New appointments are **Scheduled**.
- They automatically display as **Completed** once the slot's date/time has passed (derived on read — no background job).
- Cancelling sets status to **Cancelled** and keeps the row as history rather than deleting it; the freed slot becomes available to book again.

### Patient Privacy
- Patients load their own appointments plus a personal-data-free availability list, so other patients' booked slots appear only as "Unavailable."

### Integrated Inventory Management
- Real-time stock validation when prescribing medicines
- Automatic inventory deduction on visit creation/update
- Inventory restoration/reconciliation when prescriptions are modified or removed
- Detailed error messages for insufficient-stock scenarios
- Low-stock alerts (threshold: 10 units)

## Project Structure

```
E-Cliniq/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # Authentication & authorization middleware
│   ├── database.js              # SQLite schema, queries, and seed data
│   ├── server.js                # Express server and API routes
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx        # Top bar + notifications bell
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AppointmentScheduler.jsx
│   │   │   ├── MedicalRecords.jsx
│   │   │   ├── InventoryManager.jsx
│   │   │   └── ui.jsx            # Shared UI primitives (Avatar, Modal, Stat, …)
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── services/
│   │   │   └── api.js            # API service layer
│   │   ├── App.jsx              # Main application component
│   │   ├── App.css              # Legacy styles
│   │   ├── theme.css           # Design system (tokens + components)
│   │   └── main.jsx            # Application entry point
│   └── package.json
└── README.md
```

## Security Features

- **JWT-based Authentication**: Secure token-based session management
- **Role-Based Access Control**: Granular permissions for different user types
- **Protected Routes**: API endpoints secured with authentication middleware
- **Input Validation**: Server-side validation for all user inputs
- **Session Timeout**: Automatic logout on token expiration
- **Password Security**: Note — the current version uses plain text for demo purposes

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and Node.js
- Icons by Font Awesome via React Icons
- Database powered by SQLite

## Contact

For questions or support, please open an issue on GitHub.

---

**Version 2.0** - © 2026 E-Cliniq
