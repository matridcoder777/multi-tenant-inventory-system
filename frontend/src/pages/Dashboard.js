import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/api';
import { onStockUpdate, onOrderCreated, onLowStockAlert } from '../services/socket';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import '../styles/dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard...');
        const response = await analyticsService.getDashboard();
        console.log('Dashboard response:', response);
        
        if (response.data && response.data.data) {
          setDashboardData(response.data.data);
          setError(null);
        } else {
          setError('No data received from server');
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        setError(error.response?.data?.message || 'Failed to load dashboard');
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!dashboardData) return;
    
    const unsubscribeStock = onStockUpdate((data) => {
      toast.info(`Stock updated for variant ${data.variantId}`);
    });

    const unsubscribeOrder = onOrderCreated((data) => {
      toast.success(`New order created: ${data.orderNumber}`);
    });

    const unsubscribeAlert = onLowStockAlert((data) => {
      toast.warning(`Low stock: ${data.sku} (${data.currentStock} remaining)`);
    });

    return () => {
      // Cleanup listeners if needed
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="no-data">No data available</div>;
  }

  const { inventory = {}, orders = {}, topProducts = [], stockMovements = [], lowStockCount = 0 } = dashboardData;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>Total Inventory Value</h3>
          <p className="kpi-value">${(inventory.totalValue || 0).toFixed(2)}</p>
          <p className="kpi-label">{inventory.totalQuantity || 0} items in {inventory.totalProducts || 0} products</p>
        </div>

        <div className="kpi-card">
          <h3>Total Orders (30d)</h3>
          <p className="kpi-value">{orders.totalOrders || 0}</p>
          <p className="kpi-label">${(orders.totalRevenue || 0).toFixed(2)} revenue</p>
        </div>

        <div className="kpi-card">
          <h3>Avg Order Value</h3>
          <p className="kpi-value">${(orders.averageOrderValue || 0).toFixed(2)}</p>
        </div>

        <div className="kpi-card warning">
          <h3>⚠️ Low Stock Items</h3>
          <p className="kpi-value">{lowStockCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Stock Movement Chart */}
        {stockMovements && stockMovements.length > 0 && (
          <div className="chart-container">
            <h3>Stock Movement (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockMovements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inbound" fill="#10b981" name="Inbound" />
                <Bar dataKey="outbound" fill="#ef4444" name="Outbound" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Products List */}
        {topProducts && topProducts.length > 0 && (
          <div className="chart-container">
            <h3>Top 5 Selling Products</h3>
            <div className="top-products-list">
              {topProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-rank">{index + 1}</div>
                  <div className="product-info">
                    <p className="product-name">{product.variantName || product.variantSku}</p>
                    <p className="product-category">{product.productName}</p>
                  </div>
                  <div className="product-stats">
                    <span className="badge">{product.totalQuantity || 0} sold</span>
                    <span className="price">${(product.totalRevenue || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
