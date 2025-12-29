import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { appointmentQueries, inventoryQueries, medicalRecordQueries, userQueries, closeDatabase } from './database.js';
import { generateToken, authenticate, authorize, authorizePatientRecords } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

// ============ AUTHENTICATION ENDPOINTS ============

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = userQueries.getByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user);

    // Return user info and token (excluding password)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name
    }
  });
});

// Logout endpoint (mainly for frontend to clear token)
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ============ APPOINTMENT ENDPOINTS ============

// Get all appointments (requires authentication)
app.get('/api/appointments', authenticate, (req, res) => {
  try {
    const appointments = appointmentQueries.getAll();
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Helper function to check for appointment conflicts
const checkAppointmentConflict = (date, time) => {
  const allAppointments = appointmentQueries.getAll();
  const appointmentsOnDate = allAppointments.filter(apt => apt.date === date);

  // Parse the requested time (format: "HH:MM")
  const [reqHour, reqMin] = time.split(':').map(Number);
  const requestedMinutes = reqHour * 60 + reqMin;

  // Check for conflicts (assuming 1-hour appointment slots)
  for (const apt of appointmentsOnDate) {
    const [aptHour, aptMin] = apt.time.split(':').map(Number);
    const aptMinutes = aptHour * 60 + aptMin;

    // Conflict if appointments are within 1 hour of each other
    if (Math.abs(requestedMinutes - aptMinutes) < 60) {
      return apt;
    }
  }

  return null;
};

// Helper function to suggest alternative appointment times
const suggestAlternativeTimes = (date) => {
  const allAppointments = appointmentQueries.getAll();
  const appointmentsOnDate = allAppointments.filter(apt => apt.date === date);

  // Working hours: 8:00 AM - 5:00 PM (last appointment at 4:00 PM for 1-hour slot)
  const workStart = 8 * 60; // 8:00 AM in minutes
  const workEnd = 16 * 60;  // 4:00 PM in minutes (last slot start)

  // Get all occupied time slots
  const occupiedSlots = appointmentsOnDate.map(apt => {
    const [hour, min] = apt.time.split(':').map(Number);
    return hour * 60 + min;
  });

  // Find available slots
  const suggestions = [];
  for (let minutes = workStart; minutes <= workEnd; minutes += 60) {
    // Check if this slot is available (no appointment within 1 hour)
    const isAvailable = !occupiedSlots.some(occupied =>
      Math.abs(minutes - occupied) < 60
    );

    if (isAvailable && suggestions.length < 3) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      suggestions.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    }
  }

  return suggestions;
};

// Create new appointment (requires nurse or admin role)
app.post('/api/appointments', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const { date, time, clientName, email, idNumber, age, gender, service } = req.body;

  if (!date || !time || !clientName || !service) {
    return res.status(400).json({ error: 'Date, time, client name, and service are required' });
  }

  try {
    // Check for appointment conflicts
    const conflictingAppointment = checkAppointmentConflict(date, time);

    if (conflictingAppointment) {
      const suggestedTimes = suggestAlternativeTimes(date);
      return res.status(409).json({
        error: 'Time slot unavailable',
        conflictingAppointment: {
          id: conflictingAppointment.id,
          time: conflictingAppointment.time,
          clientName: conflictingAppointment.clientName,
          service: conflictingAppointment.service
        },
        suggestedTimes: suggestedTimes.length > 0 ? suggestedTimes : ['No available slots today']
      });
    }

    // Create the appointment
    const newAppointment = appointmentQueries.create({
      date,
      time,
      clientName,
      email: email || null,
      idNumber: idNumber || null,
      age: age || null,
      gender: gender || null,
      service
    });

    // Auto-create or update medical record if patient has ID number or email
    if (idNumber || email) {
      // Check if patient already has a medical record
      const existingRecord = medicalRecordQueries.getByIdNumberOrEmail(idNumber, email);

      if (!existingRecord) {
        // Create new medical record with appointment link
        medicalRecordQueries.create({
          appointmentId: newAppointment.id,
          patientName: clientName,
          email: email || null,
          idNumber: idNumber || null,
          age: age || null,
          gender: gender || null,
          symptoms: 'Scheduled appointment',
          diagnosis: 'Pending examination',
          treatment: 'To be determined',
          medications: '',
          allergies: '',
          bloodPressure: null,
          heartRate: null,
          temperature: null,
          notes: `Auto-created from appointment on ${date} at ${time}`,
          followUpDate: date,
          labResults: '',
          xrayNotes: ''
        });
      }
      // If record exists, we don't update it - medical staff will add details manually
    }

    res.status(201).json(newAppointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});
// Get appointments for a patient (by ID number or email)
app.get('/api/appointments/patient/:identifier', authenticate, (req, res) => {
  const identifier = req.params.identifier;

  try {
    // Try to determine if identifier is email or ID number
    const isEmail = identifier.includes('@');
    const appointments = isEmail
      ? medicalRecordQueries.getAppointmentsForPatient(null, identifier)
      : medicalRecordQueries.getAppointmentsForPatient(identifier, null);

    res.json(appointments);
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
    res.status(500).json({ error: 'Failed to fetch patient appointments' });
  }
});

// Delete appointment (requires nurse or admin role)
app.delete('/api/appointments/:id', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = appointmentQueries.delete(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// ============ INVENTORY ENDPOINTS ============

// Get all inventory items (requires authentication)
app.get('/api/inventory', authenticate, (req, res) => {
  try {
    const inventory = inventoryQueries.getAll();
    res.json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Add new inventory item (requires nurse or admin role)
app.post('/api/inventory', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const { name, dosage, unit, quantity } = req.body;

  console.log('Received inventory data:', { name, dosage, unit, quantity });

  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Name and quantity are required' });
  }

  if (quantity < 0) {
    return res.status(400).json({ error: 'Quantity must be positive' });
  }

  try {
    const newItem = inventoryQueries.create({
      name,
      dosage: dosage || '',
      unit: unit || 'mg',
      quantity: parseInt(quantity),
      price: 0 // Default price to 0 since it's not required
    });
    console.log('Created item:', newItem);
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating inventory item:', err);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item (requires nurse or admin role)
app.put('/api/inventory/:id', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, dosage, unit, quantity } = req.body;

  try {
    const item = inventoryQueries.getById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if it's a full update or just quantity
    if (name || dosage !== undefined || unit !== undefined) {
      // Full update
      const updatedItem = inventoryQueries.update(id, {
        name: name || item.name,
        dosage: dosage !== undefined ? dosage : item.dosage,
        unit: unit !== undefined ? unit : (item.unit || 'mg'),
        quantity: quantity !== undefined ? parseInt(quantity) : item.quantity,
        price: item.price || 0 // Keep existing price or default to 0
      });
      res.json(updatedItem);
    } else if (quantity !== undefined) {
      // Quick quantity update
      if (quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be positive' });
      }
      const updatedItem = inventoryQueries.update(id, { quantity: parseInt(quantity) });
      res.json(updatedItem);
    } else {
      return res.status(400).json({ error: 'No fields to update' });
    }
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item (requires nurse or admin role)
app.delete('/api/inventory/:id', authenticate, authorize(['nurse', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const result = inventoryQueries.delete(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// ============ MEDICAL RECORDS ENDPOINTS ============

// Get all medical records (requires authentication, patients see only their own)
app.get('/api/medical-records', authenticate, authorizePatientRecords, (req, res) => {
  try {
    let records = medicalRecordQueries.getAll();

    // If user is a patient, filter to show only their records
    if (req.user.role === 'patient') {
      records = records.filter(record =>
        record.email === req.user.email ||
        record.patientName.toLowerCase().includes(req.user.name.toLowerCase())
      );
    }

    res.json(records);
  } catch (err) {
    console.error('Error fetching medical records:', err);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

// Create new medical record (requires doctor or nurse role)
app.post('/api/medical-records', authenticate, authorize(['doctor', 'nurse']), (req, res) => {
  const {
    appointmentId, patientName, age, gender, email, idNumber, diagnosis, symptoms, treatment,
    medications, allergies, bloodPressure, heartRate, temperature,
    notes, followUpDate, labResults, xrayNotes, prescribedMedicines
  } = req.body;

  if (!patientName || !diagnosis || !symptoms || !treatment) {
    return res.status(400).json({ error: 'Patient name, diagnosis, symptoms, and treatment are required' });
  }

  try {
    // Check for duplicate medical records
    if (idNumber || email) {
      const existingRecord = medicalRecordQueries.getByIdNumberOrEmail(idNumber, email);

      if (existingRecord) {
        // Return 409 Conflict with information about the existing record
        return res.status(409).json({
          error: 'Record exists for this patient',
          existingRecordId: existingRecord.id,
          message: 'A medical record already exists for this patient. Please edit the existing record instead of creating a new one.',
          existingRecord: {
            id: existingRecord.id,
            patientName: existingRecord.patientName,
            email: existingRecord.email,
            idNumber: existingRecord.idNumber,
            createdAt: existingRecord.createdAt,
            diagnosis: existingRecord.diagnosis
          }
        });
      }
    }

    // Deduct prescribed medicines from inventory
    const inventoryUpdates = [];
    if (prescribedMedicines) {
      let prescribedMedsArray = [];
      try {
        prescribedMedsArray = typeof prescribedMedicines === 'string'
          ? JSON.parse(prescribedMedicines)
          : prescribedMedicines;
      } catch (err) {
        console.error('Error parsing prescribedMedicines:', err);
      }

      for (const med of prescribedMedsArray) {
        const inventoryItem = inventoryQueries.getById(med.id);
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity - (med.quantity || 1);
          if (newQuantity < 0) {
            const shortage = Math.abs(newQuantity);
            return res.status(400).json({
              error: `Insufficient stock for ${inventoryItem.name}. Currently available: ${inventoryItem.quantity} units. Prescription requires: ${med.quantity || 1} units. Short by: ${shortage} units. Please restock or reduce prescription quantity.`
            });
          }
          inventoryQueries.update(med.id, { quantity: newQuantity });
          inventoryUpdates.push({
            medicineId: med.id,
            medicineName: inventoryItem.name,
            quantityDeducted: med.quantity || 1,
            newStock: newQuantity
          });
        }
      }
    }

    const newRecord = medicalRecordQueries.create({
      appointmentId,
      patientName,
      age,
      gender,
      email: email || null,
      idNumber: idNumber || null,
      diagnosis,
      symptoms,
      treatment,
      medications,
      prescribedMedicines,
      allergies,
      bloodPressure,
      heartRate,
      temperature,
      notes,
      followUpDate,
      labResults,
      xrayNotes
    });

    res.status(201).json({
      record: newRecord,
      inventoryUpdates: inventoryUpdates
    });
  } catch (err) {
    console.error('Error creating medical record:', err);
    res.status(500).json({ error: 'Failed to create medical record' });
  }
});

// Get medical record by ID (requires authentication)
app.get('/api/medical-records/:id', authenticate, authorizePatientRecords, (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const record = medicalRecordQueries.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    // If user is a patient, check if they can access this record
    if (req.user.role === 'patient') {
      if (record.email !== req.user.email && !record.patientName.toLowerCase().includes(req.user.name.toLowerCase())) {
        return res.status(403).json({ error: 'Access denied to this medical record' });
      }
    }

    res.json(record);
  } catch (err) {
    console.error('Error fetching medical record:', err);
    res.status(500).json({ error: 'Failed to fetch medical record' });
  }
});

// Update medical record (requires doctor or nurse role)
app.put('/api/medical-records/:id', authenticate, authorize(['doctor', 'nurse']), (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;

  try {
    const record = medicalRecordQueries.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    // Handle inventory updates if prescribedMedicines changed
    const inventoryUpdates = [];
    if (data.prescribedMedicines) {
      // Parse old and new prescribed medicines
      let oldMeds = [];
      let newMeds = [];

      try {
        oldMeds = record.prescribedMedicines
          ? (typeof record.prescribedMedicines === 'string'
              ? JSON.parse(record.prescribedMedicines)
              : record.prescribedMedicines)
          : [];
      } catch (err) {
        console.error('Error parsing old prescribedMedicines:', err);
      }

      try {
        newMeds = typeof data.prescribedMedicines === 'string'
          ? JSON.parse(data.prescribedMedicines)
          : data.prescribedMedicines;
      } catch (err) {
        console.error('Error parsing new prescribedMedicines:', err);
      }

      // Calculate the difference in quantities
      const quantityChanges = new Map();

      // Add back quantities from old prescriptions
      oldMeds.forEach(med => {
        const current = quantityChanges.get(med.id) || 0;
        quantityChanges.set(med.id, current + (med.quantity || 1));
      });

      // Subtract quantities from new prescriptions
      newMeds.forEach(med => {
        const current = quantityChanges.get(med.id) || 0;
        quantityChanges.set(med.id, current - (med.quantity || 1));
      });

      // Apply the changes to inventory
      for (const [medId, quantityChange] of quantityChanges) {
        if (quantityChange !== 0) {
          const inventoryItem = inventoryQueries.getById(medId);
          if (inventoryItem) {
            const newQuantity = inventoryItem.quantity + quantityChange;
            if (newQuantity < 0) {
              const shortage = Math.abs(newQuantity);
              const additionalNeeded = Math.abs(quantityChange);
              return res.status(400).json({
                error: `Insufficient stock for ${inventoryItem.name}. Currently available: ${inventoryItem.quantity} units. Additional units needed: ${additionalNeeded}. Short by: ${shortage} units. Please restock or reduce prescription quantity.`
              });
            }
            inventoryQueries.update(medId, { quantity: newQuantity });
            inventoryUpdates.push({
              medicineId: medId,
              medicineName: inventoryItem.name,
              quantityChange: quantityChange,
              newStock: newQuantity
            });
          }
        }
      }
    }

    // Include email and idNumber in the update data
    const updatedData = {
      ...data,
      email: data.email || null,
      idNumber: data.idNumber || null
    };

    const updatedRecord = medicalRecordQueries.update(id, updatedData);
    res.json({
      record: updatedRecord,
      inventoryUpdates: inventoryUpdates
    });
  } catch (err) {
    console.error('Error updating medical record:', err);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

// Delete medical record (requires nurse, doctor or admin role)
app.delete('/api/medical-records/:id', authenticate, authorize(['nurse', 'doctor', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const result = medicalRecordQueries.delete(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    res.json({ message: 'Medical record deleted successfully' });
  } catch (err) {
    console.error('Error deleting medical record:', err);
    res.status(500).json({ error: 'Failed to delete medical record' });
  }
});

// Search medical records by patient name (requires authentication)
app.get('/api/medical-records/search/:name', authenticate, authorize(['doctor', 'nurse', 'admin']), (req, res) => {
  const name = req.params.name;

  try {
    const records = medicalRecordQueries.getByPatientName(name);
    res.json(records);
  } catch (err) {
    console.error('Error searching medical records:', err);
    res.status(500).json({ error: 'Failed to search medical records' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const appointments = appointmentQueries.getAll();
    const inventory = inventoryQueries.getAll();
    const medicalRecords = medicalRecordQueries.getAll();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'SQLite',
      appointments: appointments.length,
      inventory: inventory.length,
      medicalRecords: medicalRecords.length
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📅 Appointments API: http://localhost:${PORT}/api/appointments`);
  console.log(`📦 Inventory API: http://localhost:${PORT}/api/inventory`);
  console.log(`🏥 Medical Records API: http://localhost:${PORT}/api/medical-records`);
  console.log(`💾 Database: SQLite (medical-practice.db)`);
});