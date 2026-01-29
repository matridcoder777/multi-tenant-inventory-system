const mongoose = require('mongoose');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');
const Variant = require('../models/Variant');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Get dashboard metrics
exports.getDashboardMetrics = catchAsync(async (req, res, next) => {
  const tenantId = typeof req.tenantId === 'string' ? new mongoose.Types.ObjectId(req.tenantId) : req.tenantId;
  
  // Inventory value
  const inventoryValue = await Variant.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $match: {
        'product.tenantId': tenantId,
      },
    },
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: { $multiply: ['$currentStock', '$cost'] },
        },
        totalQuantity: { $sum: '$currentStock' },
        totalProducts: { $sum: 1 },
      },
    },
  ]);

  // Order metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orderMetrics = await Order.aggregate([
    {
      $match: {
        tenantId: tenantId,
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$finalAmount' },
        averageOrderValue: { $avg: '$finalAmount' },
      },
    },
  ]);

  // Top selling products
  const topProducts = await Order.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.variantId',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'variants',
        localField: '_id',
        foreignField: '_id',
        as: 'variant',
      },
    },
    { $unwind: '$variant' },
    {
      $lookup: {
        from: 'products',
        localField: 'variant.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 },
    {
      $project: {
        variantSku: '$variant.sku',
        variantName: '$variant.name',
        productName: '$product.name',
        totalQuantity: 1,
        totalRevenue: 1,
        orderCount: 1,
      },
    },
  ]);

  // Stock movement graph (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const stockMovements = await StockMovement.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        inbound: {
          $sum: {
            $cond: [{ $gte: ['$quantity', 0] }, '$quantity', 0],
          },
        },
        outbound: {
          $sum: {
            $cond: [{ $lt: ['$quantity', 0] }, { $abs: '$quantity' }, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Low stock alerts count
  const tenant = await require('../models/Tenant').findById(req.tenantId);
  const lowStockThreshold = tenant?.settings.lowStockThreshold || 10;

  const lowStockCount = await Variant.countDocuments({
    currentStock: { $lt: lowStockThreshold },
    productId: { $in: (await Product.find({ tenantId: req.tenantId }).select('_id')).map((p) => p._id) },
  });

  res.status(200).json({
    success: true,
    data: {
      inventory: inventoryValue[0] || {
        totalValue: 0,
        totalQuantity: 0,
        totalProducts: 0,
      },
      orders: orderMetrics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      topProducts,
      stockMovements,
      lowStockCount,
      lastUpdated: new Date(),
    },
  });
});

// Get inventory analytics
exports.getInventoryAnalytics = catchAsync(async (req, res, next) => {
  const { period = '30' } = req.query;
  const periodDays = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Stock turnover by category
  const turnoverByCategory = await Order.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'variants',
        localField: 'items.variantId',
        foreignField: '_id',
        as: 'variant',
      },
    },
    { $unwind: '$variant' },
    {
      $lookup: {
        from: 'products',
        localField: 'variant.productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        itemCount: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  // Product health (active, inactive, discontinued)
  const productHealth = await Product.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Supplier performance (based on PO quality)
  const supplierPerformance = await PurchaseOrder.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(req.tenantId),
        status: { $in: ['received', 'partially_received'] },
      },
    },
    {
      $group: {
        _id: '$supplierId',
        totalOrders: { $sum: 1 },
        onTimeDeliveries: {
          $sum: {
            $cond: [
              {
                $lte: ['$actualDeliveryDate', '$expectedDeliveryDate'],
              },
              1,
              0,
            ],
          },
        },
        totalValue: { $sum: '$totalAmount' },
      },
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: '_id',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: '$supplier' },
    {
      $addFields: {
        onTimePercentage: {
          $multiply: [
            { $divide: ['$onTimeDeliveries', '$totalOrders'] },
            100,
          ],
        },
      },
    },
    {
      $project: {
        supplierName: '$supplier.name',
        totalOrders: 1,
        onTimePercentage: 1,
        totalValue: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      turnoverByCategory,
      productHealth,
      supplierPerformance,
      period: periodDays,
    },
  });
});
