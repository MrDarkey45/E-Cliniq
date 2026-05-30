import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import AppointmentScheduler from './components/AppointmentScheduler';
import InventoryManager from './components/InventoryManager';
import MedicalRecords from './components/MedicalRecords';

const PAGE_META = {
  dashboard:    { title: 'Dashboard',       sub: 'Your clinic at a glance' },
  appointments: { title: 'Appointments',    sub: 'Schedule and manage visits' },
  records:      { title: 'Medical Records', sub: 'Patient history and notes' },
  inventory:    { title: 'Inventory',       sub: 'Medicine stock and dosages' },
};

const PATIENT_META = {
  appointments: { title: 'My Appointments', sub: 'Your upcoming visits' },
  records:      { title: 'My Records',      sub: 'Your medical history' },
};

function App() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab]   = useState('dashboard');
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // When staff click "Open patient record" on an appointment, we stash the appointment
  // and switch to the Records tab; MedicalRecords resolves it to that patient.
  const [recordTarget, setRecordTarget] = useState(null);

  const openRecordFor = (appt) => {
    setRecordTarget({
      clientName: appt.clientName, email: appt.email, idNumber: appt.idNumber,
      age: appt.age, gender: appt.gender,
    });
    setActiveTab('records');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)',
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  const meta = (user.role === 'patient' && PATIENT_META[activeTab]) || PAGE_META[activeTab] || PAGE_META.appointments;

  return (
    <div className="app">
      <Sidebar
        user={user}
        active={activeTab}
        onNav={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={logout}
      />
      <div className="main">
        <Topbar
          title={meta.title}
          sub={meta.sub}
          user={user}
          onMenu={() => setMobileOpen(true)}
        />
        {activeTab === 'dashboard'    && <Dashboard onNav={setActiveTab} />}
        {activeTab === 'appointments' && <AppointmentScheduler onOpenRecord={openRecordFor} />}
        {activeTab === 'records'      && <MedicalRecords openFor={recordTarget} clearOpenFor={() => setRecordTarget(null)} />}
        {activeTab === 'inventory'    && <InventoryManager />}
      </div>
    </div>
  );
}

export default App;
