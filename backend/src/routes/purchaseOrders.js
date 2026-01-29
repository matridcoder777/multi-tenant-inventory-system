const express = require('express');
const { createPO, getPOs, getPO, updatePOStatus, receiveItems } = require('../controllers/purchaseOrderController');
const { createSupplier, getSuppliers, getSupplier, updateSupplier, deleteSupplier, updateProductPricing } = require('../controllers/supplierController');
const { roleGuard } = require('../middleware/auth');

const router = express.Router();

// Supplier routes
router.post('/suppliers', roleGuard(['owner', 'manager']), createSupplier);
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:supplierId', getSupplier);
router.put('/suppliers/:supplierId', roleGuard(['owner', 'manager']), updateSupplier);
router.delete('/suppliers/:supplierId', roleGuard(['owner']), deleteSupplier);
router.post('/suppliers/:supplierId/pricing', roleGuard(['owner', 'manager']), updateProductPricing);

// Purchase order routes
router.post('/purchase-orders', roleGuard(['owner', 'manager']), createPO);
router.get('/purchase-orders', getPOs);
router.get('/purchase-orders/:poId', getPO);
router.patch('/purchase-orders/:poId/status', roleGuard(['owner', 'manager']), updatePOStatus);
router.post('/purchase-orders/:poId/receive', roleGuard(['owner', 'manager']), receiveItems);

module.exports = router;
