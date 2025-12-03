import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { appointmentQueries, inventoryQueries, medicalRecordQueries, closeDatabase } from './database.js';

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

// ============ APPOINTMENT ENDPOINTS ============

// Get all appointments
app.get('/api/appointments', (req, res) => {
  try {
    const appointments = appointmentQueries.getAll();
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
  const { date, time, clientName, service } = req.body;
  
  if (!date || !time || !clientName || !service) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newAppointment = appointmentQueries.create({ date, time, clientName, service });
    res.status(201).json(newAppointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
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

// Get all inventory items
app.get('/api/inventory', (req, res) => {
  try {
    const inventory = inventoryQueries.getAll();
    res.json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Add new inventory item
app.post('/api/inventory', (req, res) => {
  const { name, quantity, price } = req.body;
  
  if (!name || quantity === undefined || price === undefined) {
    return res.status(400).json({ error: 'Name, quantity, and price are required' });
  }

  if (quantity < 0 || price < 0) {
    return res.status(400).json({ error: 'Quantity and price must be positive' });
  }

  try {
    const newItem = inventoryQueries.create({ 
      name, 
      quantity: parseInt(quantity), 
      price: parseFloat(price) 
    });
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Error creating inventory item:', err);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item quantity
app.put('/api/inventory/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }

  try {
    const item = inventoryQueries.getById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = inventoryQueries.update(id, { quantity: parseInt(quantity) });
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
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

// Get all medical records
app.get('/api/medical-records', (req, res) => {
  try {
    const records = medicalRecordQueries.getAll();
    res.json(records);
  } catch (err) {
    console.error('Error fetching medical records:', err);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

// Create new medical record
app.post('/api/medical-records', (req, res) => {
  const { 
    appointmentId, patientName, age, gender, diagnosis, symptoms, treatment, 
    medications, allergies, bloodPressure, heartRate, temperature, 
    notes, followUpDate, labResults, xrayNotes 
  } = req.body;
  
  if (!patientName || !diagnosis || !symptoms || !treatment) {
    return res.status(400).json({ error: 'Patient name, diagnosis, symptoms, and treatment are required' });
  }

  try {
    const newRecord = medicalRecordQueries.create({
      appointmentId, patientName, age, gender, diagnosis, symptoms, treatment,
      medications, allergies, bloodPressure, heartRate, temperature,
      notes, followUpDate, labResults, xrayNotes
    });
    res.status(201).json(newRecord);
  } catch (err) {
    console.error('Error creating medical record:', err);
    res.status(500).json({ error: 'Failed to create medical record' });
  }
});

// Get medical record by ID
app.get('/api/medical-records/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  try {
    const record = medicalRecordQueries.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }
    res.json(record);
  } catch (err) {
    console.error('Error fetching medical record:', err);
    res.status(500).json({ error: 'Failed to fetch medical record' });
  }
});

// Update medical record
app.put('/api/medical-records/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = req.body;
  
  try {
    const record = medicalRecordQueries.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    const updatedRecord = medicalRecordQueries.update(id, data);
    res.json(updatedRecord);
  } catch (err) {
    console.error('Error updating medical record:', err);
    res.status(500).json({ error: 'Failed to update medical record' });
  }
});

// Delete medical record
app.delete('/api/medical-records/:id', (req, res) => {
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

// Search medical records by patient name
app.get('/api/medical-records/search/:name', (req, res) => {
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