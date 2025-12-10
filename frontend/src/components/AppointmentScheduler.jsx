import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function AppointmentScheduler() {
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    clientName: '',
    email: '',
    idNumber: '',
    service: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [modalOpen, setModalOpen] = useState(false); // New state for modal
  const [selectedDate, setSelectedDate] = useState(null); // New state for selected date
  const [appointmentsForDate, setAppointmentsForDate] = useState([]); // New state for appointments for selected date

  // Group appointments by date
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const date = apt.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {});

  // Get today's date for calendar context
  const today = new Date().toISOString().split('T')[0];

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_URL}/appointments`);
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError('Failed to fetch appointments');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create appointment');

      const newAppointment = await response.json();
      setAppointments([...appointments, newAppointment]);
      setFormData({ date: '', time: '', clientName: '', email: '', idNumber: '', service: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;

    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete appointment');

      setAppointments(appointments.filter(apt => apt.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format ID Number as XXXX-XXXXX
    if (name === 'idNumber') {
      const numbers = value.replace(/\D/g, '');
      let formatted = numbers;
      
      if (numbers.length > 4) {
        formatted = numbers.slice(0, 4) + '-' + numbers.slice(4, 9);
      }
      
      setFormData({
        ...formData,
        [name]: formatted
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const toggleView = () => {
    setView(view === 'list' ? 'calendar' : 'list');
  };

  const generateCalendarDays = () => {
    const days = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (let i = 0; i < (end - start) / (24 * 60 * 60 * 1000) + 1; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Handle date click to open modal
  const handleDateClick = (date) => {
    // Fetch appointments for that date
    const filtered = appointments.filter(apt => apt.date === date);
    setAppointmentsForDate(filtered);
    setSelectedDate(date);
    setModalOpen(true); // Open modal
  };

  // Close modal
  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
    setAppointmentsForDate([]);
  };

  return (
    <div className="scheduler-container">
      <h2>📅 Appointment Scheduler</h2>

      {error && <div className="error-message">{error}</div>}

      {/* Toggle View Button */}
      <button onClick={toggleView} className="toggle-view-btn">
        {view === 'list' ? '📅 Calendar View' : '📋 List View'}
      </button>

      {/* Form */}
      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
          <label>Date:</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Time:</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Client Name:</label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="client@email.com"
          />
        </div>

        <div className="form-group">
          <label>ID Number:</label>
          <input
            type="text"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleChange}
            placeholder="1234-56789"
            maxLength="10"
          />
        </div>

        <div className="form-group">
          <label>Service:</label>
          <input
            type="text"
            name="service"
            value={formData.service}
            onChange={handleChange}
            placeholder="Consultation"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Appointment'}
        </button>
      </form>

      {/* Calendar View */}
{view === 'calendar' && (
  <div className="calendar-view">
    <h3>🗓️ Calendar View — Appointments by Date</h3>
    <div className="calendar-grid">
      {/* Generate calendar for current month */}
      <div className="calendar-header">
        <div className="month-display">
          <span>🗓️ {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Render grid of calendar days */}
      {calendarDays.map((date) => {
        const count = groupedAppointments[date] ? groupedAppointments[date].length : 0;
        const isToday = new Date(date).toDateString() === new Date().toDateString();
        const isPast = new Date(date) < new Date();

        // Extract day of month (e.g., "1", "2", "30")
        const dayOfMonth = new Date(date).getDate();
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'short' });

        return (
          <div
            key={date}
            className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${count > 0 ? 'has-appointments' : ''}`}
            style={{
              backgroundColor: isToday ? '#e8f4fd' : isPast ? '#f8f9fa' : '#fff',
              border: count > 0 ? `2px solid #667eea` : 'none',
              cursor: count > 0 ? 'pointer' : 'default',
              padding: '10px',
              textAlign: 'center',
              fontSize: '1.1rem',
              fontWeight: count > 0 ? 'bold' : 'normal',
              borderRadius: '6px',
              color: count > 0 ? '#667eea' : '#333',
              transition: 'all 0.2s',
              minWidth: '120px',
            }}
            onClick={() => handleDateClick(date)} // Open modal on click
          >
            <span className="day">{dayOfMonth}</span>
            {count > 0 && (
              <span className="appointment-badge">
                {count}
              </span>
            )}
            <span className="day-of-week">{dayOfWeek}</span>
          </div>
        );
      })}
    </div>
  </div>
)}

      {/* List View */}
      {view === 'list' && (
        <div className="appointments-list">
          <h3>Scheduled Appointments ({appointments.length})</h3>
          {appointments.length === 0 ? (
            <p className="empty-state">No appointments scheduled yet</p>
          ) : (
            <div className="appointments-grid">
              {appointments.map((apt) => (
                <div key={apt.id} className="appointment-card">
                  <div className="appointment-header">
                    <span className="appointment-date">{apt.date}</span>
                    <span className="appointment-time">{apt.time}</span>
                  </div>
                  <div className="appointment-body">
                    <p><strong>{apt.clientName}</strong></p>
                    {apt.email && <p className="appointment-email">📧 {apt.email}</p>}
                    {apt.idNumber && <p className="appointment-id">🆔 {apt.idNumber}</p>}
                    <p className="service-name">{apt.service}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for Appointment Details */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content">
            <h3>📅 Appointments for {selectedDate}</h3>
            {appointmentsForDate.length === 0 ? (
              <p>No appointments scheduled for this date.</p>
            ) : (
              <ul>
                {appointmentsForDate.map((apt) => (
                  <li key={apt.id}>
                    <strong>{apt.clientName}</strong> — {apt.date} at {apt.time} — {apt.service}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={closeModal} className="close-btn">X</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentScheduler;