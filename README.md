# E-Cliniq Medical Practice Management System

A comprehensive medical practice management system built with React and Node.js, designed to streamline healthcare operations through appointment scheduling, medical records management, and inventory tracking.

![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

E-Cliniq is a full-stack medical management application that provides healthcare professionals with tools to efficiently manage patient appointments, maintain detailed medical records, and track medicine inventory. The system features role-based access control, input validation, and a modern, responsive user interface. This is a public-facing version of my project submitted as my project-based learning portfolio.

## Key Features

### 🔐 Authentication & Authorization
- **Role-Based Access Control** with four user types:
  - **Nurse**: Schedule appointments, manage inventory
  - **Doctor**: Full access to medical records, prescribe medications
  - **Admin**: Complete system access including deletions
  - **Patient**: View personal medical records
- **Secure Session Management** with JWT tokens
- **Persistent Login** across browser sessions
- **Protected API Routes** with middleware authorization

### 📅 Appointment Scheduling
- **Calendar View** as default with monthly navigation
- **Conflict Detection** prevents overlapping appointments
- **Smart Suggestions** for alternative time slots when conflicts occur
- **Patient Information** capture (name, email, ID number, age, gender)
- **Service Type** categorization
- **Automatic Medical Record Creation** when appointments are scheduled
- **Search and Filter** capabilities
- **Role-Based Permissions** (only Nurses and Admins can create/delete)

### 🏥 Medical Records Management
- **Comprehensive Patient Records** including:
  - Patient demographics (name, email, ID number, age, gender)
  - Clinical information (symptoms, diagnosis, treatment)
  - Vital signs (blood pressure, heart rate, temperature)
  - Lab results and X-ray notes
  - Allergies and medical history
  - Follow-up scheduling
- **Duplicate Prevention** ensures one record per patient
- **Electronic Prescriptions** with real-time inventory integration
- **Medicine Prescription Interface**:
  - Browse available medicines from inventory
  - Low stock warnings
  - Quantity selection with stock validation
  - Automatic inventory deduction upon prescription
- **Search Functionality** by patient name
- **Edit and Update** existing records with inventory reconciliation
- **Organized Tab Interface** (Basic Info, Clinical, Prescription, Vitals)

### 💊 Medicine Inventory Management
- **Real-Time Stock Tracking**
- **Inventory Statistics Dashboard**:
  - Total medicines count
  - Total stock levels
  - Low stock alerts (< 10 units)
- **Quick Quantity Adjustments** with +/- buttons
- **Medicine Details**:
  - Name and dosage information
  - Unit type (mg/ml)
  - Current quantity
- **Search and Filter** by medicine name or dosage
- **Low Stock Highlighting** for items needing restock
- **Automatic Inventory Updates** when medicines are prescribed
- **Role-Based Controls** (Nurses and Admins can add/edit/delete)

### 🎨 Modern User Interface
- **Professional Icon Set** using React Icons (Font Awesome)
- **Responsive Design** for desktop and mobile devices
- **Collapsible Sidebar Navigation**
- **Color-Coded Interface**:
  - Consistent purple gradient theme across all modules
  - Visual indicators for low stock items
  - Service type color coding
- **Modal Forms** with proper spacing and validation feedback
- **Empty States** with helpful guidance
- **Loading Indicators** for async operations
- **Intuitive Tab Navigation**

## Technology Stack

### Frontend
- **React 18** with Vite
- **React Icons** for professional iconography
- **Context API** for state management
- **CSS3** with custom styling
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
   git clone https://github.com/yourusername/E-Cliniq.git
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
   Server will run on `http://localhost:3001`

5. **Start the frontend development server**
   ```bash
   cd ../frontend
   npm run dev
   ```
   Application will run on `http://localhost:5173`

## Default User Credentials

The system comes with four pre-configured user accounts for demonstration:

| Role | Email | Password |
|------|-------|----------|
| Nurse | nurse@email.com | nursePassword123 |
| Doctor | doctor@email.com | doctorPassword123 |
| Admin | admin@email.com | adminPassword123 |
| Patient | patient@email.com | patientPassword123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Appointments
- `GET /api/appointments` - Get all appointments (authenticated)
- `POST /api/appointments` - Create appointment (Nurse, Admin)
- `GET /api/appointments/patient/:identifier` - Get patient appointments
- `DELETE /api/appointments/:id` - Delete appointment (Nurse, Admin)

### Medical Records
- `GET /api/medical-records` - Get all records (Doctor, Nurse, Admin)
- `POST /api/medical-records` - Create record (Doctor, Nurse)
- `GET /api/medical-records/:id` - Get record by ID
- `PUT /api/medical-records/:id` - Update record (Doctor, Nurse)
- `DELETE /api/medical-records/:id` - Delete record (Doctor, Admin)
- `GET /api/medical-records/search/:name` - Search records by name

### Inventory
- `GET /api/inventory` - Get all inventory items (authenticated)
- `POST /api/inventory` - Add inventory item (Nurse, Admin)
- `PUT /api/inventory/:id` - Update inventory item (Nurse, Admin)
- `DELETE /api/inventory/:id` - Delete inventory item (Nurse, Admin)

## Key Features in Detail

### Smart Appointment Conflict Detection
The system automatically detects scheduling conflicts by:
- Checking for appointments within 1-hour time slots
- Providing up to 3 alternative time suggestions
- Working hours: 8:00 AM - 4:00 PM (last appointment slot)
- Clear conflict messaging with patient information

### Duplicate Medical Record Prevention
- Automatically detects existing records by ID number or email
- Prompts users to edit existing records instead of creating duplicates
- Displays existing record information for verification
- Maintains data integrity across the system

### Integrated Inventory Management
- Real-time stock validation when prescribing medicines
- Automatic inventory deduction upon medical record creation/update
- Inventory restoration when prescriptions are modified or removed
- Detailed error messages for insufficient stock scenarios
- Low stock alerts (threshold: 10 units)

### Auto-Creation of Medical Records
When scheduling appointments with patient ID or email:
- System checks for existing medical record
- Creates new record automatically if none exists
- Links appointment to medical record
- Pre-fills basic patient information
- Reduces data entry redundancy

## Project Structure

```
E-Cliniq/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── database.js              # SQLite database setup and queries
│   ├── server.js                # Express server and API routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx        # Login component
│   │   │   ├── AppointmentScheduler.jsx
│   │   │   ├── MedicalRecords.jsx
│   │   │   └── InventoryManager.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   ├── App.jsx              # Main application component
│   │   ├── App.css              # Application styles
│   │   └── main.jsx             # Application entry point
│   └── package.json
└── README.md
```

## Security Features

- **JWT-based Authentication**: Secure token-based session management
- **Role-Based Access Control**: Granular permissions for different user types
- **Protected Routes**: API endpoints secured with authentication middleware
- **Input Validation**: Server-side validation for all user inputs
- **Session Timeout**: Automatic logout on token expiration
- **Password Security**: Note - Current version uses plain text for demo purposes

## Data Validation

### Frontend Validation
- Required field enforcement
- Email format validation
- Numeric range validation
- Real-time feedback on form errors
- Conflict detection before submission

### Backend Validation
- Appointment conflict checking
- Duplicate record prevention
- Stock availability verification
- Field format validation
- Data type enforcement

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with React and Node.js
- Icons by Font Awesome via React Icons
- Database powered by SQLite

## Contact

For questions or support, please open an issue on GitHub.

---

**Version 1.0** - © 2024 E-Cliniq
