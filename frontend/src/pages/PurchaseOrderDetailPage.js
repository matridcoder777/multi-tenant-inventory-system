import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/purchaseOrderDetail.css';

const PurchaseOrderDetailPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptItems, setReceiptItems] = useState([]);

  useEffect(() => {
    fetchPODetails();
  }, [poId]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/inventory/purchase-orders/${poId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPo(response.data.data);
      
      // Initialize receipt items with remaining quantities
      const initialReceipt = response.data.data.items.map(item => ({
        itemId: item._id,
        quantity: item.quantity - (item.receivedQuantity || 0),
        actualPrice: item.unitPrice,
        maxQuantity: item.quantity - (item.receivedQuantity || 0),
      }));
      setReceiptItems(initialReceipt);
    } catch (err) {
      setError('Failed to fetch purchase order details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptQuantityChange = (itemId, quantity) => {
    setReceiptItems(receiptItems.map(item =>
      item.itemId === itemId
        ? { ...item, quantity: Math.min(Math.max(0, quantity), item.maxQuantity) }
        : item
    ));
  };

  const handlePriceChange = (itemId, price) => {
    setReceiptItems(receiptItems.map(item =>
      item.itemId === itemId ? { ...item, actualPrice: parseFloat(price) || 0 } : item
    ));
  };

  const handleReceiveItems = async () => {
    const itemsToReceive = receiptItems.filter(item => item.quantity > 0);
    
    if (itemsToReceive.length === 0) {
      setError('Please enter quantities to receive');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/inventory/purchase-orders/${poId}/receive`,
        { items: itemsToReceive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError('');
      fetchPODetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to receive items');
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/inventory/purchase-orders/${poId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPODetails();
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

  const getLineStatusBadge = (lineStatus) => {
    const statusMap = {
      pending: 'pending',
      partial: 'partial',
      received: 'received',
    };
    return statusMap[lineStatus] || 'pending';
  };

  if (loading) {
    return <div className="loading">Loading purchase order...</div>;
  }

  if (!po) {
    return <div className="error">Purchase order not found</div>;
  }

  const canReceive = ['confirmed', 'partially_received'].includes(po.status);
  const canUpdateStatus = ['draft', 'sent'].includes(po.status);

  return (
    <div className="po-detail-page">
      <div className="po-detail-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/purchase-orders')}>
            ← Back
          </button>
          <h1>Purchase Order {po.poNumber}</h1>
        </div>
        <div className="header-actions">
          <span className={`status-badge ${getStatusBadgeClass(po.status)}`}>
            {po.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="po-detail-grid">
        <div className="po-info-card">
          <h2>Supplier Information</h2>
          <div className="info-row">
            <span className="label">Name:</span>
            <span>{po.supplierId?.name || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Email:</span>
            <span>{po.supplierId?.email || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone:</span>
            <span>{po.supplierId?.phone || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Payment Terms:</span>
            <span>{po.supplierId?.paymentTerms || 'N/A'}</span>
          </div>
        </div>

        <div className="po-info-card">
          <h2>Order Information</h2>
          <div className="info-row">
            <span className="label">Created:</span>
            <span>{new Date(po.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Expected Delivery:</span>
            <span>
              {po.expectedDeliveryDate
                ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          {po.actualDeliveryDate && (
            <div className="info-row">
              <span className="label">Actual Delivery:</span>
              <span>{new Date(po.actualDeliveryDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="info-row">
            <span className="label">Payment Status:</span>
            <span className={`status-badge ${po.paymentStatus}`}>
              {po.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {canUpdateStatus && (
        <div className="status-actions">
          {po.status === 'draft' && (
            <button className="btn-action" onClick={() => handleUpdateStatus('sent')}>
              Mark as Sent
            </button>
          )}
          {po.status === 'sent' && (
            <button className="btn-action" onClick={() => handleUpdateStatus('confirmed')}>
              Confirm Order
            </button>
          )}
          {po.status !== 'cancelled' && (
            <button className="btn-cancel-po" onClick={() => handleUpdateStatus('cancelled')}>
              Cancel PO
            </button>
          )}
        </div>
      )}

      <div className="po-items-section">
        <h2>Order Items</h2>
        <table className="po-items-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Remaining</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => {
              const received = item.receivedQuantity || 0;
              const remaining = item.quantity - received;
              return (
                <tr key={item._id}>
                  <td>{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{received}</td>
                  <td>{remaining}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                  <td>${item.subtotal.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${getLineStatusBadge(item.lineStatus)}`}>
                      {item.lineStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canReceive && (
        <div className="receive-items-section">
          <h2>Receive Items</h2>
          <table className="receive-items-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Remaining</th>
                <th>Quantity to Receive</th>
                <th>Unit Price (Actual)</th>
              </tr>
            </thead>
            <tbody>
              {po.items
                .filter(item => item.lineStatus !== 'received')
                .map((item, index) => {
                  const receiptItem = receiptItems.find(r => r.itemId === item._id);
                  if (!receiptItem) return null;
                  
                  return (
                    <tr key={item._id}>
                      <td>{item.sku}</td>
                      <td>{receiptItem.maxQuantity}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={receiptItem.maxQuantity}
                          value={receiptItem.quantity}
                          onChange={(e) =>
                            handleReceiptQuantityChange(item._id, parseInt(e.target.value) || 0)
                          }
                          className="quantity-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={receiptItem.actualPrice}
                          onChange={(e) => handlePriceChange(item._id, e.target.value)}
                          className="price-input"
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <button className="btn-receive" onClick={handleReceiveItems}>
            Receive Items
          </button>
        </div>
      )}

      <div className="po-summary">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>${po.subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Tax:</span>
          <span>${po.tax.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping:</span>
          <span>${po.shipping.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <span>${po.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {po.notes && (
        <div className="po-notes">
          <h3>Notes</h3>
          <p>{po.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetailPage;
