import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function AppointmentScheduler() {
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    clientName: '',
    service: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setFormData({ date: '', time: '', clientName: '', service: '' });
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="scheduler-container">
      <h2>📅 Appointment Scheduler</h2>

      {error && <div className="error-message">{error}</div>}

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
    </div>
  );
}

export default AppointmentScheduler;