import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({
    appointmentId: '',
    patientName: '',
    diagnosis: '',
    symptoms: '',
    treatment: '',
    notes: '',
    followUpDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchRecords();
    fetchAppointments();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await fetch(`${API_URL}/medical-records`);
      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError('Failed to fetch medical records');
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${API_URL}/appointments`);
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create medical record');

      const newRecord = await response.json();
      setRecords([...records, newRecord]);
      setFormData({
        appointmentId: '',
        patientName: '',
        diagnosis: '',
        symptoms: '',
        treatment: '',
        notes: '',
        followUpDate: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medical record?')) return;

    try {
      const response = await fetch(`${API_URL}/medical-records/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete record');

      setRecords(records.filter(record => record.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
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

  const handleAppointmentSelect = (e) => {
    const aptId = e.target.value;
    const selectedApt = appointments.find(apt => apt.id === parseInt(aptId));
    
    if (selectedApt) {
      setFormData({
        ...formData,
        appointmentId: aptId,
        patientName: selectedApt.clientName
      });
    }
  };

  return (
    <div className="medical-records-container">
      <h2>🏥 Medical Records</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="records-layout">
        <div className="form-section">
          <h3>Create Medical Record</h3>
          <form onSubmit={handleSubmit} className="medical-form">
            <div className="form-group">
              <label>Link to Appointment (Optional):</label>
              <select
                name="appointmentId"
                value={formData.appointmentId}
                onChange={handleAppointmentSelect}
              >
                <option value="">-- Select Appointment --</option>
                {appointments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.clientName} - {apt.date} {apt.time}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Patient Name:</label>
              <input
                type="text"
                name="patientName"
                value={formData.patientName}
                onChange={handleChange}
                placeholder="Patient name"
                required
              />
            </div>

            <div className="form-group">
              <label>Symptoms:</label>
              <textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                placeholder="Describe symptoms..."
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Diagnosis:</label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                placeholder="Medical diagnosis..."
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Treatment Plan:</label>
              <textarea
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
                placeholder="Prescribed treatment..."
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Additional Notes:</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional comments..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Follow-up Date:</label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating...' : 'Create Medical Record'}
            </button>
          </form>
        </div>

        <div className="records-list-section">
          <h3>Patient Records ({records.length})</h3>
          
          {records.length === 0 ? (
            <p className="empty-state">No medical records yet</p>
          ) : (
            <div className="records-list">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className={`record-card ${selectedRecord?.id === record.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="record-header">
                    <h4>{record.patientName}</h4>
                    <span className="record-date">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="record-preview">
                    <p><strong>Diagnosis:</strong> {record.diagnosis.substring(0, 60)}...</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.id);
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

        {selectedRecord && (
          <div className="record-detail">
            <div className="record-detail-header">
              <h3>📋 Record Details</h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="detail-content">
              <div className="detail-item">
                <label>Patient Name:</label>
                <p>{selectedRecord.patientName}</p>
              </div>

              <div className="detail-item">
                <label>Date Created:</label>
                <p>{new Date(selectedRecord.createdAt).toLocaleString()}</p>
              </div>

              <div className="detail-item">
                <label>Symptoms:</label>
                <p>{selectedRecord.symptoms}</p>
              </div>

              <div className="detail-item">
                <label>Diagnosis:</label>
                <p>{selectedRecord.diagnosis}</p>
              </div>

              <div className="detail-item">
                <label>Treatment Plan:</label>
                <p>{selectedRecord.treatment}</p>
              </div>

              {selectedRecord.notes && (
                <div className="detail-item">
                  <label>Additional Notes:</label>
                  <p>{selectedRecord.notes}</p>
                </div>
              )}

              {selectedRecord.followUpDate && (
                <div className="detail-item">
                  <label>Follow-up Date:</label>
                  <p>{selectedRecord.followUpDate}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicalRecords;