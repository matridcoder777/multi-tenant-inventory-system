import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/purchaseOrders.css';

const PurchaseOrdersPage = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    supplierId: '',
    items: [],
    expectedDeliveryDate: '',
    notes: '',
    tax: 0,
    shipping: 0,
  });

  const [currentItem, setCurrentItem] = useState({
    variantId: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchVariants();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPurchaseOrders(response.data.data);
    } catch (err) {
      setError('Failed to fetch purchase orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/inventory/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(response.data.data.filter(s => s.status === 'active'));
    } catch (err) {
      console.error('Failed to fetch suppliers', err);
    }
  };

  const fetchVariants = async (supplierId = null) => {
    try {
      const token = localStorage.getItem('token');
      const params = { limit: 500 };
      if (supplierId) {
        params.supplierId = supplierId;
      }
      const response = await axios.get('http://localhost:5000/api/products/variants/all', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setVariants(response.data.data);
    } catch (err) {
      console.error('Failed to fetch variants', err);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.variantId || currentItem.quantity <= 0 || currentItem.unitPrice <= 0) {
      setError('Please fill all item fields correctly');
      return;
    }

    const variant = variants.find(v => v._id === currentItem.variantId);
    if (!variant) return;

    const newItem = {
      ...currentItem,
      sku: variant.sku,
      name: variant.name || variant.sku,
      subtotal: currentItem.quantity * currentItem.unitPrice,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({ variantId: '', quantity: 1, unitPrice: 0 });
    setError('');
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + parseFloat(formData.tax || 0) + parseFloat(formData.shipping || 0);
    return { subtotal, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplierId) {
      setError('Please select a supplier');
      return;
    }

    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/inventory/purchase-orders',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      resetForm();
      fetchPurchaseOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [],
      expectedDeliveryDate: '',
      notes: '',
      tax: 0,
      shipping: 0,
    });
    setCurrentItem({ variantId: '', quantity: 1, unitPrice: 0 });
    setShowForm(false);
  };

  const handleUpdateStatus = async (poId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/inventory/purchase-orders/${poId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPurchaseOrders();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'draft',
      sent: 'sent',
      confirmed: 'confirmed',
      partially_received: 'partial',
      received: 'received',
      cancelled: 'cancelled',
    };
    return statusMap[status] || 'draft';
  };

  const filteredPOs = statusFilter === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(po => po.status === statusFilter);

  const { subtotal, total } = calculateTotals();

  return (
    <div className="purchase-orders-page">
      <div className="po-header">
        <h1>Purchase Orders</h1>
        <button className="btn-add-po" onClick={() => setShowForm(true)}>
          + New Purchase Order
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="po-form-modal">
          <div className="po-form-container">
            <div className="form-header">
              <h2>New Purchase Order</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="po-form">
              <div className="form-section">
                <h3>Order Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Supplier *</label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => {
                        const supplierId = e.target.value;
                        setFormData({ ...formData, supplierId, items: [] });
                        setCurrentItem({ variantId: '', quantity: 1, unitPrice: 0 });
                        if (supplierId) {
                          fetchVariants(supplierId);
                        } else {
                          setVariants([]);
                        }
                      }}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expected Delivery</label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Add Items</h3>
                {!formData.supplierId && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Please select a supplier first to view available items
                  </p>
                )}
                <div className="item-input-row">
                  <div className="form-group">
                    <label>Product Variant</label>
                    <select
                      value={currentItem.variantId}
                      onChange={(e) => setCurrentItem({ ...currentItem, variantId: e.target.value })}
                      disabled={!formData.supplierId}
                    >
                      <option value="">{formData.supplierId ? 'Select Variant' : 'Select Supplier First'}</option>
                      {variants.map(variant => (
                        <option key={variant._id} value={variant._id}>
                          {variant.sku} - {variant.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.unitPrice}
                      onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: parseFloat(e.target.value) })}
                      min="0"
                    />
                  </div>
                  <button type="button" className="btn-add-item" onClick={handleAddItem}>
                    Add Item
                  </button>
                </div>

                {formData.items.length > 0 && (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.sku}</td>
                          <td>{item.quantity}</td>
                          <td>${item.unitPrice.toFixed(2)}</td>
                          <td>${item.subtotal.toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-remove"
                              onClick={() => handleRemoveItem(index)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="form-section">
                <h3>Additional Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tax}
                      onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Shipping</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.shipping}
                      onChange={(e) => setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                  />
                </div>
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>${parseFloat(formData.tax || 0).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>${parseFloat(formData.shipping || 0).toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="po-filters">
        <button
          className={statusFilter === 'all' ? 'filter-active' : ''}
          onClick={() => setStatusFilter('all')}
        >
          All
        </button>
        <button
          className={statusFilter === 'draft' ? 'filter-active' : ''}
          onClick={() => setStatusFilter('draft')}
        >
          Draft
        </button>
        <button
          className={statusFilter === 'sent' ? 'filter-active' : ''}
          onClick={() => setStatusFilter('sent')}
        >
          Sent
        </button>
        <button
          className={statusFilter === 'confirmed' ? 'filter-active' : ''}
          onClick={() => setStatusFilter('confirmed')}
        >
          Confirmed
        </button>
        <button
          className={statusFilter === 'received' ? 'filter-active' : ''}
          onClick={() => setStatusFilter('received')}
        >
          Received
        </button>
      </div>

      <div className="po-list">
        {loading ? (
          <div className="loading">Loading purchase orders...</div>
        ) : filteredPOs.length === 0 ? (
          <div className="empty-state">No purchase orders found. Create your first PO to get started.</div>
        ) : (
          <table className="po-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.map((po) => (
                <tr key={po._id}>
                  <td className="po-number">{po.poNumber}</td>
                  <td>{po.supplierId?.name || 'N/A'}</td>
                  <td>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td>${po.totalAmount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(po.status)}`}>
                      {po.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-view"
                      onClick={() => navigate(`/purchase-orders/${po._id}`)}
                    >
                      View
                    </button>
                    {po.status === 'draft' && (
                      <button
                        className="btn-send"
                        onClick={() => handleUpdateStatus(po._id, 'sent')}
                      >
                        Send
                      </button>
                    )}
                    {po.status === 'sent' && (
                      <button
                        className="btn-confirm"
                        onClick={() => handleUpdateStatus(po._id, 'confirmed')}
                      >
                        Confirm
                      </button>
                    )}
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

export default PurchaseOrdersPage;
