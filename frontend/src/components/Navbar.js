import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2 className="logo">Inventory</h2>
      </div>

      <div className="sidebar-menu">
        {user?.role === 'admin' ? (
          <>
            <a href="/admin" className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}>
              🏢 Tenant Management
            </a>
          </>
        ) : (
          <>
            <a href="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}>
              📊 Dashboard
            </a>
            <a href="/inventory" className={`sidebar-link ${isActive('/inventory') ? 'active' : ''}`}>
              📦 Inventory
            </a>
            <a href="/orders" className={`sidebar-link ${isActive('/orders') ? 'active' : ''}`}>
              🛒 Orders
            </a>
            {['owner', 'manager'].includes(user?.role) && (
              <>
                <a href="/suppliers" className={`sidebar-link ${isActive('/suppliers') ? 'active' : ''}`}>
                  🏢 Suppliers
                </a>
                <a href="/purchase-orders" className={`sidebar-link ${isActive('/purchase-orders') ? 'active' : ''}`}>
                  📋 Purchase Orders
                </a>
                {user?.role === 'owner' && (
                  <a href="/users" className="sidebar-link">
                    👥 Manage Users
                  </a>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
