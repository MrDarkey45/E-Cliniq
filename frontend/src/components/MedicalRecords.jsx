import { useState, useEffect } from 'react';
import { medicalRecordsAPI, appointmentsAPI, inventoryAPI } from '../services/api';
import { FaClipboardList, FaEdit, FaTrash, FaTimes, FaCheck, FaExclamationTriangle, FaEnvelope, FaIdCard, FaPills, FaPlus, FaCog, FaFileAlt, FaInfoCircle, FaLightbulb, FaCalendarAlt, FaUser, FaStethoscope, FaHeartbeat, FaMinus } from 'react-icons/fa';

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
  const [duplicateInfo, setDuplicateInfo] = useState(null); // New state for duplicate detection
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [medicineSearch, setMedicineSearch] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchAppointments();
    fetchInventory();
  }, []);

  const fetchRecords = async () => {
    try {
      const data = await medicalRecordsAPI.getAll();
      setRecords(data);
    } catch (err) {
      setError('Failed to fetch medical records');
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await appointmentsAPI.getAll();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const data = await inventoryAPI.getAll();
      setInventory(data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    }
  };

  const resetForm = () => {
    setDuplicateInfo(null);
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
    setIsEditing(false);
    setEditingRecordId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDuplicateInfo(null);

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

      let response;
      if (isEditing && editingRecordId) {
        // Update existing record
        response = await medicalRecordsAPI.update(editingRecordId, dataToSend);
        console.log('Updated record:', response);

        // Update the record in the list
        const updatedRecord = response.record || response;
        setRecords(records.map(record =>
          record.id === editingRecordId ? updatedRecord : record
        ));

        // Show inventory updates if any
        if (response.inventoryUpdates && response.inventoryUpdates.length > 0) {
          console.log('Inventory updates:', response.inventoryUpdates);
          const updateMessages = response.inventoryUpdates.map(update => {
            if (update.quantityChange > 0) {
              return `✅ ${update.medicineName}: Returned ${update.quantityChange} to stock (New Stock: ${update.newStock})`;
            } else {
              return `${update.medicineName}: Dispensed ${Math.abs(update.quantityChange)} (New Stock: ${update.newStock})`;
            }
          }).join('\n');
          alert(`Inventory Updated:\n\n${updateMessages}`);
        }
      } else {
        // Create new record
        response = await medicalRecordsAPI.create(dataToSend);
        console.log('Created record:', response);

        // Add new record to the list
        const newRecord = response.record || response;
        setRecords([...records, newRecord]);

        // Show inventory updates if any
        if (response.inventoryUpdates && response.inventoryUpdates.length > 0) {
          console.log('Inventory updates:', response.inventoryUpdates);
          const updateMessages = response.inventoryUpdates.map(update =>
            `${update.medicineName}: Dispensed ${update.quantityDeducted} (New Stock: ${update.newStock})`
          ).join('\n');
          alert(`Prescription Dispensed!\n\n${updateMessages}`);
        }
      }

      setShowModal(false);
      resetForm();

      // Refresh inventory to show updated quantities
      fetchInventory();
    } catch (err) {
      // Check if this is an insufficient stock error
      if (err.message.includes('Insufficient stock')) {
        setError(err.message);
        alert(`❌ ${err.message}\n\nPlease adjust the prescription quantities or restock inventory.`);
      }
      // Check if this is a duplicate error (409)
      else if (err.message.includes('Record exists for this patient')) {
        // Try to get the duplicate details from the API
        try {
          const response = await fetch('http://localhost:3001/api/medical-records', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(dataToSend)
          });

          if (response.status === 409) {
            const duplicateData = await response.json();
            setDuplicateInfo(duplicateData);
            setError(duplicateData.message);
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

  // Handler to edit the existing duplicate record
  const handleEditExistingRecord = (existingRecord) => {
    openEditModal(existingRecord);
    setDuplicateInfo(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medical record? This cannot be undone.')) return;

    try {
      await medicalRecordsAPI.delete(id);
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

  const openViewModal = async (record) => {
    setSelectedRecord(record);
    setViewModal(true);

    // Fetch all appointments for this patient (by ID number or email)
    try {
      let appointments = [];
      if (record.idNumber) {
        appointments = await appointmentsAPI.getForPatient(record.idNumber);
      } else if (record.email) {
        appointments = await appointmentsAPI.getForPatient(record.email);
      }
      setPatientAppointments(appointments);
    } catch (err) {
      console.error('Failed to fetch patient appointments:', err);
      setPatientAppointments([]);
    }
  };

  const openEditModal = (record) => {
    // Parse prescribed medicines if it's a string
    let prescribedMeds = [];
    if (record.prescribedMedicines) {
      try {
        prescribedMeds = JSON.parse(record.prescribedMedicines);
      } catch {
        prescribedMeds = [];
      }
    }

    setFormData({
      appointmentId: record.appointmentId || '',
      patientName: record.patientName || '',
      email: record.email || '',
      idNumber: record.idNumber || '',
      age: record.age || '',
      gender: record.gender || '',
      symptoms: record.symptoms || '',
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      medications: record.medications || '',
      prescribedMedicines: prescribedMeds,
      allergies: record.allergies || '',
      bloodPressure: record.bloodPressure || '',
      heartRate: record.heartRate || '',
      temperature: record.temperature || '',
      notes: record.notes || '',
      followUpDate: record.followUpDate || '',
      labResults: record.labResults || '',
      xrayNotes: record.xrayNotes || ''
    });
    setIsEditing(true);
    setEditingRecordId(record.id);
    setViewModal(false);
    setShowModal(true);
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

      <div className="records-table-wrapper">
        {filteredRecords.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon"><FaClipboardList size={64} color="#ccc" /></div>
            <h3>No medical records found</h3>
            <p>Click "New Medical Record" to create your first patient record</p>
          </div>
        ) : (
          <div className="modern-table-container">
            <table className="modern-records-table">
              <thead>
                <tr>
                  <th className="th-date">
                    <div className="th-content">
                      <span className="th-icon"><FaCalendarAlt /></span>
                      <span>Date</span>
                    </div>
                  </th>
                  <th className="th-patient">
                    <div className="th-content">
                      <span className="th-icon"><FaUser /></span>
                      <span>Patient Name</span>
                    </div>
                  </th>
                  <th className="th-contact">
                    <div className="th-content">
                      <span className="th-icon"><FaEnvelope /></span>
                      <span>Contact</span>
                    </div>
                  </th>
                  <th className="th-demographics">
                    <div className="th-content">
                      <span className="th-icon"><FaInfoCircle /></span>
                      <span>Age/Gender</span>
                    </div>
                  </th>
                  <th className="th-diagnosis">
                    <div className="th-content">
                      <span className="th-icon"><FaStethoscope /></span>
                      <span>Diagnosis</span>
                    </div>
                  </th>
                  <th className="th-followup">
                    <div className="th-content">
                      <span className="th-icon"><FaCalendarAlt /></span>
                      <span>Follow-up</span>
                    </div>
                  </th>
                  <th className="th-actions">
                    <div className="th-content">
                      <span className="th-icon"><FaCog /></span>
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    onClick={() => openViewModal(record)}
                    className="table-row"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="td-date">
                      <div className="date-badge">
                        <div className="date-day">{new Date(record.createdAt).getDate()}</div>
                        <div className="date-month">
                          {new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </td>
                    <td className="td-patient">
                      <div className="patient-info-cell">
                        <div className="patient-name-main">{record.patientName}</div>
                        <div className="patient-id-sub">
                          {record.idNumber && <span className="id-badge"><FaIdCard style={{ marginRight: '4px' }} /> {record.idNumber}</span>}
                          {record.allergies && <span className="allergy-warning" title={record.allergies}><FaExclamationTriangle style={{ marginRight: '4px' }} /> Allergies</span>}
                        </div>
                      </div>
                    </td>
                    <td className="td-contact">
                      <div className="contact-info">
                        {record.email ? (
                          <span className="email-display">{record.email}</span>
                        ) : (
                          <span className="no-data">No email</span>
                        )}
                      </div>
                    </td>
                    <td className="td-demographics">
                      <div className="demographics-cell">
                        <span className="age-badge">{record.age || '—'} yrs</span>
                        <span className="gender-badge">{record.gender || '—'}</span>
                      </div>
                    </td>
                    <td className="td-diagnosis">
                      <div className="diagnosis-pill">
                        {record.diagnosis}
                      </div>
                    </td>
                    <td className="td-followup">
                      {record.followUpDate ? (
                        <span className="followup-badge-new">
                          {new Date(record.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="no-followup-new">—</span>
                      )}
                    </td>
                    <td className="td-actions">
                      <div className="action-buttons">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(record);
                          }}
                          className="action-btn edit-btn"
                          title="Edit record"
                        >
                          <span className="btn-icon"><FaEdit /></span>
                          <span className="btn-text">Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                          }}
                          className="action-btn delete-btn"
                          title="Delete record"
                        >
                          <span className="btn-icon"><FaTrash /></span>
                          <span className="btn-text">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? <><FaEdit style={{ marginRight: '8px' }} /> Edit Medical Record</> : <><FaFileAlt style={{ marginRight: '8px' }} /> New Medical Record</>}</h2>
              <button onClick={() => {
                setShowModal(false);
                resetForm();
              }} className="modal-close-btn"><FaTimes /></button>
            </div>

            {/* Duplicate Warning */}
            {duplicateInfo && duplicateInfo.existingRecord && (
              <div className="duplicate-warning">
                <h3><FaExclamationTriangle style={{ marginRight: '8px' }} /> Duplicate Record Detected</h3>
                <p>{duplicateInfo.message}</p>
                <div className="existing-record-info">
                  <h4>Existing Record Details:</h4>
                  <p><strong>Patient:</strong> {duplicateInfo.existingRecord.patientName}</p>
                  {duplicateInfo.existingRecord.email && <p><strong>Email:</strong> {duplicateInfo.existingRecord.email}</p>}
                  {duplicateInfo.existingRecord.idNumber && <p><strong>ID Number:</strong> {duplicateInfo.existingRecord.idNumber}</p>}
                  <p><strong>Created:</strong> {new Date(duplicateInfo.existingRecord.createdAt).toLocaleDateString()}</p>
                  <p><strong>Current Diagnosis:</strong> {duplicateInfo.existingRecord.diagnosis}</p>
                </div>
                <button
                  type="button"
                  className="edit-existing-btn"
                  onClick={() => {
                    const fullRecord = records.find(r => r.id === duplicateInfo.existingRecordId);
                    if (fullRecord) {
                      handleEditExistingRecord(fullRecord);
                    }
                  }}
                >
                  <FaEdit style={{ marginRight: '6px' }} /> Edit Existing Record Instead
                </button>
              </div>
            )}

            <div className="modal-tabs">
              <button
                className={modalTab === 'basic' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('basic')}
              >
                <FaUser style={{ marginRight: '6px' }} /> Basic Info
              </button>
              <button
                className={modalTab === 'clinical' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('clinical')}
              >
                <FaStethoscope style={{ marginRight: '6px' }} /> Clinical
              </button>
              <button
                className={modalTab === 'prescription' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('prescription')}
              >
                <FaPills style={{ marginRight: '6px' }} /> Prescription
              </button>
              <button
                className={modalTab === 'vitals' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setModalTab('vitals')}
              >
                <FaHeartbeat style={{ marginRight: '6px' }} /> Vitals
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
                <div className="tab-content prescription-tab-compact">
                  <div className="prescription-layout">
                    {/* Left Column - Available Medicines */}
                    <div className="available-medicines-section">
                      <div className="section-header-compact">
                        <h4><FaPills style={{ marginRight: '6px' }} /> Available Medicines</h4>
                        <span className="medicine-count-badge">
                          {inventory.filter(med => med.quantity > 0).length} available
                        </span>
                      </div>

                      <div className="search-bar-container">
                        <input
                          type="text"
                          placeholder="Search medicines..."
                          className="medicine-search-input"
                          value={medicineSearch}
                          onChange={(e) => setMedicineSearch(e.target.value)}
                        />
                      </div>

                      {/* Low Stock Warning */}
                      {inventory.filter(med => med.quantity > 0 && med.quantity < 10).length > 0 && (
                        <div className="low-stock-warning">
                          <FaExclamationTriangle style={{ marginRight: '6px' }} /> {inventory.filter(med => med.quantity > 0 && med.quantity < 10).length} medicine(s) low on stock
                        </div>
                      )}

                      <div className="medicine-list-compact">
                        {inventory
                          .filter(med => med.quantity > 0)
                          .filter(med =>
                            medicineSearch === '' ||
                            med.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
                            med.dosage.toLowerCase().includes(medicineSearch.toLowerCase())
                          )
                          .map((medicine) => (
                            <div key={medicine.id} className="medicine-row-compact">
                              <div className="medicine-info-compact">
                                <div className="medicine-name-compact">{medicine.name}</div>
                                <div className="medicine-details-compact">
                                  <span className="dosage-text">{medicine.dosage} {medicine.unit}</span>
                                  <span className="separator">•</span>
                                  <span className={`stock-text ${medicine.quantity < 10 ? 'low' : medicine.quantity < 30 ? 'medium' : 'high'}`}>
                                    {medicine.quantity} in stock
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleMedicineSelect(medicine)}
                                className="add-btn-compact"
                                title="Add to prescription"
                              >
                                <FaPlus />
                              </button>
                            </div>
                          ))}
                        {inventory.filter(med => med.quantity > 0).filter(med =>
                          medicineSearch === '' ||
                          med.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
                          med.dosage.toLowerCase().includes(medicineSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="no-results">
                            <p>No medicines found matching "{medicineSearch}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Prescribed Medicines */}
                    <div className="prescribed-medicines-section">
                      <div className="section-header-compact">
                        <h4><FaClipboardList style={{ marginRight: '6px' }} /> Prescribed ({formData.prescribedMedicines.length})</h4>
                      </div>

                      {formData.prescribedMedicines.length === 0 ? (
                        <div className="empty-prescribed-compact">
                          <div className="empty-icon">📭</div>
                          <p>No medicines prescribed</p>
                        </div>
                      ) : (
                        <div className="prescribed-list-compact">
                          {formData.prescribedMedicines.map((med) => (
                            <div key={med.id} className="prescribed-row-compact">
                              <div className="prescribed-info-compact">
                                <div className="prescribed-name-compact">{med.name}</div>
                                <div className="prescribed-dosage-compact">{med.dosage} {med.unit}</div>
                                <div className="quantity-control-compact">
                                  <button
                                    type="button"
                                    onClick={() => updateMedicineQuantity(med.id, Math.max(1, parseInt(med.quantity || 1) - 1))}
                                    className="qty-btn-compact"
                                  >
                                    <FaMinus />
                                  </button>
                                  <input
                                    type="number"
                                    value={med.quantity}
                                    onChange={(e) => updateMedicineQuantity(med.id, e.target.value)}
                                    min="1"
                                    className="qty-input-compact"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateMedicineQuantity(med.id, parseInt(med.quantity || 1) + 1)}
                                    className="qty-btn-compact"
                                  >
                                    <FaPlus />
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePrescribedMedicine(med.id)}
                                className="remove-btn-compact"
                                title="Remove"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="medication-notes-compact">
                    <label>📝 Medication Notes</label>
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
                    <strong><FaLightbulb style={{ marginRight: '6px' }} /> Tip:</strong> Record vital signs at the time of examination for accurate medical history.
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
                    <label>Follow-up Date & Time</label>
                    <input
                      type="datetime-local"
                      name="followUpDate"
                      value={formData.followUpDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" onClick={() => {
                  setShowModal(false);
                  resetForm();
                }} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="submit-btn-modal">
                  {loading
                    ? (isEditing ? 'Updating...' : 'Creating...')
                    : (isEditing ? <><FaCheck style={{ marginRight: '6px' }} /> Update Record</> : <><FaCheck style={{ marginRight: '6px' }} /> Create Record</>)
                  }
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
                <h2><FaClipboardList style={{ marginRight: '8px' }} /> Medical Record</h2>
                <p className="patient-name-header">{selectedRecord.patientName}</p>
              </div>
              <button onClick={() => setViewModal(false)} className="modal-close-btn"><FaTimes /></button>
            </div>

            <div className="view-content">
              <div className="info-section">
                <h3><FaUser style={{ marginRight: '8px' }} /> Basic Information</h3>
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

              {patientAppointments.length > 0 && (
                <div className="info-section">
                  <h3>📅 Appointment History</h3>
                  <div className="appointments-list">
                    {patientAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`appointment-card ${apt.id === selectedRecord.appointmentId ? 'linked-appointment' : ''}`}
                      >
                        <div className="appointment-header">
                          {apt.id === selectedRecord.appointmentId && (
                            <span className="linked-badge">🔗 Linked Record</span>
                          )}
                          <span className="appointment-date">{apt.date}</span>
                          <span className="appointment-time">{apt.time}</span>
                        </div>
                        <div className="appointment-details">
                          <div><strong>Service:</strong> {apt.service}</div>
                          {apt.email && <div><strong>Email:</strong> {apt.email}</div>}
                          {apt.idNumber && <div><strong>ID Number:</strong> {apt.idNumber}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              <button onClick={() => openEditModal(selectedRecord)} className="submit-btn-modal">
                <FaEdit style={{ marginRight: '6px' }} /> Edit Record
              </button>
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