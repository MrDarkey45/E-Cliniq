import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  appointmentQueries, inventoryQueries, medicalRecordQueries,
  patientQueries, notificationQueries, userQueries, closeDatabase,
} from './database.js';
import { generateToken, authenticate, authorize } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

process.on('SIGINT', () => { closeDatabase(); process.exit(0); });

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const user = userQueries.getByEmail(email);
    if (!user || user.password !== password)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user);
    // Include patient profile if role is patient
    let patientProfile = null;
    if (user.role === 'patient') {
      patientProfile = patientQueries.getByEmail(user.email);
    }
    res.json({
      user: { id: user.id, email: user.email, role: user.role, name: user.name, patientProfile },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  let patientProfile = null;
  if (req.user.role === 'patient') {
    patientProfile = patientQueries.getByEmail(req.user.email);
  }
  res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role, name: req.user.name, patientProfile } });
});

app.post('/api/auth/logout', (req, res) => res.json({ message: 'Logged out successfully' }));

// ── Appointments ──────────────────────────────────────────────────────────────

app.get('/api/appointments', authenticate, (req, res) => {
  try {
    res.json(appointmentQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Availability endpoint — returns only {date, time} pairs, no PII
// Patients use this to see which slots are taken without seeing other patients' data
app.get('/api/appointments/availability', authenticate, (req, res) => {
  try {
    const { date } = req.query;
    const slots = date
      ? appointmentQueries.getTakenSlots(date)
      : appointmentQueries.getAllTakenSlots();
    res.json(slots.map(s => ({ date: s.date, time: s.time })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Patient's own appointments
app.get('/api/appointments/patient/:identifier', authenticate, (req, res) => {
  try {
    const id = req.params.identifier;
    const isEmail = id.includes('@');
    const rows = isEmail
      ? medicalRecordQueries.getAppointmentsForPatient(null, id)
      : medicalRecordQueries.getAppointmentsForPatient(id, null);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient appointments' });
  }
});

// Create appointment — nurses, admins, and patients can book
app.post('/api/appointments', authenticate, authorize(['nurse', 'admin', 'patient']), (req, res) => {
  let { date, time, clientName, email, idNumber, age, gender, service } = req.body;

  // Patients can only book for themselves — override with their own details
  if (req.user.role === 'patient') {
    const profile = patientQueries.getByEmail(req.user.email);
    clientName = req.user.name;
    email      = req.user.email;
    idNumber   = profile?.id_number || idNumber;
    gender     = profile?.gender    || gender;
    if (profile?.dob) {
      const [y] = profile.dob.split('-').map(Number);
      age = 2026 - y;
    }
  }

  if (!date || !time || !clientName || !service)
    return res.status(400).json({ error: 'Date, time, client name, and service are required' });

  // Prevent booking in the past
  const now = new Date();
  const [slotH, slotM] = time.split(':').map(Number);
  const slot = new Date(`${date}T${String(slotH).padStart(2,'0')}:${String(slotM).padStart(2,'0')}:00`);
  if (slot < now)
    return res.status(400).json({ error: 'Cannot book an appointment in the past' });

  try {
    // Exact-match conflict check (30-min slots — no overlap possible between distinct slots)
    if (appointmentQueries.isSlotTaken(date, time)) {
      const available = suggestAlternatives(date);
      return res.status(409).json({
        error: 'Time slot unavailable',
        conflictingAppointment: { date, time, service },
        suggestedTimes: available,
      });
    }

    const appt = appointmentQueries.create({ date, time, clientName, email, idNumber, age, gender, service });
    res.status(201).json(appt);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Cancel appointment — nurses/admins can cancel any; patients can cancel their own only.
// The row is kept with status 'Cancelled' (history) rather than being deleted.
app.delete('/api/appointments/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const role = req.user.role;

  if (!['nurse', 'admin', 'patient'].includes(role))
    return res.status(403).json({ error: 'Insufficient permissions' });

  try {
    const appt = appointmentQueries.getById(id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Patients may only cancel appointments linked to their own email
    if (role === 'patient' && appt.email !== req.user.email)
      return res.status(403).json({ error: 'You can only cancel your own appointments' });

    if (appt.status === 'Cancelled')
      return res.status(400).json({ error: 'Appointment is already cancelled' });

    appointmentQueries.cancel(id);

    // Notify all staff when a patient cancels
    if (role === 'patient') {
      const localDate = new Date(`${appt.date}T00:00:00`);
      const dateStr = localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const [h, m] = appt.time.split(':').map(Number);
      const ap = h >= 12 ? 'PM' : 'AM';
      const timeStr = `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ap}`;
      notificationQueries.create(
        'appointment_cancelled',
        `${appt.clientName} cancelled their ${appt.service} appointment on ${dateStr} at ${timeStr}.`,
        { appointmentId: id, patientName: appt.clientName, service: appt.service, date: appt.date, time: appt.time }
      );
    }

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

const SLOT_TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
];

const suggestAlternatives = (date) => {
  const taken = new Set(appointmentQueries.getTakenSlots(date).map(s => s.time));
  return SLOT_TIMES.filter(t => !taken.has(t)).slice(0, 4);
};

// ── Patients ──────────────────────────────────────────────────────────────────

app.get('/api/patients', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    res.json(patientQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.get('/api/patients/search', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  const q = req.query.q || '';
  try {
    res.json(patientQueries.search(q));
  } catch (err) {
    res.status(500).json({ error: 'Failed to search patients' });
  }
});

app.get('/api/patients/me', authenticate, (req, res) => {
  if (req.user.role !== 'patient')
    return res.status(403).json({ error: 'Only patients can access their own profile' });
  try {
    const profile = patientQueries.getByEmail(req.user.email);
    res.json(profile || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/patients/:id', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    const patient = patientQueries.getById(parseInt(req.params.id));
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const visits = patientQueries.getVisits(patient.id);
    res.json({ ...patient, visits });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

app.post('/api/patients', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  const { name, email, id_number, dob, gender, allergies } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  try {
    // Create a user account for the patient if none exists
    let user = userQueries.getByEmail(email);
    if (!user) {
      user = userQueries.create({
        email, password: 'patientpassword', role: 'patient', name,
      });
    }
    const patient = patientQueries.create({ user_id: user.id, name, email, id_number, dob, gender, allergies });
    res.status(201).json(patient);
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.put('/api/patients/:id', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    const updated = patientQueries.update(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Patient not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Patient visits (their medical records)
app.get('/api/patients/:id/visits', authenticate, (req, res) => {
  try {
    const visits = patientQueries.getVisits(parseInt(req.params.id));
    res.json(visits);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// ── Inventory ─────────────────────────────────────────────────────────────────

app.get('/api/inventory', authenticate, (req, res) => {
  try {
    res.json(inventoryQueries.getAll());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.post('/api/inventory', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const { name, dosage, unit, quantity, type, size } = req.body;
  if (!name || quantity === undefined) return res.status(400).json({ error: 'Name and quantity are required' });
  if (quantity < 0) return res.status(400).json({ error: 'Quantity must be non-negative' });
  try {
    res.status(201).json(inventoryQueries.create({
      name, dosage: dosage || '', unit: unit || (type === 'Supply' ? 'pcs' : 'mg'),
      quantity: parseInt(quantity), price: 0, type: type || 'Medicine', size: size || null,
    }));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

app.put('/api/inventory/:id', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const item = inventoryQueries.getById(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (req.body.quantity !== undefined && req.body.quantity < 0)
      return res.status(400).json({ error: 'Quantity must be non-negative' });
    res.json(inventoryQueries.update(id, req.body));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

app.delete('/api/inventory/:id', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  try {
    const result = inventoryQueries.delete(parseInt(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// ── Medical Records (visit-centric) ───────────────────────────────────────────

app.get('/api/medical-records', authenticate, (req, res) => {
  try {
    let records = medicalRecordQueries.getAll();
    if (req.user.role === 'patient') {
      records = records.filter(r =>
        r.email === req.user.email ||
        r.patientName.toLowerCase().includes(req.user.name.toLowerCase())
      );
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.post('/api/medical-records', authenticate, authorize(['doctor', 'nurse', 'admin']), (req, res) => {
  const {
    patient_id, appointmentId, patientName, age, gender, email, idNumber,
    diagnosis, symptoms, treatment, medications, allergies,
    bloodPressure, heartRate, temperature, notes, followUpDate,
    labResults, xrayNotes, prescribedMedicines,
  } = req.body;

  if (!patientName || !diagnosis || !symptoms || !treatment)
    return res.status(400).json({ error: 'Patient name, diagnosis, symptoms, and treatment are required' });

  try {
    // Deduct prescribed medicines from inventory
    const inventoryUpdates = deductPrescriptions(prescribedMedicines);
    if (inventoryUpdates.error) return res.status(400).json({ error: inventoryUpdates.error });

    const record = medicalRecordQueries.create({
      patient_id: patient_id || null,
      appointmentId, patientName, email, idNumber, age, gender,
      symptoms, diagnosis, treatment, medications, prescribedMedicines,
      allergies, bloodPressure, heartRate, temperature,
      notes, followUpDate, labResults, xrayNotes,
    });
    res.status(201).json({ record, inventoryUpdates: inventoryUpdates.updates });
  } catch (err) {
    console.error('Error creating record:', err);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

app.get('/api/medical-records/:id', authenticate, (req, res) => {
  try {
    const record = medicalRecordQueries.getById(parseInt(req.params.id));
    if (!record) return res.status(404).json({ error: 'Record not found' });
    if (req.user.role === 'patient' &&
        record.email !== req.user.email &&
        !record.patientName.toLowerCase().includes(req.user.name.toLowerCase()))
      return res.status(403).json({ error: 'Access denied' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

app.put('/api/medical-records/:id', authenticate, authorize(['doctor', 'nurse', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const existing = medicalRecordQueries.getById(id);
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    // Reconcile inventory on prescription change
    const inventoryUpdates = reconcilePrescriptions(existing.prescribedMedicines, req.body.prescribedMedicines);
    if (inventoryUpdates.error) return res.status(400).json({ error: inventoryUpdates.error });

    const record = medicalRecordQueries.update(id, req.body);
    res.json({ record, inventoryUpdates: inventoryUpdates.updates });
  } catch (err) {
    console.error('Error updating record:', err);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.delete('/api/medical-records/:id', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    const result = medicalRecordQueries.delete(parseInt(req.params.id));
    if (result.changes === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

app.get('/api/medical-records/search/:name', authenticate, authorize(['doctor', 'nurse', 'admin']), (req, res) => {
  try {
    res.json(medicalRecordQueries.getByPatientName(req.params.name));
  } catch (err) {
    res.status(500).json({ error: 'Failed to search records' });
  }
});

// ── Prescription helpers ──────────────────────────────────────────────────────

const parseMeds = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

const deductPrescriptions = (prescribedMedicines) => {
  const meds = parseMeds(prescribedMedicines);
  const updates = [];
  for (const med of meds) {
    const item = inventoryQueries.getById(med.id);
    if (!item) continue;
    const newQty = item.quantity - (med.quantity || 1);
    if (newQty < 0)
      return { error: `Insufficient stock for ${item.name}. Available: ${item.quantity}, needed: ${med.quantity || 1}.` };
    inventoryQueries.update(med.id, { quantity: newQty });
    updates.push({ medicineId: med.id, medicineName: item.name, quantityDeducted: med.quantity || 1, newStock: newQty });
  }
  return { updates };
};

const reconcilePrescriptions = (oldRaw, newRaw) => {
  const oldMeds = parseMeds(oldRaw);
  const newMeds = parseMeds(newRaw);
  const changes = new Map();

  oldMeds.forEach(m => changes.set(m.id, (changes.get(m.id) || 0) + (m.quantity || 1)));  // restore old
  newMeds.forEach(m => changes.set(m.id, (changes.get(m.id) || 0) - (m.quantity || 1)));  // deduct new

  const updates = [];
  for (const [medId, delta] of changes) {
    if (delta === 0) continue;
    const item = inventoryQueries.getById(medId);
    if (!item) continue;
    const newQty = item.quantity + delta;
    if (newQty < 0)
      return { error: `Insufficient stock for ${item.name}. Available: ${item.quantity}.` };
    inventoryQueries.update(medId, { quantity: newQty });
    updates.push({ medicineId: medId, medicineName: item.name, quantityChange: delta, newStock: newQty });
  }
  return { updates };
};

// ── Notifications ─────────────────────────────────────────────────────────────

// Get unread notifications for the current user (staff only)
app.get('/api/notifications', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    const notifications = notificationQueries.getUnreadForUser(req.user.id);
    const count = notificationQueries.getUnreadCountForUser(req.user.id);
    res.json({ notifications, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all notifications as read for the current user
app.put('/api/notifications/read', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  try {
    notificationQueries.markAllReadForUser(req.user.id);
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
