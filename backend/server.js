import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data storage (replace with database in production)
let appointments = [];
let inventory = [];
let medicalRecords = [];
let appointmentIdCounter = 1;
let inventoryIdCounter = 1;
let medicalRecordIdCounter = 1;

// ============ APPOINTMENT ENDPOINTS ============

// Get all appointments
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
  const { date, time, clientName, service } = req.body;
  
  if (!date || !time || !clientName || !service) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const newAppointment = {
    id: appointmentIdCounter++,
    date,
    time,
    clientName,
    service,
    createdAt: new Date().toISOString()
  };

  appointments.push(newAppointment);
  res.status(201).json(newAppointment);
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = appointments.findIndex(apt => apt.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  appointments.splice(index, 1);
  res.json({ message: 'Appointment deleted successfully' });
});

// ============ INVENTORY ENDPOINTS ============

// Get all inventory items
app.get('/api/inventory', (req, res) => {
  res.json(inventory);
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

  const newItem = {
    id: inventoryIdCounter++,
    name,
    quantity: parseInt(quantity),
    price: parseFloat(price),
    createdAt: new Date().toISOString()
  };

  inventory.push(newItem);
  res.status(201).json(newItem);
});

// Update inventory item quantity
app.put('/api/inventory/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  
  const item = inventory.find(item => item.id === id);
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ error: 'Valid quantity is required' });
  }

  item.quantity = parseInt(quantity);
  item.updatedAt = new Date().toISOString();
  
  res.json(item);
});

// Delete inventory item
app.delete('/api/inventory/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = inventory.findIndex(item => item.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  inventory.splice(index, 1);
  res.json({ message: 'Item deleted successfully' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    appointments: appointments.length,
    inventory: inventory.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📅 Appointments API: http://localhost:${PORT}/api/appointments`);
  console.log(`📦 Inventory API: http://localhost:${PORT}/api/inventory`);
});