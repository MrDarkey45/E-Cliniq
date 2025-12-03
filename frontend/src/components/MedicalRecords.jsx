import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('basic');
  const [formData, setFormData] = useState({
    appointmentId: '',
    patientName: '',
    age: '',
    gender: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    allergies: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    notes: '',
    followUpDate: '',
    labResults: '',
    xrayNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const resetForm = () => {
    setFormData({
      appointmentId: '',
      patientName: '',
      age: '',
      gender: '',
      symptoms: '',
      diagnosis: '',
      treatment: '',
      medications: '',
      allergies: '',
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      notes: '',
      followUpDate: '',
      labResults: '',
      xrayNotes: ''
    });
    setModalTab('basic');
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
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medical record? This cannot be undone.')) return;

    try {
      const response = await fetch(`${API_URL}/medical-records/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete record');

      setRecords(records.filter(record => record.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
        setViewModal(false);
      }
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

  const openViewModal = (record) => {
    setSelectedRecord(record);
    setViewModal(true);
  };

  const filteredRecords = records.filter(record =>
    record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="medical-records-container">
      <div className="medical-header">
        <div>
          <h2>🏥 Medical Records</h2>
          <p className="subtitle">Manage patient medical information and history</p>
        </div>
        <button onClick={() => setShowModal(true)} className="create-record-btn">
          + New Medical Record
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search by patient name or diagnosis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="records-count">
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="records-grid">
        {filteredRecords.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon">📋</div>
            <h3>No medical records found</h3>
            <p>Click "New Medical Record" to create your first patient record</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="record-card-new" onClick={() => openViewModal(record)}>
              <div className="record-card-header">
                <div className="patient-info">
                  <h3>{record.patientName}</h3>
                  {record.age && <span className="patient-meta">{record.age} years old</span>}
                  {record.gender && <span className="patient-meta"> • {record.gender}</span>}
                </div>
                <div className="record-date-badge">
                  {new Date(record.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="record-card-body">
                <div className="record-field">
                  <span className="field-label">Diagnosis:</span>
                  <span className="field-value">{record.diagnosis}</span>
                </div>
                {record.symptoms && (
                  <div className="record-field">
                    <span className="field-label">Symptoms:</span>
                    <span className="field-value">{record.symptoms.substring(0, 80)}...</span>
                  </div>
                )}
              </div>

              <div className="record-card-footer">
                {record.followUpDate && (
                  <span className="follow-up-badge">
                    📅 Follow-up: {record.followUpDate}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(record.id);
                  }}
                  className="delete-icon-btn"
                  title="Delete record"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 New Medical Record</h2>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-tabs">
              <button
                className={modalTab === 'basic' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('basic')}
              >
                👤 Basic Info
              </button>
              <button
                className={modalTab === 'clinical' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('clinical')}
              >
                🩺 Clinical
              </button>
              <button
                className={modalTab === 'vitals' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('vitals')}
              >
                💓 Vitals
              </button>
              <button
                className={modalTab === 'additional' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('additional')}
              >
                📄 Additional
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {modalTab === 'basic' && (
                <div className="tab-content">
                  <div className="form-row">
                    <div className="form-group-modal">
                      <label>Link to Appointment (Optional)</label>
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
                  </div>

                  <div className="form-row">
                    <div className="form-group-modal">
                      <label>Patient Name *</label>
                      <input
                        type="text"
                        name="patientName"
                        value={formData.patientName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="form-group-modal">
                      <label>Age</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="35"
                        min="0"
                      />
                    </div>

                    <div className="form-group-modal">
                      <label>Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group-modal">
                    <label>Known Allergies</label>
                    <input
                      type="text"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="Penicillin, Peanuts, etc."
                    />
                  </div>
                </div>
              )}

              {modalTab === 'clinical' && (
                <div className="tab-content">
                  <div className="form-group-modal">
                    <label>Symptoms *</label>
                    <textarea
                      name="symptoms"
                      value={formData.symptoms}
                      onChange={handleChange}
                      placeholder="Describe patient symptoms..."
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Diagnosis *</label>
                    <textarea
                      name="diagnosis"
                      value={formData.diagnosis}
                      onChange={handleChange}
                      placeholder="Medical diagnosis..."
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Treatment Plan *</label>
                    <textarea
                      name="treatment"
                      value={formData.treatment}
                      onChange={handleChange}
                      placeholder="Prescribed treatment and procedures..."
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Medications Prescribed</label>
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="List medications with dosage..."
                      rows="2"
                    />
                  </div>
                </div>
              )}

              {modalTab === 'vitals' && (
                <div className="tab-content">
                  <div className="form-row">
                    <div className="form-group-modal">
                      <label>Blood Pressure</label>
                      <input
                        type="text"
                        name="bloodPressure"
                        value={formData.bloodPressure}
                        onChange={handleChange}
                        placeholder="120/80 mmHg"
                      />
                    </div>

                    <div className="form-group-modal">
                      <label>Heart Rate</label>
                      <input
                        type="text"
                        name="heartRate"
                        value={formData.heartRate}
                        onChange={handleChange}
                        placeholder="72 bpm"
                      />
                    </div>

                    <div className="form-group-modal">
                      <label>Temperature</label>
                      <input
                        type="text"
                        name="temperature"
                        value={formData.temperature}
                        onChange={handleChange}
                        placeholder="98.6°F"
                      />
                    </div>
                  </div>

                  <div className="info-box">
                    <strong>💡 Tip:</strong> Record vital signs at the time of examination for accurate medical history.
                  </div>
                </div>
              )}

              {modalTab === 'additional' && (
                <div className="tab-content">
                  <div className="form-group-modal">
                    <label>Lab Results</label>
                    <textarea
                      name="labResults"
                      value={formData.labResults}
                      onChange={handleChange}
                      placeholder="Blood work, urine tests, etc..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>X-Ray / Imaging Notes</label>
                    <textarea
                      name="xrayNotes"
                      value={formData.xrayNotes}
                      onChange={handleChange}
                      placeholder="X-ray, MRI, CT scan findings..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Any additional comments or observations..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Follow-up Date</label>
                    <input
                      type="date"
                      name="followUpDate"
                      value={formData.followUpDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="submit-btn-modal">
                  {loading ? 'Creating...' : '✓ Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Record Modal */}
      {viewModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setViewModal(false)}>
          <div className="modal-container view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📋 Medical Record</h2>
                <p className="patient-name-header">{selectedRecord.patientName}</p>
              </div>
              <button onClick={() => setViewModal(false)} className="modal-close-btn">✕</button>
            </div>

            <div className="view-content">
              <div className="info-section">
                <h3>👤 Basic Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Patient:</span>
                    <span className="info-value">{selectedRecord.patientName}</span>
                  </div>
                  {selectedRecord.age && (
                    <div className="info-item">
                      <span className="info-label">Age:</span>
                      <span className="info-value">{selectedRecord.age} years</span>
                    </div>
                  )}
                  {selectedRecord.gender && (
                    <div className="info-item">
                      <span className="info-label">Gender:</span>
                      <span className="info-value">{selectedRecord.gender}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Date:</span>
                    <span className="info-value">{new Date(selectedRecord.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedRecord.allergies && (
                    <div className="info-item full-width">
                      <span className="info-label">Allergies:</span>
                      <span className="info-value alert">{selectedRecord.allergies}</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedRecord.bloodPressure || selectedRecord.heartRate || selectedRecord.temperature) && (
                <div className="info-section">
                  <h3>💓 Vital Signs</h3>
                  <div className="vitals-grid">
                    {selectedRecord.bloodPressure && (
                      <div className="vital-card">
                        <div className="vital-label">Blood Pressure</div>
                        <div className="vital-value">{selectedRecord.bloodPressure}</div>
                      </div>
                    )}
                    {selectedRecord.heartRate && (
                      <div className="vital-card">
                        <div className="vital-label">Heart Rate</div>
                        <div className="vital-value">{selectedRecord.heartRate}</div>
                      </div>
                    )}
                    {selectedRecord.temperature && (
                      <div className="vital-card">
                        <div className="vital-label">Temperature</div>
                        <div className="vital-value">{selectedRecord.temperature}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="info-section">
                <h3>🩺 Clinical Information</h3>
                <div className="clinical-info">
                  <div className="clinical-block">
                    <h4>Symptoms</h4>
                    <p>{selectedRecord.symptoms}</p>
                  </div>
                  <div className="clinical-block">
                    <h4>Diagnosis</h4>
                    <p>{selectedRecord.diagnosis}</p>
                  </div>
                  <div className="clinical-block">
                    <h4>Treatment Plan</h4>
                    <p>{selectedRecord.treatment}</p>
                  </div>
                  {selectedRecord.medications && (
                    <div className="clinical-block">
                      <h4>Medications</h4>
                      <p>{selectedRecord.medications}</p>
                    </div>
                  )}
                </div>
              </div>

              {(selectedRecord.labResults || selectedRecord.xrayNotes) && (
                <div className="info-section">
                  <h3>🔬 Test Results</h3>
                  {selectedRecord.labResults && (
                    <div className="clinical-block">
                      <h4>Lab Results</h4>
                      <p>{selectedRecord.labResults}</p>
                    </div>
                  )}
                  {selectedRecord.xrayNotes && (
                    <div className="clinical-block">
                      <h4>Imaging Notes</h4>
                      <p>{selectedRecord.xrayNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.notes && (
                <div className="info-section">
                  <h3>📝 Additional Notes</h3>
                  <p className="notes-text">{selectedRecord.notes}</p>
                </div>
              )}

              {selectedRecord.followUpDate && (
                <div className="follow-up-section">
                  📅 Follow-up scheduled for: <strong>{selectedRecord.followUpDate}</strong>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setViewModal(false)} className="cancel-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalRecords;