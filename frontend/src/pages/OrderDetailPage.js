import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/orderDetail.css';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fulfillmentQty, setFulfillmentQty] = useState({});

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await orderService.getOrder(orderId);
      setOrder(response.data.data);
      
      // Initialize fulfillment quantities
      const initialQty = {};
      response.data.data.items.forEach(item => {
        const remaining = item.quantity - (item.fulfilledQuantity || 0);
        initialQty[item._id] = remaining;
      });
      setFulfillmentQty(initialQty);
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillOrder = async () => {
    try {
      const items = Object.entries(fulfillmentQty)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));

      if (items.length === 0) {
        toast.error('No items to fulfill');
        return;
      }

      await orderService.fulfillOrder(orderId, { items });
      toast.success('Order fulfillment recorded');
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fulfill order');
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    
    try {
      await orderService.cancelOrder(orderId, reason);
      toast.success('Order cancelled and stock restored');
      fetchOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (loading) return <div className="loading">Loading order details...</div>;
  if (!order) return <div className="error">Order not found</div>;

  const canManage = ['owner', 'manager', 'staff'].includes(user?.role);
  const canFulfill = canManage && !['fulfilled', 'cancelled'].includes(order.status);
  const canCancel = canManage && !['fulfilled', 'cancelled'].includes(order.status);

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      processing: 'badge-info',
      partially_fulfilled: 'badge-secondary',
      fulfilled: 'badge-success',
      cancelled: 'badge-danger'
    };
    return badges[status] || 'badge-default';
  };

  return (
    <div className="order-detail-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/orders')}>
          ← Back to Orders
        </button>
        <div className="order-header-info">
          <h1>Order {order.orderNumber}</h1>
          <span className={`badge ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      <div className="order-details-grid">
        <div className="detail-card">
          <h2>Customer Information</h2>
          <div className="info-row">
            <span className="label">Name:</span>
            <span className="value">{order.customerInfo?.name || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{order.customerInfo?.email || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Phone:</span>
            <span className="value">{order.customerInfo?.phone || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="label">Address:</span>
            <span className="value">{order.customerInfo?.address || 'N/A'}</span>
          </div>
        </div>

        <div className="detail-card">
          <h2>Order Information</h2>
          <div className="info-row">
            <span className="label">Order Date:</span>
            <span className="value">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="value">{order.status}</span>
          </div>
          {order.fulfilledAt && (
            <div className="info-row">
              <span className="label">Fulfilled:</span>
              <span className="value">{new Date(order.fulfilledAt).toLocaleString()}</span>
            </div>
          )}
          {order.cancelledAt && (
            <div className="info-row">
              <span className="label">Cancelled:</span>
              <span className="value">{new Date(order.cancelledAt).toLocaleString()}</span>
            </div>
          )}
          {order.cancelReason && (
            <div className="info-row">
              <span className="label">Cancel Reason:</span>
              <span className="value">{order.cancelReason}</span>
            </div>
          )}
        </div>
      </div>

      <div className="items-section">
        <h2>Order Items</h2>
        <table className="items-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Price</th>
              <th>Ordered</th>
              <th>Fulfilled</th>
              <th>Remaining</th>
              {canFulfill && <th>Fulfill Qty</th>}
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const remaining = item.quantity - (item.fulfilledQuantity || 0);
              return (
                <tr key={item._id}>
                  <td>{item.sku}</td>
                  <td>{item.variantId?.name || 'N/A'}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td className={item.fulfilledQuantity > 0 ? 'fulfilled' : ''}>
                    {item.fulfilledQuantity || 0}
                  </td>
                  <td className={remaining > 0 ? 'pending' : 'complete'}>
                    {remaining}
                  </td>
                  {canFulfill && (
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={fulfillmentQty[item._id] || 0}
                        onChange={(e) => setFulfillmentQty({
                          ...fulfillmentQty,
                          [item._id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0))
                        })}
                        className="fulfill-input"
                        disabled={remaining === 0}
                      />
                    </td>
                  )}
                  <td>${item.subtotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="order-summary">
        <h2>Order Summary</h2>
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
        {order.discount > 0 && (
          <div className="summary-row">
            <span>Discount:</span>
            <span>-${order.discount.toFixed(2)}</span>
          </div>
        )}
        {order.tax > 0 && (
          <div className="summary-row">
            <span>Tax:</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>
        )}
        <div className="summary-row total">
          <span>Total:</span>
          <span>${order.finalAmount.toFixed(2)}</span>
        </div>
      </div>

      {order.notes && (
        <div className="notes-section">
          <h2>Notes</h2>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="actions-section">
        {canFulfill && (
          <button className="btn-primary" onClick={handleFulfillOrder}>
            Record Fulfillment
          </button>
        )}
        {canCancel && (
          <button className="btn-danger" onClick={handleCancelOrder}>
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
