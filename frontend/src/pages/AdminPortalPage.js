import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/adminPortal.css';

const AdminPortalPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenants(response.data.data);
    } catch (error) {
      toast.error('Failed to load tenants');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/admin/tenants',
        newTenant,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Tenant created successfully');
      setNewTenant({
        name: '',
        slug: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
      });
      setShowCreateTenant(false);
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    }
  };

  const handleUpdateStatus = async (tenantId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/admin/tenants/${tenantId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Tenant status updated');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  if (loading) return <div className="loading">Loading tenants...</div>;

  return (
    <div className="admin-portal-page">
      <div className="admin-header">
        <h1>Admin Portal - Tenant Management</h1>
        <button className="btn-primary" onClick={() => setShowCreateTenant(true)}>
          + Create Tenant
        </button>
      </div>

      {showCreateTenant && (
        <div className="modal-overlay" onClick={() => setShowCreateTenant(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Tenant</h3>
            <form onSubmit={handleCreateTenant}>
              <div className="form-group">
                <label>Tenant Name *</label>
                <input
                  type="text"
                  placeholder="e.g., ABC Corporation"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Slug *</label>
                <input
                  type="text"
                  placeholder="e.g., abc-corp"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  type="text"
                  placeholder="Owner name"
                  value={newTenant.ownerName}
                  onChange={(e) => setNewTenant({ ...newTenant, ownerName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Email *</label>
                <input
                  type="email"
                  placeholder="owner@company.com"
                  value={newTenant.ownerEmail}
                  onChange={(e) => setNewTenant({ ...newTenant, ownerEmail: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Password *</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={newTenant.ownerPassword}
                  onChange={(e) => setNewTenant({ ...newTenant, ownerPassword: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Create Tenant
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateTenant(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tenants-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant._id}>
                <td>{tenant.name}</td>
                <td>{tenant.slug}</td>
                <td>
                  <span className={`badge badge-${tenant.status}`}>{tenant.status}</span>
                </td>
                <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td>
                  <select
                    value={tenant.status}
                    onChange={(e) => handleUpdateStatus(tenant._id, e.target.value)}
                    className="status-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPortalPage;
