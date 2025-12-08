import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('basic');
  const [formData, setFormData] = useState({
    appointmentId: '',
    patientName: '',
    email: '',
    idNumber: '',
    age: '',
    gender: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    medications: '',
    prescribedMedicines: [],
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
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    fetchRecords();
    fetchAppointments();
    fetchInventory();
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

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  const resetForm = () => {
    setFormData({
      appointmentId: '',
      patientName: '',
      email: '',
      idNumber: '',
      age: '',
      gender: '',
      symptoms: '',
      diagnosis: '',
      treatment: '',
      medications: '',
      prescribedMedicines: [],
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
      const dataToSend = {
        appointmentId: formData.appointmentId,
        patientName: formData.patientName,
        email: formData.email,
        idNumber: formData.idNumber,
        age: formData.age,
        gender: formData.gender,
        symptoms: formData.symptoms,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        medications: formData.medications,
        prescribedMedicines: JSON.stringify(formData.prescribedMedicines),
        allergies: formData.allergies,
        bloodPressure: formData.bloodPressure,
        heartRate: formData.heartRate,
        temperature: formData.temperature,
        notes: formData.notes,
        followUpDate: formData.followUpDate,
        labResults: formData.labResults,
        xrayNotes: formData.xrayNotes
      };

      console.log('Sending medical record data:', dataToSend);

      const response = await fetch(`${API_URL}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) throw new Error('Failed to create medical record');

      const newRecord = await response.json();
      console.log('Created record:', newRecord);
      
      // Deduct prescribed medicines from inventory
      for (const med of formData.prescribedMedicines) {
        try {
          const inventoryItem = inventory.find(item => item.id === med.id);
          if (inventoryItem) {
            const newQuantity = inventoryItem.quantity - med.quantity;
            await fetch(`${API_URL}/inventory/${med.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity: Math.max(0, newQuantity) })
            });
          }
        } catch (err) {
          console.error(`Failed to update inventory for ${med.name}:`, err);
        }
      }
      
      setRecords([...records, newRecord]);
      setShowModal(false);
      resetForm();
      
      // Refresh inventory to show updated quantities
      fetchInventory();
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
    const { name, value } = e.target;
    
    // Format ID Number as XXXX-XXXXX
    if (name === 'idNumber') {
      const numbers = value.replace(/\D/g, ''); // Remove non-digits
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

  const handleMedicineSelect = (medicine) => {
    const exists = formData.prescribedMedicines.find(m => m.id === medicine.id);
    if (!exists) {
      setFormData({
        ...formData,
        prescribedMedicines: [...formData.prescribedMedicines, {
          id: medicine.id,
          name: medicine.name,
          dosage: medicine.dosage,
          unit: medicine.unit,
          quantity: 1
        }]
      });
    }
  };

  const removePrescribedMedicine = (id) => {
    setFormData({
      ...formData,
      prescribedMedicines: formData.prescribedMedicines.filter(m => m.id !== id)
    });
  };

  const updateMedicineQuantity = (id, quantity) => {
    setFormData({
      ...formData,
      prescribedMedicines: formData.prescribedMedicines.map(m =>
        m.id === id ? { ...m, quantity: parseInt(quantity) || 1 } : m
      )
    });
  };

  const openViewModal = (record) => {
    setSelectedRecord(record);
    setViewModal(true);
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      record.patientName.toLowerCase().includes(searchLower) ||
      record.diagnosis.toLowerCase().includes(searchLower) ||
      (record.symptoms && record.symptoms.toLowerCase().includes(searchLower));

    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'followUp') return matchesSearch && record.followUpDate;
    if (filterBy === 'allergies') return matchesSearch && record.allergies;
    if (filterBy === 'recent') {
      const recordDate = new Date(record.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return matchesSearch && recordDate >= weekAgo;
    }
    return matchesSearch;
  });

  return (
    <div className="medical-records-container">
      {error && <div className="error-message">{error}</div>}

      <div className="medical-header">
        <button onClick={() => setShowModal(true)} className="create-record-btn">
          + New Medical Record
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-filter-group">
          <input
            type="text"
            placeholder="🔍 Search by patient name, diagnosis, or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="filter-group">
            <label>Filter By:</label>
            <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)} className="filter-select">
              <option value="all">All Records</option>
              <option value="recent">Recent (Last 7 days)</option>
              <option value="followUp">Has Follow-up</option>
              <option value="allergies">Has Allergies</option>
            </select>
          </div>
        </div>
        <div className="records-count">
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="records-table-container">
        {filteredRecords.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon">📋</div>
            <h3>No medical records found</h3>
            <p>Click "New Medical Record" to create your first patient record</p>
          </div>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient Name</th>
                <th>Email</th>
                <th>ID Number</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Diagnosis</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} onClick={() => openViewModal(record)} className="clickable-row">
                  <td className="date-cell">{new Date(record.createdAt).toLocaleDateString()}</td>
                  <td className="patient-name-cell">
                    <strong>{record.patientName}</strong>
                    {record.allergies && <span className="allergy-badge" title={record.allergies}>⚠️</span>}
                  </td>
                  <td className="email-cell">{record.email || '—'}</td>
                  <td className="id-cell">{record.idNumber || '—'}</td>
                  <td className="age-cell">{record.age || '—'}</td>
                  <td className="gender-cell">{record.gender || '—'}</td>
                  <td className="diagnosis-cell">
                    <div className="diagnosis-content">
                      <span className="diagnosis-icon">
                        {record.diagnosis ? '📋' : '📄'}
                      </span>
                      <span className="diagnosis-text">{record.diagnosis}</span>
                    </div>
                  </td>
                  <td className="followup-cell">
                    {record.followUpDate ? (
                      <span className="follow-up-badge">{record.followUpDate}</span>
                    ) : (
                      <span className="no-followup">—</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(record.id);
                      }}
                      className="delete-btn-icon"
                      title="Delete record"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
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
                className={modalTab === 'prescription' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('prescription')}
              >
                💊 Prescription
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
                        placeholder="Patient name"
                        required
                      />
                    </div>

                    <div className="form-group-modal">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="patient@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group-modal">
                      <label>ID Number</label>
                      <input
                        type="text"
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleChange}
                        placeholder="1234-56789"
                        maxLength="10"
                      />
                      <small className="field-hint">Format: XXXX-XXXXX (numbers only)</small>
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
                </div>
              )}

              {modalTab === 'prescription' && (
                <div className="tab-content">
                  <h4>Available Medicines in Stock</h4>
                  <div className="medicine-selector">
                    {inventory.filter(med => med.quantity > 0).map((medicine) => (
                      <div key={medicine.id} className="medicine-item">
                        <div className="medicine-info">
                          <strong>{medicine.name}</strong>
                          <span className="medicine-dosage">{medicine.dosage} {medicine.unit}</span>
                          <span className="medicine-stock">Stock: {medicine.quantity}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMedicineSelect(medicine)}
                          className="add-medicine-btn"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ marginTop: '20px' }}>Prescribed Medicines</h4>
                  {formData.prescribedMedicines.length === 0 ? (
                    <p className="empty-prescription">No medicines prescribed yet</p>
                  ) : (
                    <div className="prescribed-list">
                      {formData.prescribedMedicines.map((med) => (
                        <div key={med.id} className="prescribed-item">
                          <div className="prescribed-info">
                            <strong>{med.name}</strong>
                            <span>{med.dosage} {med.unit}</span>
                          </div>
                          <div className="prescribed-controls">
                            <label>Quantity:</label>
                            <input
                              type="number"
                              value={med.quantity}
                              onChange={(e) => updateMedicineQuantity(med.id, e.target.value)}
                              min="1"
                              className="quantity-input-small"
                            />
                            <button
                              type="button"
                              onClick={() => removePrescribedMedicine(med.id)}
                              className="remove-medicine-btn"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="form-group-modal" style={{ marginTop: '20px' }}>
                    <label>Additional Medication Notes</label>
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="Dosage instructions, frequency, duration..."
                      rows="3"
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
                  {selectedRecord.email && (
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedRecord.email}</span>
                    </div>
                  )}
                  {selectedRecord.idNumber && (
                    <div className="info-item">
                      <span className="info-label">ID Number:</span>
                      <span className="info-value">{selectedRecord.idNumber}</span>
                    </div>
                  )}
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
                  {selectedRecord.prescribedMedicines && (
                    <div className="clinical-block">
                      <h4>Prescribed Medicines</h4>
                      {(() => {
                        try {
                          const meds = JSON.parse(selectedRecord.prescribedMedicines);
                          return (
                            <ul className="prescribed-medicines-view">
                              {meds.map((med, idx) => (
                                <li key={idx}>
                                  <strong>{med.name}</strong> {med.dosage} {med.unit} - Quantity: {med.quantity}
                                </li>
                              ))}
                            </ul>
                          );
                        } catch {
                          return <p>No medicines prescribed</p>;
                        }
                      })()}
                    </div>
                  )}
                  {selectedRecord.medications && (
                    <div className="clinical-block">
                      <h4>Medication Notes</h4>
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