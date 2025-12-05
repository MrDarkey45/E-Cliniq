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

  console.log('✅ Database tables created successfully');
};

// Initialize database
createTables();

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