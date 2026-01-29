const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  fulfillOrder,
} = require('../controllers/orderController');
const { roleGuard } = require('../middleware/auth');

const router = express.Router();

// Order routes
router.post('/', roleGuard(['owner', 'manager', 'staff']), createOrder);
router.get('/', getOrders);
router.get('/:orderId', getOrder);
router.post('/:orderId/cancel', roleGuard(['owner', 'manager']), cancelOrder);
router.post('/:orderId/fulfill', roleGuard(['owner', 'manager']), fulfillOrder);

module.exports = router;
