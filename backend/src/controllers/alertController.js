const mongoose = require('mongoose');
const Variant = require('../models/Variant');
const Tenant = require('../models/Tenant');
const PurchaseOrder = require('../models/PurchaseOrder');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Get low-stock items for a tenant
exports.getLowStockItems = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const tenant = await Tenant.findById(req.tenantId);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const threshold = tenant.settings.lowStockThreshold || 10;
  const skip = (page - 1) * limit;

  // Aggregation pipeline for efficient query
  const pipeline = [
    {
      $match: {
        productId: { $exists: true }, // Assuming variant has productId or we filter differently
      },
    },
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
        'product.tenantId': mongoose.Types.ObjectId(req.tenantId),
        currentStock: { $lt: threshold },
      },
    },
    // Lookup pending purchase orders
    {
      $lookup: {
        from: 'purchaseorders',
        let: { variantId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tenantId', mongoose.Types.ObjectId(req.tenantId)] },
                  { $in: ['$status', ['sent', 'confirmed']] },
                  {
                    $anyElementTrue: {
                      $map: {
                        input: '$items',
                        as: 'item',
                        in: { $eq: ['$$item.variantId', '$$variantId'] },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: 'pendingPOs',
      },
    },
    {
      $addFields: {
        // Calculate total pending from POs
        totalPendingFromPOs: {
          $sum: {
            $map: {
              input: '$pendingPOs',
              as: 'po',
              in: {
                $sum: {
                  $map: {
                    input: '$po.items',
                    as: 'item',
                    in: {
                      $cond: [
                        { $eq: ['$$item.variantId', '$_id'] },
                        { $subtract: ['$$item.quantity', { $ifNull: ['$$item.receivedQuantity', 0] }] },
                        0,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        // Alert only if stock won't be replenished by pending POs
        needsAlert: {
          $cond: [
            {
              $lt: [{ $add: ['$currentStock', '$totalPendingFromPOs'] }, threshold],
            },
            true,
            false,
          ],
        },
      },
    },
    {
      $match: { needsAlert: true },
    },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        sku: 1,
        name: 1,
        currentStock: 1,
        reorderLevel: 1,
        price: 1,
        totalPendingFromPOs: 1,
        productId: 1,
        'product.name': 1,
      },
    },
  ];

  const lowStockItems = await Variant.aggregate(pipeline);

  // Get total count
  const countPipeline = pipeline.slice(0, -2); // Remove skip/limit
  const countResult = await Variant.aggregate([
    ...countPipeline,
    { $count: 'total' },
  ]);

  const total = countResult[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: lowStockItems,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      threshold,
    },
  });
});

// Get alert summary for dashboard
exports.getLowStockSummary = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findById(req.tenantId);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const threshold = tenant.settings.lowStockThreshold || 10;

  const summary = await Variant.aggregate([
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
        'product.tenantId': mongoose.Types.ObjectId(req.tenantId),
        currentStock: { $lt: threshold },
      },
    },
    {
      $group: {
        _id: null,
        totalLowStockItems: { $sum: 1 },
        totalValueAtRisk: {
          $sum: { $multiply: ['$currentStock', '$price'] },
        },
        minStock: { $min: '$currentStock' },
        maxStock: { $max: '$currentStock' },
      },
    },
  ]);

  const criticalItems = await Variant.countDocuments({
    currentStock: 0,
    productId: { $in: (await require('../models/Product').find({ tenantId: req.tenantId }).select('_id')).map((p) => p._id) },
  });

  res.status(200).json({
    success: true,
    data: {
      summary: summary[0] || {
        totalLowStockItems: 0,
        totalValueAtRisk: 0,
        minStock: 0,
        maxStock: 0,
      },
      criticalItems,
      threshold,
    },
  });
});
