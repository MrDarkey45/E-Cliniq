import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create/open database file
const db = new Database(join(__dirname, 'medical-practice.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      clientName TEXT NOT NULL,
      email TEXT,
      idNumber TEXT,
      service TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // Inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dosage TEXT,
      unit TEXT DEFAULT 'mg',
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `);

  // Medical records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointmentId INTEGER,
      patientName TEXT NOT NULL,
      email TEXT,
      idNumber TEXT,
      age INTEGER,
      gender TEXT,
      symptoms TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      treatment TEXT NOT NULL,
      medications TEXT,
      prescribedMedicines TEXT,
      allergies TEXT,
      bloodPressure TEXT,
      heartRate TEXT,
      temperature TEXT,
      notes TEXT,
      followUpDate TEXT,
      labResults TEXT,
      xrayNotes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
    )
  `);

  // Users table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('nurse', 'doctor', 'admin', 'patient')),
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
    CREATE INDEX IF NOT EXISTS idx_medical_records_idNumber ON medical_records(idNumber);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  console.log('✅ Database tables created successfully');
};

// Seed default users
const seedUsers = () => {
  const users = [
    { email: 'nurse@email.com', password: 'nursePassword123', role: 'nurse', name: 'Nurse User' },
    { email: 'doctor@email.com', password: 'doctorPassword123', role: 'doctor', name: 'Dr. Smith' },
    { email: 'admin@email.com', password: 'adminPassword123', role: 'admin', name: 'Admin User' },
    { email: 'patient@email.com', password: 'patientPassword123', role: 'patient', name: 'John Doe' }
  ];

  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (existingUsers.count === 0) {
    const stmt = db.prepare('INSERT INTO users (email, password, role, name, createdAt) VALUES (?, ?, ?, ?, ?)');

    users.forEach(user => {
      stmt.run(user.email, user.password, user.role, user.name, new Date().toISOString());
    });

    console.log('✅ Default users seeded successfully');
  }
};

// Initialize database
createTables();
seedUsers();

// ============ APPOINTMENT QUERIES ============

export const appointmentQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO appointments (date, time, clientName, email, idNumber, service, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.date,
      data.time,
      data.clientName,
      data.email || null,
      data.idNumber || null,
      data.service,
      new Date().toISOString()
    );
    return appointmentQueries.getById(result.lastInsertRowid);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    return stmt.run(id);
  }
};

// ============ INVENTORY QUERIES ============

export const inventoryQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM inventory ORDER BY name ASC').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO inventory (name, dosage, unit, quantity, price, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name,
      data.dosage || '',
      data.unit || 'mg',
      data.quantity,
      data.price,
      new Date().toISOString()
    );
    return inventoryQueries.getById(result.lastInsertRowid);
  },

  update: (id, data) => {
    // If only quantity is being updated (quick update)
    if (data.quantity !== undefined && Object.keys(data).length === 1) {
      const stmt = db.prepare(`
        UPDATE inventory
        SET quantity = ?, updatedAt = ?
        WHERE id = ?
      `);
      stmt.run(data.quantity, new Date().toISOString(), id);
    } else {
      // Full update
      const stmt = db.prepare(`
        UPDATE inventory
        SET name = ?, dosage = ?, unit = ?, quantity = ?, price = ?, updatedAt = ?
        WHERE id = ?
      `);
      stmt.run(
        data.name,
        data.dosage || '',
        data.unit || 'mg',
        data.quantity,
        data.price,
        new Date().toISOString(),
        id
      );
    }
    return inventoryQueries.getById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
    return stmt.run(id);
  }
};

// ============ MEDICAL RECORDS QUERIES ============

export const medicalRecordQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM medical_records ORDER BY createdAt DESC').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);
  },

  getByPatientName: (patientName) => {
    return db.prepare('SELECT * FROM medical_records WHERE patientName LIKE ? ORDER BY createdAt DESC')
      .all(`%${patientName}%`);
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO medical_records (
        appointmentId, patientName, email, idNumber, age, gender, symptoms, diagnosis, treatment,
        medications, prescribedMedicines, allergies, bloodPressure, heartRate, temperature,
        notes, followUpDate, labResults, xrayNotes, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.appointmentId || null,
      data.patientName,
      data.email || null,
      data.idNumber || null,
      data.age || null,
      data.gender || null,
      data.symptoms,
      data.diagnosis,
      data.treatment,
      data.medications || '',
      data.prescribedMedicines || '',
      data.allergies || '',
      data.bloodPressure || null,
      data.heartRate || null,
      data.temperature || null,
      data.notes || '',
      data.followUpDate || null,
      data.labResults || '',
      data.xrayNotes || '',
      new Date().toISOString()
    );
    return medicalRecordQueries.getById(result.lastInsertRowid);
  },

  update: (id, data) => {
    const stmt = db.prepare(`
      UPDATE medical_records
      SET patientName = ?, email = ?, idNumber = ?, age = ?, gender = ?, symptoms = ?, diagnosis = ?, 
          treatment = ?, medications = ?, prescribedMedicines = ?, allergies = ?, bloodPressure = ?, 
          heartRate = ?, temperature = ?, notes = ?, followUpDate = ?, 
          labResults = ?, xrayNotes = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      data.patientName,
      data.email || null,
      data.idNumber || null,
      data.age || null,
      data.gender || null,
      data.symptoms,
      data.diagnosis,
      data.treatment,
      data.medications || '',
      data.prescribedMedicines || '',
      data.allergies || '',
      data.bloodPressure || null,
      data.heartRate || null,
      data.temperature || null,
      data.notes || '',
      data.followUpDate || null,
      data.labResults || '',
      data.xrayNotes || '',
      new Date().toISOString(),
      id
    );
    return medicalRecordQueries.getById(id);
  },

  delete: (id) => {
    const stmt = db.prepare('DELETE FROM medical_records WHERE id = ?');
    return stmt.run(id);
  },

  getByIdNumber: (idNumber) => {
    return db.prepare('SELECT * FROM medical_records WHERE idNumber = ? ORDER BY createdAt DESC').all(idNumber);
  },

  getByEmail: (email) => {
    return db.prepare('SELECT * FROM medical_records WHERE email = ? ORDER BY createdAt DESC').all(email);
  },

  getByIdNumberOrEmail: (idNumber, email) => {
    if (idNumber && email) {
      return db.prepare('SELECT * FROM medical_records WHERE idNumber = ? OR email = ? ORDER BY createdAt DESC')
        .get(idNumber, email);
    } else if (idNumber) {
      return db.prepare('SELECT * FROM medical_records WHERE idNumber = ? ORDER BY createdAt DESC').get(idNumber);
    } else if (email) {
      return db.prepare('SELECT * FROM medical_records WHERE email = ? ORDER BY createdAt DESC').get(email);
    }
    return null;
  },

  getAppointmentsForPatient: (idNumber, email) => {
    if (idNumber && email) {
      return db.prepare('SELECT * FROM appointments WHERE idNumber = ? OR email = ? ORDER BY date DESC, time DESC')
        .all(idNumber, email);
    } else if (idNumber) {
      return db.prepare('SELECT * FROM appointments WHERE idNumber = ? ORDER BY date DESC, time DESC').all(idNumber);
    } else if (email) {
      return db.prepare('SELECT * FROM appointments WHERE email = ? ORDER BY date DESC, time DESC').all(email);
    }
    return [];
  }
};

// ============ USER QUERIES ============

export const userQueries = {
  getAll: () => {
    return db.prepare('SELECT id, email, role, name, createdAt FROM users ORDER BY createdAt DESC').all();
  },

  getById: (id) => {
    return db.prepare('SELECT id, email, role, name, createdAt FROM users WHERE id = ?').get(id);
  },

  getByEmail: (email) => {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO users (email, password, role, name, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.email,
      data.password,
      data.role,
      data.name,
      new Date().toISOString()
    );
    return userQueries.getById(result.lastInsertRowid);
  }
};

// Backup function
export const backupDatabase = (backupPath) => {
  db.backup(backupPath)
    .then(() => {
      console.log('✅ Database backup created successfully');
    })
    .catch((err) => {
      console.error('❌ Backup failed:', err);
    });
};

// Close database connection
export const closeDatabase = () => {
  db.close();
  console.log('Database connection closed');
};

export default db;