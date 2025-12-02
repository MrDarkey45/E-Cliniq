import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

function InventoryManager() {
  const [inventory, setInventory] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError('Failed to fetch inventory');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to add item');

      const newItem = await response.json();
      setInventory([...inventory, newItem]);
      setFormData({ name: '', quantity: '', price: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id, newQuantity) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) throw new Error('Failed to update quantity');

      const updatedItem = await response.json();
      setInventory(inventory.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete item');

      setInventory(inventory.filter(item => item.id !== id));
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

  const totalValue = inventory.reduce(
    (sum, item) => sum + (item.quantity * item.price), 
    0
  );

  return (
    <div className="inventory-container">
      <h2>📦 Inventory Manager</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="inventory-stats">
        <div className="stat-card">
          <h4>Total Items</h4>
          <p className="stat-value">{inventory.length}</p>
        </div>
        <div className="stat-card">
          <h4>Total Units</h4>
          <p className="stat-value">
            {inventory.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
        <div className="stat-card">
          <h4>Total Value</h4>
          <p className="stat-value">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="inventory-form">
        <div className="form-group">
          <label>Item Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product name"
            required
          />
        </div>

        <div className="form-group">
          <label>Quantity:</label>
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

        <div className="form-group">
          <label>Price ($):</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </form>

      <div className="inventory-list">
        <h3>Current Inventory</h3>
        {inventory.length === 0 ? (
          <p className="empty-state">No items in inventory yet</p>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="item-name">{item.name}</td>
                  <td>
                    <div className="quantity-controls">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity === 0}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>${item.price.toFixed(2)}</td>
                  <td className="total-value">
                    ${(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default InventoryManager;