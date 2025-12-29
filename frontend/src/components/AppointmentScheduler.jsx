import { useState, useEffect } from 'react';
import { appointmentsAPI } from '../services/api';

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
  const [conflictInfo, setConflictInfo] = useState(null); // New state for conflict information
  const [view, setView] = useState('calendar'); // 'list' or 'calendar' - Default to calendar
  const [modalOpen, setModalOpen] = useState(false); // New state for modal
  const [selectedDate, setSelectedDate] = useState(null); // New state for selected date
  const [appointmentsForDate, setAppointmentsForDate] = useState([]); // New state for appointments for selected date
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Track current month for calendar navigation

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
      const data = await appointmentsAPI.getAll();
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
    setConflictInfo(null);

    try {
      const newAppointment = await appointmentsAPI.create(formData);
      setAppointments([...appointments, newAppointment]);
      setFormData({ date: '', time: '', clientName: '', email: '', idNumber: '', service: '' });
    } catch (err) {
      // Check if this is a conflict error (409)
      if (err.message.includes('Time slot unavailable')) {
        // Parse the error response to get conflict details
        // The error object should contain conflictingAppointment and suggestedTimes
        try {
          const response = await fetch('http://localhost:3001/api/appointments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
          });

          if (response.status === 409) {
            const conflictData = await response.json();
            setConflictInfo(conflictData);
            setError(conflictData.error);
          } else {
            setError(err.message);
          }
        } catch {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler to select a suggested time
  const handleSelectSuggestedTime = (suggestedTime) => {
    setFormData({
      ...formData,
      time: suggestedTime
    });
    setConflictInfo(null);
    setError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this appointment?')) return;

    try {
      await appointmentsAPI.delete(id);
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

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const generateCalendarDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get first day of month and its day of week (0 = Sunday, 6 = Saturday)
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Generate all days in the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Format month/year for display
  const monthYearDisplay = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

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

      {/* Conflict Information with Suggested Times */}
      {conflictInfo && conflictInfo.suggestedTimes && (
        <div className="conflict-info">
          <h3>⚠️ Appointment Conflict</h3>
          <p>
            <strong>Conflicting Appointment:</strong> {conflictInfo.conflictingAppointment.clientName} at {conflictInfo.conflictingAppointment.time}
            <br />
            <strong>Service:</strong> {conflictInfo.conflictingAppointment.service}
          </p>
          <div className="suggested-times">
            <h4>Suggested Available Times:</h4>
            <div className="time-buttons">
              {conflictInfo.suggestedTimes.map((time, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggested-time-btn"
                  onClick={() => handleSelectSuggestedTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
    <div className="calendar-controls">
      <button onClick={goToPreviousMonth} className="month-nav-btn">
        ◀ Previous
      </button>
      <div className="month-year-display">
        <h3>🗓️ {monthYearDisplay}</h3>
      </div>
      <button onClick={goToNextMonth} className="month-nav-btn">
        Next ▶
      </button>
      <button onClick={goToToday} className="today-btn">
        📅 Today
      </button>
    </div>

    {/* Weekday Headers */}
    <div className="calendar-weekdays">
      <div className="weekday-header">Sun</div>
      <div className="weekday-header">Mon</div>
      <div className="weekday-header">Tue</div>
      <div className="weekday-header">Wed</div>
      <div className="weekday-header">Thu</div>
      <div className="weekday-header">Fri</div>
      <div className="weekday-header">Sat</div>
    </div>

    <div className="calendar-grid">
      {/* Render grid of calendar days */}
      {calendarDays.map((date, index) => {
        // Handle empty cells for days before the first day of the month
        if (date === null) {
          return <div key={`empty-${index}`} className="calendar-day empty"></div>;
        }

        const dayAppointments = groupedAppointments[date] || [];
        const count = dayAppointments.length;
        const isToday = new Date(date).toDateString() === new Date().toDateString();
        const isPast = new Date(date) < new Date();

        // Extract day of month (e.g., "1", "2", "30")
        const dayOfMonth = new Date(date).getDate();
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'short' });

        // Determine background color based on appointment density
        let bgColor = '#fff';
        let borderColor = '#e0e0e0';
        if (isToday) {
          bgColor = '#e3f2fd';
          borderColor = '#2196f3';
        } else if (count === 0) {
          bgColor = '#fafafa';
        } else if (count <= 2) {
          bgColor = '#e3f2fd';
          borderColor = '#64b5f6';
        } else if (count <= 4) {
          bgColor = '#bbdefb';
          borderColor = '#42a5f5';
        } else {
          bgColor = '#90caf9';
          borderColor = '#2196f3';
        }

        return (
          <div
            key={date}
            className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${count > 0 ? 'has-appointments' : ''}`}
            style={{
              backgroundColor: bgColor,
              border: `2px solid ${borderColor}`,
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={() => handleDateClick(date)}
          >
            <div className="calendar-day-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="day-number" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isToday ? '#1976d2' : '#424242' }}>
                {dayOfMonth}
              </span>
              <span className="day-of-week" style={{ fontSize: '0.8rem', color: '#757575', textTransform: 'uppercase' }}>
                {dayOfWeek}
              </span>
            </div>
            {count > 0 && (
              <div className="appointment-count-badge" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 10px',
                fontSize: '0.85rem',
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: '6px'
              }}>
                {count} {count === 1 ? 'Appointment' : 'Appointments'}
              </div>
            )}
            {count > 0 && (
              <div className="appointment-preview" style={{ fontSize: '0.75rem', color: '#616161', overflow: 'hidden' }}>
                {dayAppointments.slice(0, 2).map((apt, idx) => (
                  <div key={idx} style={{ marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {apt.time} - {apt.service}
                  </div>
                ))}
                {count > 2 && <div style={{ fontStyle: 'italic', color: '#9e9e9e' }}>+{count - 2} more...</div>}
              </div>
            )}
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

      {/* Enhanced Modal for Appointment Details */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content appointment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-appointments">
              <div className="modal-date-display">
                <div className="date-icon">📅</div>
                <div className="date-info">
                  <h2>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}</h2>
                  <p>{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <button onClick={closeModal} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body-appointments">
              {appointmentsForDate.length === 0 ? (
                <div className="no-appointments-message">
                  <div className="empty-icon">📭</div>
                  <h3>No Appointments Scheduled</h3>
                  <p>There are no appointments for this date.</p>
                </div>
              ) : (
                <div className="appointments-list-modal">
                  <div className="appointments-count">
                    {appointmentsForDate.length} {appointmentsForDate.length === 1 ? 'Appointment' : 'Appointments'}
                  </div>
                  {appointmentsForDate
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((apt) => (
                      <div key={apt.id} className="appointment-card-modal">
                        <div className="appointment-time-badge">{apt.time}</div>
                        <div className="appointment-details-modal">
                          <h4>{apt.clientName}</h4>
                          <div className="appointment-meta">
                            <span className="service-tag">💼 {apt.service}</span>
                            {apt.email && <span className="contact-info">📧 {apt.email}</span>}
                            {apt.idNumber && <span className="contact-info">🆔 {apt.idNumber}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="delete-btn-modal"
                          title="Delete appointment"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentScheduler;