import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/auth.css';

const demoCredentials = {
  'acme-electronics': {
    owner: { email: 'alice@acme.com', password: 'password123' },
    manager: { email: 'bob@acme.com', password: 'password123' },
    staff: { email: 'charlie@acme.com', password: 'password123' },
  },
  'techstores-inc': {
    owner: { email: 'diana@techstores.com', password: 'password123' },
    manager: { email: 'eve@techstores.com', password: 'password123' },
    staff: { email: 'frank@techstores.com', password: 'password123' },
  },
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantSlug: 'acme-electronics', // Default to first tenant
  });
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // For admin login, pass empty string or 'admin' as tenantSlug
      const tenantSlug = isAdminLogin ? 'admin' : formData.tenantSlug;
      const response = await login(formData.email, formData.password, tenantSlug);
      toast.success('Login successful!');
      
      // Redirect to admin portal for admin, dashboard for others
      const redirectPath = response.data.isAdmin ? '/admin' : '/dashboard';
      navigate(redirectPath);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Inventory Management System</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isAdminLogin}
                onChange={(e) => setIsAdminLogin(e.target.checked)}
              />
              Master Admin Login
            </label>
          </div>

          {!isAdminLogin && (
            <div className="form-group">
              <label>Tenant</label>
              <select
                name="tenantSlug"
                value={formData.tenantSlug}
                onChange={handleChange}
                required
              >
                <option value="acme-electronics">Acme Electronics</option>
                <option value="techstores-inc">TechStores Inc</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g., alice@acme.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="password123"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="demo-info">
          <p><strong>Demo Credentials:</strong></p>
          {isAdminLogin ? (
            <>
              <p>Master Admin: admin@system.local / admin123456</p>
            </>
          ) : (
            <>
              <p>Owner: {demoCredentials[formData.tenantSlug].owner.email} / password123</p>
              <p>Manager: {demoCredentials[formData.tenantSlug].manager.email} / password123</p>
              <p>Staff: {demoCredentials[formData.tenantSlug].staff.email} / password123</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
