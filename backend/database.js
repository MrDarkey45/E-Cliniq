import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'medical-practice.db'));
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('nurse','doctor','admin','patient')),
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      id_number TEXT UNIQUE,
      dob TEXT,
      gender TEXT,
      allergies TEXT DEFAULT 'None known',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      clientName TEXT NOT NULL,
      email TEXT,
      idNumber TEXT,
      age INTEGER,
      gender TEXT,
      service TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dosage TEXT,
      unit TEXT DEFAULT 'mg',
      quantity INTEGER NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      type TEXT DEFAULT 'Medicine',
      size TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
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
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      read_at TEXT NOT NULL,
      FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(notification_id, user_id)
    );
  `);

  // Graceful column migrations for existing DBs
  const migrations = [
    'ALTER TABLE inventory ADD COLUMN type TEXT DEFAULT "Medicine"',
    'ALTER TABLE inventory ADD COLUMN size TEXT',
    'ALTER TABLE medical_records ADD COLUMN patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL',
    'ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT "Scheduled"',
  ];
  migrations.forEach(sql => { try { db.exec(sql); } catch {} });

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
    CREATE INDEX IF NOT EXISTS idx_medical_records_idNumber ON medical_records(idNumber);
    CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
    CREATE INDEX IF NOT EXISTS idx_patients_id_number ON patients(id_number);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt);
  `);

  console.log('✅ Schema ready');
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const appointmentQueries = {
  getAll: () => db.prepare('SELECT * FROM appointments ORDER BY date DESC, time ASC').all(),

  getById: (id) => db.prepare('SELECT * FROM appointments WHERE id = ?').get(id),

  getByEmail: (email) => db.prepare('SELECT * FROM appointments WHERE email = ? ORDER BY date DESC, time ASC').all(email),

  getByIdNumber: (idNumber) => db.prepare('SELECT * FROM appointments WHERE idNumber = ? ORDER BY date DESC, time ASC').all(idNumber),

  // Slot-occupancy queries exclude Cancelled so a cancelled slot frees up for rebooking
  getTakenSlots: (date) => db.prepare("SELECT date, time FROM appointments WHERE date = ? AND status != 'Cancelled'").all(date),

  // Returns ALL taken slots across all dates (for availability endpoint)
  getAllTakenSlots: () => db.prepare("SELECT date, time FROM appointments WHERE status != 'Cancelled'").all(),

  isSlotTaken: (date, time) => !!db.prepare("SELECT id FROM appointments WHERE date = ? AND time = ? AND status != 'Cancelled'").get(date, time),

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO appointments (date, time, clientName, email, idNumber, age, gender, service, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)
    `);
    const result = stmt.run(
      data.date, data.time, data.clientName,
      data.email || null, data.idNumber || null,
      data.age || null, data.gender || null,
      data.service, new Date().toISOString()
    );
    return appointmentQueries.getById(result.lastInsertRowid);
  },

  // Cancel keeps the row as history instead of deleting it
  cancel: (id) => {
    db.prepare("UPDATE appointments SET status = 'Cancelled' WHERE id = ?").run(id);
    return appointmentQueries.getById(id);
  },

  delete: (id) => db.prepare('DELETE FROM appointments WHERE id = ?').run(id),
};

export const inventoryQueries = {
  getAll: () => db.prepare('SELECT * FROM inventory ORDER BY type ASC, name ASC').all(),

  getById: (id) => db.prepare('SELECT * FROM inventory WHERE id = ?').get(id),

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO inventory (name, dosage, unit, quantity, price, type, size, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.name, data.dosage || '', data.unit || 'mg',
      data.quantity, data.price || 0,
      data.type || 'Medicine', data.size || null,
      new Date().toISOString()
    );
    return inventoryQueries.getById(result.lastInsertRowid);
  },

  update: (id, data) => {
    const item = inventoryQueries.getById(id);
    if (!item) return null;
    db.prepare(`
      UPDATE inventory
      SET name=?, dosage=?, unit=?, quantity=?, price=?, type=?, size=?, updatedAt=?
      WHERE id=?
    `).run(
      data.name ?? item.name,
      data.dosage ?? item.dosage,
      data.unit ?? item.unit,
      data.quantity ?? item.quantity,
      data.price ?? item.price,
      data.type ?? item.type,
      data.size ?? item.size,
      new Date().toISOString(),
      id
    );
    return inventoryQueries.getById(id);
  },

  delete: (id) => db.prepare('DELETE FROM inventory WHERE id = ?').run(id),
};

export const patientQueries = {
  getAll: () => db.prepare(`
    SELECT p.*, COUNT(DISTINCT m.id) as visitCount
    FROM patients p
    LEFT JOIN medical_records m ON m.patient_id = p.id
    GROUP BY p.id ORDER BY p.name ASC
  `).all(),

  getById: (id) => db.prepare('SELECT * FROM patients WHERE id = ?').get(id),

  getByEmail: (email) => db.prepare('SELECT * FROM patients WHERE email = ?').get(email),

  getByIdNumber: (idNumber) => db.prepare('SELECT * FROM patients WHERE id_number = ?').get(idNumber),

  getByUserId: (userId) => db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId),

  search: (q) => db.prepare(`
    SELECT p.*, COUNT(DISTINCT m.id) as visitCount
    FROM patients p
    LEFT JOIN medical_records m ON m.patient_id = p.id
    WHERE p.name LIKE ? OR p.email LIKE ? OR p.id_number LIKE ?
    GROUP BY p.id ORDER BY p.name ASC LIMIT 20
  `).all(`%${q}%`, `%${q}%`, `%${q}%`),

  getVisits: (patientId) => db.prepare(`
    SELECT * FROM medical_records WHERE patient_id = ? ORDER BY createdAt ASC
  `).all(patientId),

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO patients (user_id, name, email, id_number, dob, gender, allergies, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.user_id || null, data.name, data.email,
      data.id_number || null, data.dob || null, data.gender || null,
      data.allergies || 'None known', new Date().toISOString()
    );
    return patientQueries.getById(result.lastInsertRowid);
  },

  update: (id, data) => {
    const p = patientQueries.getById(id);
    if (!p) return null;
    db.prepare(`
      UPDATE patients SET name=?, email=?, id_number=?, dob=?, gender=?, allergies=? WHERE id=?
    `).run(
      data.name ?? p.name, data.email ?? p.email,
      data.id_number ?? p.id_number, data.dob ?? p.dob,
      data.gender ?? p.gender, data.allergies ?? p.allergies,
      id
    );
    return patientQueries.getById(id);
  },
};

export const medicalRecordQueries = {
  getAll: () => db.prepare('SELECT * FROM medical_records ORDER BY createdAt DESC').all(),

  getById: (id) => db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id),

  getByPatientId: (patientId) => db.prepare('SELECT * FROM medical_records WHERE patient_id = ? ORDER BY createdAt ASC').all(patientId),

  getByIdNumberOrEmail: (idNumber, email) => {
    if (idNumber && email)
      return db.prepare('SELECT * FROM medical_records WHERE idNumber=? OR email=? ORDER BY createdAt DESC').get(idNumber, email);
    if (idNumber)
      return db.prepare('SELECT * FROM medical_records WHERE idNumber=? ORDER BY createdAt DESC').get(idNumber);
    if (email)
      return db.prepare('SELECT * FROM medical_records WHERE email=? ORDER BY createdAt DESC').get(email);
    return null;
  },

  getByPatientName: (name) => db.prepare('SELECT * FROM medical_records WHERE patientName LIKE ? ORDER BY createdAt DESC').all(`%${name}%`),

  getAppointmentsForPatient: (idNumber, email) => {
    if (idNumber && email)
      return db.prepare('SELECT * FROM appointments WHERE idNumber=? OR email=? ORDER BY date DESC, time ASC').all(idNumber, email);
    if (idNumber)
      return db.prepare('SELECT * FROM appointments WHERE idNumber=? ORDER BY date DESC, time ASC').all(idNumber);
    if (email)
      return db.prepare('SELECT * FROM appointments WHERE email=? ORDER BY date DESC, time ASC').all(email);
    return [];
  },

  create: (data) => {
    const stmt = db.prepare(`
      INSERT INTO medical_records (
        patient_id, appointmentId, patientName, email, idNumber, age, gender,
        symptoms, diagnosis, treatment, medications, prescribedMedicines,
        allergies, bloodPressure, heartRate, temperature,
        notes, followUpDate, labResults, xrayNotes, createdAt
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const result = stmt.run(
      data.patient_id || null, data.appointmentId || null,
      data.patientName, data.email || null, data.idNumber || null,
      data.age || null, data.gender || null,
      data.symptoms, data.diagnosis, data.treatment,
      data.medications || '', data.prescribedMedicines || '',
      data.allergies || '', data.bloodPressure || null,
      data.heartRate || null, data.temperature || null,
      data.notes || '', data.followUpDate || null,
      data.labResults || '', data.xrayNotes || '',
      new Date().toISOString()
    );
    return medicalRecordQueries.getById(result.lastInsertRowid);
  },

  update: (id, data) => {
    db.prepare(`
      UPDATE medical_records
      SET patientName=?, email=?, idNumber=?, age=?, gender=?,
          symptoms=?, diagnosis=?, treatment=?, medications=?,
          prescribedMedicines=?, allergies=?, bloodPressure=?,
          heartRate=?, temperature=?, notes=?, followUpDate=?,
          labResults=?, xrayNotes=?, updatedAt=?
      WHERE id=?
    `).run(
      data.patientName, data.email || null, data.idNumber || null,
      data.age || null, data.gender || null,
      data.symptoms, data.diagnosis, data.treatment,
      data.medications || '', data.prescribedMedicines || '',
      data.allergies || '', data.bloodPressure || null,
      data.heartRate || null, data.temperature || null,
      data.notes || '', data.followUpDate || null,
      data.labResults || '', data.xrayNotes || '',
      new Date().toISOString(), id
    );
    return medicalRecordQueries.getById(id);
  },

  delete: (id) => db.prepare('DELETE FROM medical_records WHERE id = ?').run(id),
};

export const notificationQueries = {
  create: (type, message, data) => {
    const result = db.prepare(
      'INSERT INTO notifications (type, message, data, createdAt) VALUES (?,?,?,?)'
    ).run(type, message, data ? JSON.stringify(data) : null, new Date().toISOString());
    return db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
  },

  // Returns notifications this user hasn't read yet
  getUnreadForUser: (userId) => db.prepare(`
    SELECT n.* FROM notifications n
    WHERE n.id NOT IN (
      SELECT notification_id FROM notification_reads WHERE user_id = ?
    )
    ORDER BY n.createdAt DESC
  `).all(userId),

  getUnreadCountForUser: (userId) => db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE id NOT IN (
      SELECT notification_id FROM notification_reads WHERE user_id = ?
    )
  `).get(userId).count,

  markAllReadForUser: (userId) => {
    const unread = notificationQueries.getUnreadForUser(userId);
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?,?,?)'
    );
    const now = new Date().toISOString();
    const txn = db.transaction(() => unread.forEach(n => stmt.run(n.id, userId, now)));
    txn();
  },
};

export const userQueries = {
  getAll: () => db.prepare('SELECT id, email, role, name, createdAt FROM users ORDER BY createdAt DESC').all(),
  getById: (id) => db.prepare('SELECT id, email, role, name, createdAt FROM users WHERE id = ?').get(id),
  getByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  create: (data) => {
    const result = db.prepare(
      'INSERT INTO users (email, password, role, name, createdAt) VALUES (?,?,?,?,?)'
    ).run(data.email, data.password, data.role, data.name, new Date().toISOString());
    return userQueries.getById(result.lastInsertRowid);
  },
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const JUNE_DAYS = [
  '2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-06',
  '2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13',
  '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20',
  '2026-06-22','2026-06-23','2026-06-24','2026-06-25','2026-06-26','2026-06-27',
  '2026-06-29','2026-06-30',
];

const SEED_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
];

const SEED_SERVICES = [
  'General Consultation','Dental Checkup','Vaccination',
  'Physical Exam','Mental Health','Follow-up Visit',
];

const VISIT_TEMPLATES = {
  'General Consultation': {
    symptoms: 'Fatigue, mild headache, difficulty concentrating, occasional dizziness.',
    diagnosis: 'Tension headache and stress-related fatigue.',
    treatment: 'Rest, adequate hydration, and OTC analgesics as needed. Stress reduction advised.',
    bp: '118/76', hr: '78', temp: '36.7',
  },
  'Dental Checkup': {
    symptoms: 'Tooth sensitivity to cold liquids, mild bleeding gums during brushing.',
    diagnosis: 'Early-stage gingivitis with minor enamel erosion.',
    treatment: 'Professional cleaning, fluoride treatment, improved flossing routine twice daily.',
    bp: '115/74', hr: '72', temp: '36.5',
  },
  'Vaccination': {
    symptoms: 'No acute complaints. Routine immunization visit per schedule.',
    diagnosis: 'Healthy — up to date on core vaccines.',
    treatment: 'Influenza vaccine administered intramuscularly. Monitored 15 minutes post-injection.',
    bp: '112/70', hr: '70', temp: '36.6',
  },
  'Physical Exam': {
    symptoms: 'Annual physical examination. No specific complaints reported by patient.',
    diagnosis: 'Healthy young adult. BMI within normal range. All vitals within limits.',
    treatment: 'Continue healthy lifestyle. Increase daily physical activity. Follow-up in 12 months.',
    bp: '120/80', hr: '68', temp: '36.8',
  },
  'Mental Health': {
    symptoms: 'Academic stress, difficulty sleeping (5–6 hrs), low mood for past 3 weeks, reduced concentration.',
    diagnosis: 'Mild anxiety disorder with adjustment-related sleep disturbance.',
    treatment: 'Referral to campus counseling. Sleep hygiene education. Follow-up in 4 weeks.',
    bp: '122/82', hr: '88', temp: '36.9',
  },
  'Follow-up Visit': {
    symptoms: 'Improving — residual mild fatigue and occasional headache. No fever.',
    diagnosis: 'Resolving — condition stable and responding to initial treatment.',
    treatment: 'Continue current treatment plan. Reassess at next scheduled visit.',
    bp: '116/75', hr: '74', temp: '36.6',
  },
};

// [firstName, lastName, gender, dob(YYYY-MM-DD), enrollYear]
const PATIENT_LIST = [
  ['Alice','Adams','Female','2003-03-15',2021],
  ['Brian','Brown','Male','2002-07-22',2020],
  ['Catherine','Clark','Female','2004-11-08',2022],
  ['Daniel','Davis','Male','2001-05-30',2019],
  ['Emma','Edwards','Female','2005-09-14',2023],
  ['Frank','Fisher','Male','2003-01-25',2021],
  ['Grace','Garcia','Female','2002-06-18',2020],
  ['Henry','Harris','Male','2004-04-12',2022],
  ['Isabella','Jackson','Female','2001-12-03',2019],
  ['James','Johnson','Male','2005-08-27',2023],
  ['Karen','King','Female','2003-02-14',2021],
  ['Liam','Lewis','Male','2002-10-09',2020],
  ['Mia','Martin','Female','2004-07-31',2022],
  ['Nathan','Nelson','Male','2001-03-16',2019],
  ['Olivia','Ortiz','Female','2005-11-22',2023],
  ['Peter','Parker','Male','2003-05-04',2021],
  ['Quinn','Peterson','Female','2002-09-17',2020],
  ['Ryan','Rivera','Male','2004-01-28',2022],
  ['Sophia','Smith','Female','2001-06-10',2019],
  ['Tyler','Taylor','Male','2005-04-05',2023],
  ['Uma','Underwood','Female','2003-08-19',2021],
  ['Victor','Vargas','Male','2002-12-31',2020],
  ['Wendy','Williams','Female','2004-03-07',2022],
  ['Xavier','Xu','Male','2001-10-23',2019],
  ['Yara','Young','Female','2005-07-12',2023],
  ['Zoe','Zhang','Female','2003-11-29',2021],
  ['Aaron','Allen','Male','2002-04-08',2020],
  ['Bella','Baker','Female','2004-09-21',2022],
  ['Carlos','Cruz','Male','2001-01-14',2019],
  ['Diana','Diaz','Female','2005-06-06',2023],
  ['Ethan','Evans','Male','2003-07-25',2021],
  ['Fiona','Flores','Female','2002-02-11',2020],
  ['George','Gomez','Male','2004-05-18',2022],
  ['Hannah','Hill','Female','2001-09-02',2019],
  ['Ivan','Iglesias','Male','2005-03-28',2023],
  ['Julia','Jones','Female','2003-12-16',2021],
  ['Kevin','Kim','Male','2002-08-03',2020],
  ['Luna','Lopez','Female','2004-11-27',2022],
  ['Marcus','Moore','Male','2001-04-19',2019],
  ['Nina','Nguyen','Female','2005-10-08',2023],
  ['Oscar','Ortega','Male','2003-06-22',2021],
  ['Paula','Perez','Female','2002-01-07',2020],
  ['Roland','Ross','Male','2004-08-14',2022],
  ['Rosa','Ramirez','Female','2001-02-28',2019],
  ['Samuel','Sanchez','Male','2005-05-17',2023],
  ['Tara','Torres','Female','2003-09-04',2021],
  ['Ursula','Upton','Female','2002-03-20',2020],
  ['Vera','Vega','Female','2004-06-09',2022],
  ['William','Walker','Male','2001-11-15',2019],
  ['Xena','Xavier','Female','2005-02-26',2023],
];

const calcAge = (dob) => {
  const [y, m, d] = dob.split('-').map(Number);
  const today = new Date(2026, 4, 29); // May 29 2026
  let age = 2026 - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
};

const genEmail = (() => {
  const used = new Set();
  return (first, last) => {
    const base = last.toLowerCase();
    let attempt = first[0].toLowerCase() + base;
    for (let i = 1; i < first.length; i++) {
      if (!used.has(attempt)) { used.add(attempt); return `${attempt}@patient.com`; }
      attempt = first.slice(0, i + 1).toLowerCase() + base;
    }
    // fallback: append index
    let n = 2;
    while (used.has(`${attempt}${n}`)) n++;
    const final = `${attempt}${n}`;
    used.add(final);
    return `${final}@patient.com`;
  };
})();

const genIdNumber = (() => {
  const counters = {};
  const bases = { 2019: 10000, 2020: 20000, 2021: 30000, 2022: 40000, 2023: 50000 };
  return (year) => {
    counters[year] = (counters[year] || 0) + 1;
    return `${year}-${String(bases[year] + counters[year]).slice(-5)}`;
  };
})();

const seedStaffAndLegacyPatient = () => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (existing > 0) return;

  const now = new Date().toISOString();
  const ins = db.prepare('INSERT INTO users (email,password,role,name,createdAt) VALUES (?,?,?,?,?)');
  [
    ['nurse@email.com','nursePassword123','nurse','Mara Velasco'],
    ['doctor@email.com','doctorPassword123','doctor','Dr. Elias Tan'],
    ['admin@email.com','adminPassword123','admin','Joan Rivera'],
    ['patient@email.com','patientPassword123','patient','John Doe'],
  ].forEach(([e,p,r,n]) => ins.run(e,p,r,n,now));

  // Put legacy patient in patients table too
  const legacyUser = userQueries.getByEmail('patient@email.com');
  if (legacyUser) {
    db.prepare(`INSERT OR IGNORE INTO patients (user_id,name,email,id_number,dob,gender,allergies,createdAt)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      legacyUser.id,'John Doe','patient@email.com','2018-00001','2000-01-15','Male','None known',now
    );
  }
  console.log('✅ Staff + legacy patient seeded');
};

const seedInventory = () => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM inventory').get().c;
  if (existing > 0) return;

  const now = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO inventory (name,dosage,unit,quantity,price,type,size,createdAt) VALUES (?,?,?,?,?,?,?,?)`);

  const medicines = [
    ['Paracetamol','500','mg',240],['Ibuprofen','400','mg',156],
    ['Amoxicillin','250','mg',8],['Cetirizine','10','mg',92],
    ['Loratadine','10','mg',6],['Salbutamol','2','ml',34],
    ['Omeprazole','20','mg',48],['Metformin','500','mg',110],
    ['Aspirin','300','mg',4],['Cough Syrup','15','ml',27],
    ['Azithromycin','500','mg',60],['Metronidazole','400','mg',85],
    ['Prednisone','10','mg',45],['Vitamin C','500','mg',200],
    ['Iron Supplement','325','mg',120],['Loperamide','2','mg',96],
    ['Mefenamic Acid','500','mg',72],['Cloxacillin','500','mg',38],
    ['Multivitamins','—','tabs',150],['Antacid Suspension','10','ml',64],
  ];

  const supplies = [
    ['Gauze Pads','4x4 in','pcs',500,'Supply',null],
    ['Bandage Roll','3 in','rolls',80,'Supply',null],
    ['Nitrile Gloves','Medium','boxes',30,'Supply',null],
    ['Disposable Syringes','5 mL','pcs',300,'Supply',null],
    ['Alcohol Swabs','70%','pcs',400,'Supply',null],
    ['Cotton Balls','standard','pcs',600,'Supply',null],
    ['Tongue Depressors','standard','pcs',250,'Supply',null],
    ['Adhesive Bandages','1 in','pcs',350,'Supply',null],
    ['IV Bags Normal Saline','500 mL','bags',40,'Supply',null],
    ['Blood Pressure Cuff','adult','pcs',5,'Supply',null],
    ['Thermometer Covers','disposable','pcs',200,'Supply',null],
    ['Surgical Tape','1 in × 10 yd','rolls',60,'Supply',null],
    ['Sterile Gloves','Size 7','pairs',100,'Supply',null],
    ['Face Masks Surgical','standard','pcs',500,'Supply',null],
    ['Eye Drops Saline','0.9%','ml',120,'Medicine',null],
  ];

  const txn = db.transaction(() => {
    medicines.forEach(([name,dosage,unit,qty]) =>
      ins.run(name,dosage,unit,qty,0,'Medicine',null,now));
    supplies.forEach(([name,dosage,unit,qty,type,size]) =>
      ins.run(name,dosage,unit,qty,0,type,size,now));
  });
  txn();
  console.log('✅ Inventory seeded');
};

const seedPatients = () => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  if (existing > 1) return; // > 1 because legacy John Doe is already there

  const now = new Date().toISOString();
  const usedSlots = new Set();

  const nextSlot = (startDay) => {
    for (let d = startDay % JUNE_DAYS.length; d < JUNE_DAYS.length; d++) {
      for (let s = 0; s < SEED_SLOTS.length; s++) {
        const key = `${JUNE_DAYS[d]}|${SEED_SLOTS[s]}`;
        if (!usedSlots.has(key)) { usedSlots.add(key); return { date: JUNE_DAYS[d], time: SEED_SLOTS[s] }; }
      }
    }
    // wrap around
    for (let d = 0; d < JUNE_DAYS.length; d++) {
      for (let s = 0; s < SEED_SLOTS.length; s++) {
        const key = `${JUNE_DAYS[d]}|${SEED_SLOTS[s]}`;
        if (!usedSlots.has(key)) { usedSlots.add(key); return { date: JUNE_DAYS[d], time: SEED_SLOTS[s] }; }
      }
    }
    return null;
  };

  const txn = db.transaction(() => {
    PATIENT_LIST.forEach(([first, last, gender, dob, enrollYear], i) => {
      const email = genEmail(first, last);
      const idNumber = genIdNumber(enrollYear);
      const fullName = `${first} ${last}`;
      const age = calcAge(dob);

      // User account
      db.prepare('INSERT OR IGNORE INTO users (email,password,role,name,createdAt) VALUES (?,?,?,?,?)')
        .run(email, 'patientpassword', 'patient', fullName, now);
      const user = userQueries.getByEmail(email);

      // Patient record
      db.prepare('INSERT OR IGNORE INTO patients (user_id,name,email,id_number,dob,gender,allergies,createdAt) VALUES (?,?,?,?,?,?,?,?)')
        .run(user.id, fullName, email, idNumber, dob, gender, 'None known', now);
      const patient = patientQueries.getByEmail(email);

      // 2 appointments per patient
      const service1 = SEED_SERVICES[i % SEED_SERVICES.length];
      const service2 = SEED_SERVICES[(i + 3) % SEED_SERVICES.length];
      const slot1 = nextSlot(i * 2);
      const slot2 = nextSlot(i * 2 + 13);

      let apptId1 = null, apptId2 = null;
      if (slot1) {
        const appt = appointmentQueries.create({ ...slot1, clientName: fullName, email, idNumber, age, gender, service: service1 });
        apptId1 = appt.id;
      }
      if (slot2) {
        const appt = appointmentQueries.create({ ...slot2, clientName: fullName, email, idNumber, age, gender, service: service2 });
        apptId2 = appt.id;
      }

      // 2 visits (medical records) linked to patient
      const t1 = VISIT_TEMPLATES[service1];
      const t2 = VISIT_TEMPLATES[service2];

      if (slot1 && t1) {
        medicalRecordQueries.create({
          patient_id: patient.id,
          appointmentId: apptId1,
          patientName: fullName, email, idNumber,
          age, gender,
          symptoms: t1.symptoms,
          diagnosis: t1.diagnosis,
          treatment: t1.treatment,
          allergies: 'None known',
          bloodPressure: t1.bp,
          heartRate: t1.hr,
          temperature: t1.temp,
          notes: `Visit on ${slot1.date} — ${service1}.`,
          followUpDate: slot2?.date || null,
          prescribedMedicines: '[]',
        });
      }

      if (slot2 && t2) {
        medicalRecordQueries.create({
          patient_id: patient.id,
          appointmentId: apptId2,
          patientName: fullName, email, idNumber,
          age, gender,
          symptoms: t2.symptoms,
          diagnosis: t2.diagnosis,
          treatment: t2.treatment,
          allergies: 'None known',
          bloodPressure: t2.bp,
          heartRate: t2.hr,
          temperature: t2.temp,
          notes: `Follow-up visit on ${slot2.date} — ${service2}.`,
          followUpDate: null,
          prescribedMedicines: '[]',
        });
      }
    });
  });

  txn();
  console.log('✅ 50 patients + appointments + visits seeded');
};

// ── Init ──────────────────────────────────────────────────────────────────────
initSchema();
seedStaffAndLegacyPatient();
seedInventory();
seedPatients();

export const closeDatabase = () => { db.close(); console.log('Database closed'); };
export default db;
