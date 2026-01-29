import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import AdminPortalPage from './pages/AdminPortalPage';
import UserManagementPage from './pages/UserManagementPage';
import './styles/global.css';

function AppContent() {
  const { isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Toaster position="top-right" />
      {isAuthenticated && (
        <div style={{ display: 'flex' }}>
          <Navbar />
          <main style={{ flex: 1, marginLeft: '250px' }}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <PrivateRoute>
                    <InventoryPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/products/:productId"
                element={
                  <PrivateRoute>
                    <ProductDetailPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <PrivateRoute>
                    <OrdersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders/:orderId"
                element={
                  <PrivateRoute>
                    <OrderDetailPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <PrivateRoute>
                    <SuppliersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <PrivateRoute>
                    <PurchaseOrdersPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/purchase-orders/:poId"
                element={
                  <PrivateRoute>
                    <PurchaseOrderDetailPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminPortalPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute>
                    <UserManagementPage />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
        </div>
      )}
      {!isAuthenticated && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
