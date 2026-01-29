const express = require('express');
const {
  getAllTenants,
  getTenantDetails,
  createTenant,
  updateTenantStatus,
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
} = require('../controllers/adminController');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

// Master admin routes - require authentication first
router.use(authMiddleware);

// Tenant management (master admin only)
router.get('/tenants', getAllTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:tenantId', getTenantDetails);
router.patch('/tenants/:tenantId/status', updateTenantStatus);

// User management (tenant owner)
router.get('/users', roleGuard(['owner', 'manager']), getTenantUsers);
router.post('/users', roleGuard(['owner']), createTenantUser);
router.patch('/users/:userId', roleGuard(['owner']), updateTenantUser);
router.delete('/users/:userId', roleGuard(['owner']), deleteTenantUser);

module.exports = router;

module.exports = router;
