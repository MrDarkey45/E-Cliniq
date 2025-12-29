import { useState, useEffect } from 'react';
import { inventoryAPI } from '../services/api';

function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    unit: 'mg',
    quantity: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await inventoryAPI.getAll();
      setInventory(data);
    } catch (err) {
      setError('Failed to fetch inventory');
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      unit: 'mg',
      quantity: ''
    });
    setEditMode(false);
    setCurrentItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      name: item.name,
      dosage: item.dosage || '',
      unit: item.unit || 'mg',
      quantity: item.quantity
    });
    setCurrentItem(item);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const dataToSend = {
      name: formData.name,
      dosage: formData.dosage,
      unit: formData.unit,
      quantity: parseInt(formData.quantity)
    };

    try {
      if (editMode) {
        // Update existing item
        const updatedItem = await inventoryAPI.update(currentItem.id, dataToSend);
        setInventory(inventory.map(item =>
          item.id === currentItem.id ? updatedItem : item
        ));
      } else {
        // Create new item
        const newItem = await inventoryAPI.create(dataToSend);
        setInventory([...inventory, newItem]);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine? This action cannot be undone.')) return;

    try {
      await inventoryAPI.delete(id);
      setInventory(inventory.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickUpdate = async (id, newQuantity) => {
    try {
      const updatedItem = await inventoryAPI.update(id, { quantity: parseInt(newQuantity) });
      setInventory(inventory.map(item =>
        item.id === id ? updatedItem : item
      ));
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

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.dosage && item.dosage.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.unit && item.unit.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lowStockCount = inventory.filter(item => item.quantity < 10).length;

  return (
    <div className="inventory-container">
      {error && <div className="error-message">{error}</div>}

      <div className="inventory-header">
        <button onClick={openCreateModal} className="create-btn">
          + Add Medicine
        </button>
      </div>

      <div className="inventory-stats">
        <div className="stat-card">
          <h4>Total Medicines</h4>
          <p className="stat-value">{inventory.length}</p>
        </div>
        <div className="stat-card">
          <h4>Total Stock</h4>
          <p className="stat-value">
            {inventory.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
        <div className="stat-card">
          <h4>Low Stock Alert</h4>
          <p className="stat-value" style={{ color: lowStockCount > 0 ? '#dc3545' : '#28a745' }}>
            {lowStockCount}
          </p>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search by medicine name or dosage..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="inventory-table-container">
        {filteredInventory.length === 0 ? (
          <div className="empty-state-large">
            <div className="empty-icon">💊</div>
            <h3>No medicines in inventory</h3>
            <p>Click "Add Medicine" to add your first medicine</p>
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Quantity in Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.id} className={item.quantity < 10 ? 'low-stock-row' : ''}>
                  <td className="medicine-name">
                    {item.name}
                    {item.quantity < 10 && <span className="low-stock-badge">Low Stock</span>}
                  </td>
                  <td className="dosage-cell">
                    {item.dosage ? `${item.dosage} ${item.unit || 'mg'}` : 'N/A'}
                  </td>
                  <td>
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleQuickUpdate(item.id, Math.max(0, item.quantity - 1))}
                        className="qty-btn"
                        disabled={item.quantity === 0}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        onClick={() => handleQuickUpdate(item.id, item.quantity + 1)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => openEditModal(item)}
                        className="edit-btn"
                        title="Edit medicine"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="delete-btn-icon"
                        title="Delete medicine"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? '✏️ Edit Medicine' : '➕ Add New Medicine'}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close-btn">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="tab-content">
                <div className="form-row">
                  <div className="form-group-modal">
                    <label>Medicine Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Aspirin"
                      required
                    />
                  </div>

                  <div className="form-group-modal">
                    <label>Dosage *</label>
                    <div className="dosage-input-group">
                      <input
                        type="number"
                        name="dosage"
                        value={formData.dosage}
                        onChange={handleChange}
                        placeholder="500"
                        min="0"
                        step="0.1"
                        required
                        className="dosage-number-input"
                      />
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        className="unit-select"
                      >
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <small className="field-hint">Enter dosage value and select unit (milligrams or milliliters)</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-modal">
                    <label>Quantity in Stock *</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="info-box">
                  <strong>💡 Tip:</strong> Enter the numeric dosage value and select the appropriate unit. Use "mg" for tablets/capsules and "ml" for liquid medicines.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="submit-btn-modal">
                  {loading ? 'Saving...' : editMode ? '✓ Update Medicine' : '✓ Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManager;