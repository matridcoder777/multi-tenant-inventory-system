import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService, variantService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/orders.css';

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerInfo: { name: '', email: '', phone: '', address: '' },
    items: [],
    notes: '',
    discount: 0,
    tax: 0
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, filter]);

  const fetchOrders = async () => {
    try {
      const status = filter !== 'all' ? filter : null;
      const response = await orderService.getOrders(page, 20, status);
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const searchVariants = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await variantService.searchVariants(query);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const addItemToOrder = (variant) => {
    const existingItem = newOrder.items.find(item => item.variantId === variant._id);
    if (existingItem) {
      toast.error('Item already added');
      return;
    }
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, {
        variantId: variant._id,
        sku: variant.sku,
        name: variant.name,
        price: variant.price,
        quantity: 1,
        availableStock: variant.currentStock
      }]
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItemQuantity = (index, quantity) => {
    const items = [...newOrder.items];
    items[index].quantity = Math.max(1, parseInt(quantity) || 1);
    setNewOrder({ ...newOrder, items });
  };

  const removeItem = (index) => {
    const items = [...newOrder.items];
    items.splice(index, 1);
    setNewOrder({ ...newOrder, items });
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (newOrder.items.length === 0) {
      toast.error('Add at least one item to the order');
      return;
    }
    try {
      const orderData = {
        customerInfo: newOrder.customerInfo,
        items: newOrder.items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity
        })),
        notes: newOrder.notes,
        discount: parseFloat(newOrder.discount) || 0,
        tax: parseFloat(newOrder.tax) || 0
      };
      await orderService.createOrder(orderData);
      toast.success('Order created successfully');
      setShowCreateOrder(false);
      setNewOrder({
        customerInfo: { name: '', email: '', phone: '', address: '' },
        items: [],
        notes: '',
        discount: 0,
        tax: 0
      });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    try {
      await orderService.cancelOrder(orderId, reason);
      toast.success('Order cancelled and stock restored');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  const canManage = ['owner', 'manager', 'staff'].includes(user?.role);
  const totalOrderValue = newOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalAmount = totalOrderValue - (parseFloat(newOrder.discount) || 0) + (parseFloat(newOrder.tax) || 0);

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
    <div className="orders-page">
      <div className="page-header">
        <h1>Orders</h1>
        <div className="header-actions">
          {canManage && (
            <button className="btn-primary" onClick={() => setShowCreateOrder(!showCreateOrder)}>
              + New Order
            </button>
          )}
        </div>
      </div>

      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="partially_fulfilled">Partially Fulfilled</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {showCreateOrder && canManage && (
        <div className="create-order-form">
          <h2>Create New Order</h2>
          <form onSubmit={handleCreateOrder}>
            <div className="form-section">
              <h3>Customer Information</h3>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={newOrder.customerInfo.name}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    customerInfo: { ...newOrder.customerInfo, name: e.target.value }
                  })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newOrder.customerInfo.email}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    customerInfo: { ...newOrder.customerInfo, email: e.target.value }
                  })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newOrder.customerInfo.phone}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    customerInfo: { ...newOrder.customerInfo, phone: e.target.value }
                  })}
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newOrder.customerInfo.address}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    customerInfo: { ...newOrder.customerInfo, address: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Order Items</h3>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search products by SKU or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchVariants(e.target.value);
                  }}
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(variant => (
                      <div key={variant._id} className="search-result-item" onClick={() => addItemToOrder(variant)}>
                        <span className="sku">{variant.sku}</span>
                        <span className="name">{variant.name}</span>
                        <span className="price">${variant.price.toFixed(2)}</span>
                        <span className="stock">Stock: {variant.currentStock}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {newOrder.items.length > 0 && (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Available</th>
                      <th>Quantity</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>{item.availableStock}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, e.target.value)}
                            className="qty-input"
                          />
                        </td>
                        <td>${(item.price * item.quantity).toFixed(2)}</td>
                        <td>
                          <button type="button" className="btn-remove" onClick={() => removeItem(index)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="form-section">
              <h3>Order Summary</h3>
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${totalOrderValue.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Discount:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOrder.discount}
                    onChange={(e) => setNewOrder({ ...newOrder, discount: e.target.value })}
                    className="amount-input"
                  />
                </div>
                <div className="summary-row">
                  <span>Tax:</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOrder.tax}
                    onChange={(e) => setNewOrder({ ...newOrder, tax: e.target.value })}
                    className="amount-input"
                  />
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>${finalAmount.toFixed(2)}</span>
                </div>
              </div>

              <textarea
                placeholder="Order notes (optional)"
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Create Order</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateOrder(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="no-data">No orders found</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td className="order-number">{order.orderNumber}</td>
                  <td>{order.customerInfo?.name || 'N/A'}</td>
                  <td>{order.items?.length || 0} items</td>
                  <td>${order.finalAmount?.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        onClick={() => navigate(`/orders/${order._id}`)}
                      >
                        View
                      </button>
                      {canManage && !['fulfilled', 'cancelled'].includes(order.status) && (
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelOrder(order._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
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

export default OrdersPage;
