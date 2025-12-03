import { useState } from 'react';
import AppointmentScheduler from './components/AppointmentScheduler';
import InventoryManager from './components/InventoryManager';
import MedicalRecords from './components/MedicalRecords';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('appointments');

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 E-Cliniq</h1>
        <p>Manage appointments, inventory, and patient records</p>
      </header>

      <nav className="tab-navigation">
        <button
          className={activeTab === 'appointments' ? 'active' : ''}
          onClick={() => setActiveTab('appointments')}
        >
          📅 Appointments
        </button>
        <button
          className={activeTab === 'medical' ? 'active' : ''}
          onClick={() => setActiveTab('medical')}
        >
          🏥 Medical Records
        </button>
        <button
          className={activeTab === 'inventory' ? 'active' : ''}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
      </nav>

      <main className="app-content">
        {activeTab === 'appointments' && <AppointmentScheduler />}
        {activeTab === 'medical' && <MedicalRecords />}
        {activeTab === 'inventory' && <InventoryManager />}
      </main>

      <footer className="app-footer">
        <p>Built with React, Node.js, and Express</p>
      </footer>
    </div>
  );
}

export default App;