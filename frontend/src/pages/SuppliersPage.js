import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/suppliers.css';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    paymentTerms: 'Net 30',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(response.data.data);
    } catch (err) {
      setError('Failed to fetch suppliers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [addressField]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (editingSupplier) {
        await axios.put(
          `http://localhost:5000/api/inventory/suppliers/${editingSupplier._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          'http://localhost:5000/api/inventory/suppliers',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      resetForm();
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      paymentTerms: 'Net 30',
      status: 'active',
    });
    setEditingSupplier(null);
    setShowForm(false);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      paymentTerms: supplier.paymentTerms || 'Net 30',
      status: supplier.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/inventory/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSuppliers();
    } catch (err) {
      setError('Failed to delete supplier');
    }
  };

  return (
    <div className="suppliers-page">
      <div className="suppliers-header">
        <h1>Suppliers</h1>
        <button
          className="btn-add-supplier"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Supplier
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="supplier-form-modal">
          <div className="supplier-form-container">
            <div className="form-header">
              <h2>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="supplier-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Terms</label>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Street</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingSupplier ? 'Update' : 'Create'} Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="suppliers-list">
        {loading ? (
          <div className="loading">Loading suppliers...</div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">No suppliers found. Add your first supplier to get started.</div>
        ) : (
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Payment Terms</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td className="supplier-name">{supplier.name}</td>
                  <td>
                    <div>{supplier.email}</div>
                    <div className="phone">{supplier.phone}</div>
                  </td>
                  <td>
                    {supplier.address?.city && supplier.address?.state
                      ? `${supplier.address.city}, ${supplier.address.state}`
                      : 'N/A'}
                  </td>
                  <td>{supplier.paymentTerms}</td>
                  <td>
                    <span className={`status-badge ${supplier.status}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(supplier)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(supplier._id)}>
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
};

export default SuppliersPage;
