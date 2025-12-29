import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AppointmentScheduler from './components/AppointmentScheduler';
import InventoryManager from './components/InventoryManager';
import MedicalRecords from './components/MedicalRecords';
import { FaCalendarAlt, FaHospital, FaPills, FaChevronLeft, FaChevronRight, FaSignOutAlt } from 'react-icons/fa';
import './App.css';

function App() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

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
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <span className="nav-icon"><FaCalendarAlt /></span>
            {!sidebarCollapsed && <span className="nav-text">Appointments</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            <span className="nav-icon"><FaHospital /></span>
            {!sidebarCollapsed && <span className="nav-text">Medical Records</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-icon"><FaPills /></span>
            {!sidebarCollapsed && <span className="nav-text">Inventory</span>}
          </button>
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="user-info">
              <p className="user-name">{user?.name}</p>
              <p className="user-role">{user?.role?.toUpperCase()}</p>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt style={{ marginRight: '8px' }} />
              Logout
            </button>
            <p style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>Version 1.0</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>© 2024 E-Cliniq</p>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-content">
            <h1>
              {activeTab === 'appointments' && <><FaCalendarAlt style={{ marginRight: '12px', verticalAlign: 'middle' }} /> Appointments</>}
              {activeTab === 'medical' && <><FaHospital style={{ marginRight: '12px', verticalAlign: 'middle' }} /> Medical Records</>}
              {activeTab === 'inventory' && <><FaPills style={{ marginRight: '12px', verticalAlign: 'middle' }} /> Medicine Inventory</>}
            </h1>
            <p className="header-subtitle">
              {activeTab === 'appointments' && 'Schedule and manage patient appointments'}
              {activeTab === 'medical' && 'Patient medical history and records'}
              {activeTab === 'inventory' && 'Manage medicine stock and dosages'}
            </p>
          </div>
          <div className="header-user">
            <span className="user-badge">{user?.role}</span>
            <span className="user-email">{user?.email}</span>
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