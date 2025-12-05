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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

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

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getAppointmentsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateString);
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(clickedDate);
    setShowDayModal(true);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                          currentDate.getFullYear() === today.getFullYear();

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayAppointments = getAppointmentsForDate(date);
      const isToday = isCurrentMonth && day === today.getDate();
      const hasAppointments = dayAppointments.length > 0;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${hasAppointments ? 'has-appointments' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="day-number">{day}</div>
          {hasAppointments && (
            <div className="appointment-count">
              {dayAppointments.length} {dayAppointments.length === 1 ? 'apt' : 'apts'}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <div className="scheduler-container">
      <div className="scheduler-header">
        <h2>📅 Appointment Scheduler</h2>
        <button onClick={goToToday} className="today-btn">Today</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="scheduler-layout">
        {/* Left: Add Appointment Form */}
        <div className="form-section">
          <h3>Schedule New Appointment</h3>
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
              {loading ? 'Creating...' : '+ Add Appointment'}
            </button>
          </form>

          <div className="appointments-summary">
            <h4>Total Appointments: {appointments.length}</h4>
          </div>
        </div>

        {/* Right: Calendar View */}
        <div className="calendar-section">
          <div className="calendar-header">
            <button onClick={previousMonth} className="nav-btn">‹</button>
            <h3>{formatMonthYear()}</h3>
            <button onClick={nextMonth} className="nav-btn">›</button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekday">Sun</div>
            <div className="calendar-weekday">Mon</div>
            <div className="calendar-weekday">Tue</div>
            <div className="calendar-weekday">Wed</div>
            <div className="calendar-weekday">Thu</div>
            <div className="calendar-weekday">Fri</div>
            <div className="calendar-weekday">Sat</div>
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {showDayModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📅 {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h2>
              <button onClick={() => setShowDayModal(false)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body">
              {selectedDateAppointments.length === 0 ? (
                <div className="empty-state">
                  <p>No appointments scheduled for this day</p>
                </div>
              ) : (
                <div className="day-appointments-list">
                  <h3>{selectedDateAppointments.length} Appointment{selectedDateAppointments.length !== 1 ? 's' : ''}</h3>
                  {selectedDateAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-detail-card">
                      <div className="apt-time">{apt.time}</div>
                      <div className="apt-details">
                        <h4>{apt.clientName}</h4>
                        <p>{apt.service}</p>
                      </div>
                      <button
                        onClick={() => {
                          handleDelete(apt.id);
                          if (selectedDateAppointments.length === 1) {
                            setShowDayModal(false);
                          }
                        }}
                        className="delete-btn-small"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowDayModal(false)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentScheduler;