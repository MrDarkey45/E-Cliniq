import { useState } from 'react';
import AppointmentScheduler from './components/AppointmentScheduler';
import InventoryManager from './components/InventoryManager';
import MedicalRecords from './components/MedicalRecords';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('appointments');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            {!sidebarCollapsed && <h2>E-Cliniq</h2>}
            {!sidebarCollapsed && <p>Medical System</p>}
          </div>
          <button 
            className="toggle-btn" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <span className="nav-icon">📅</span>
            {!sidebarCollapsed && <span className="nav-text">Appointments</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            <span className="nav-icon">🏥</span>
            {!sidebarCollapsed && <span className="nav-text">Medical Records</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-icon">💊</span>
            {!sidebarCollapsed && <span className="nav-text">Inventory</span>}
          </button>
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <p>Version 1.0</p>
            <p>© 2024 E-Cliniq</p>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-content">
            <h1>
              {activeTab === 'appointments' && '📅 Appointments'}
              {activeTab === 'medical' && '🏥 Medical Records'}
              {activeTab === 'inventory' && '💊 Medicine Inventory'}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'appointments' && 'Schedule and manage patient appointments'}
              {activeTab === 'medical' && 'Patient medical history and records'}
              {activeTab === 'inventory' && 'Manage medicine stock and dosages'}
            </p>
          </div>
        </header>

        <div className="content-wrapper">
          {activeTab === 'appointments' && <AppointmentScheduler />}
          {activeTab === 'medical' && <MedicalRecords />}
          {activeTab === 'inventory' && <InventoryManager />}
        </div>
      </main>
    </div>
  );
}

export default App;