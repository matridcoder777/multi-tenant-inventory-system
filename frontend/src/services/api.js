import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth service
export const authService = {
  login: (email, password, tenantSlug) =>
    apiClient.post('/auth/login', { email, password, tenantSlug }),
  register: (name, email, password, tenantSlug) =>
    apiClient.post('/auth/register', { name, email, password, tenantSlug }),
  getCurrentUser: () => apiClient.get('/auth/me'),
};

// Products service
export const productService = {
  getProducts: (page = 1, limit = 20, category = null) =>
    apiClient.get('/products', { params: { page, limit, category } }),
  getProduct: (productId) => apiClient.get(`/products/${productId}`),
  createProduct: (data) => apiClient.post('/products', data),
  updateProduct: (productId, data) => apiClient.put(`/products/${productId}`, data),
  deleteProduct: (productId) => apiClient.delete(`/products/${productId}`),
};

// Variants service
export const variantService = {
  getVariants: (productId, page = 1, limit = 20) =>
    apiClient.get(`/products/${productId}/variants`, { params: { page, limit } }),
  getVariant: (productId, variantId) =>
    apiClient.get(`/products/${productId}/variants/${variantId}`),
  createVariant: (productId, data) => apiClient.post(`/products/${productId}/variants`, data),
  updateVariant: (productId, variantId, data) =>
    apiClient.put(`/products/${productId}/variants/${variantId}`, data),
  deleteVariant: (productId, variantId) =>
    apiClient.delete(`/products/${productId}/variants/${variantId}`),
  searchVariants: (q) => apiClient.get('/products/variants/search', { params: { q } }),
  adjustStock: (productId, variantId, data) =>
    apiClient.post(`/products/${productId}/variants/${variantId}/adjust-stock`, data),
};

// Orders service
export const orderService = {
  getOrders: (page = 1, limit = 20, status = null) =>
    apiClient.get('/orders', { params: { page, limit, status } }),
  getOrder: (orderId) => apiClient.get(`/orders/${orderId}`),
  createOrder: (data) => apiClient.post('/orders', data),
  cancelOrder: (orderId, reason) => apiClient.post(`/orders/${orderId}/cancel`, { reason }),
  fulfillOrder: (orderId, data) => apiClient.post(`/orders/${orderId}/fulfill`, data),
};

// Suppliers service
export const supplierService = {
  getSuppliers: (page = 1, limit = 20, status = null) =>
    apiClient.get('/inventory/suppliers', { params: { page, limit, status } }),
  getSupplier: (supplierId) => apiClient.get(`/inventory/suppliers/${supplierId}`),
  createSupplier: (data) => apiClient.post('/inventory/suppliers', data),
  updateSupplier: (supplierId, data) => apiClient.put(`/inventory/suppliers/${supplierId}`, data),
  deleteSupplier: (supplierId) => apiClient.delete(`/inventory/suppliers/${supplierId}`),
  updateProductPricing: (supplierId, data) =>
    apiClient.post(`/inventory/suppliers/${supplierId}/pricing`, data),
};

// Purchase Orders service
export const purchaseOrderService = {
  getPOs: (page = 1, limit = 20, status = null) =>
    apiClient.get('/inventory/purchase-orders', { params: { page, limit, status } }),
  getPO: (poId) => apiClient.get(`/inventory/purchase-orders/${poId}`),
  createPO: (data) => apiClient.post('/inventory/purchase-orders', data),
  updatePOStatus: (poId, status) =>
    apiClient.patch(`/inventory/purchase-orders/${poId}/status`, { status }),
  receiveItems: (poId, items) =>
    apiClient.post(`/inventory/purchase-orders/${poId}/receive`, { items }),
};

// Analytics service
export const analyticsService = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getInventoryAnalytics: (period = '30') =>
    apiClient.get('/analytics/inventory', { params: { period } }),
  getLowStockItems: (page = 1, limit = 20) =>
    apiClient.get('/analytics/low-stock', { params: { page, limit } }),
  getLowStockSummary: () => apiClient.get('/analytics/low-stock/summary'),
};

export default apiClient;
