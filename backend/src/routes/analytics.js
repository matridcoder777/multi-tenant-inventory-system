const express = require('express');
const { getDashboardMetrics, getInventoryAnalytics } = require('../controllers/analyticsController');
const { getLowStockItems, getLowStockSummary } = require('../controllers/alertController');

const router = express.Router();

// Dashboard
router.get('/dashboard', getDashboardMetrics);

// Analytics
router.get('/inventory', getInventoryAnalytics);

// Alerts
router.get('/low-stock', getLowStockItems);
router.get('/low-stock/summary', getLowStockSummary);

module.exports = router;
