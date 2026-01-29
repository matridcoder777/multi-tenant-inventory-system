const Product = require('../models/Product');
const Variant = require('../models/Variant');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Create variant
exports.createVariant = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { sku, name, attributes, price, cost, currentStock, reorderLevel, supplierId } = req.body;

  if (!sku || !name || !price || !supplierId) {
    return next(new AppError('SKU, name, price, and supplier are required', 400));
  }

  // Check if product exists
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check for duplicate SKU per tenant
  const existingSku = await Variant.findOne({
    sku: sku.toUpperCase(),
    productId: productId,
  });

  if (existingSku) {
    return next(new AppError('SKU already exists for this product', 400));
  }

  const variant = await Variant.create({
    productId,
    supplierId,
    sku: sku.toUpperCase(),
    name,
    attributes: attributes || {},
    price,
    cost: cost || 0,
    currentStock: currentStock || 0,
    reorderLevel: reorderLevel || 10,
  });

  res.status(201).json({
    success: true,
    data: variant,
  });
});

// Get variants for a product
exports.getVariants = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  // Verify product belongs to tenant
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const skip = (page - 1) * limit;

  const variants = await Variant.find({ productId })
    .skip(skip)
    .limit(limit);

  const total = await Variant.countDocuments({ productId });

  res.status(200).json({
    success: true,
    data: variants,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single variant
exports.getVariant = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.params;

  // Verify product belongs to tenant
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const variant = await Variant.findOne({
    _id: variantId,
    productId,
  });

  if (!variant) {
    return next(new AppError('Variant not found', 404));
  }

  res.status(200).json({
    success: true,
    data: variant,
  });
});

// Update variant
exports.updateVariant = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.params;
  const allowedFields = ['name', 'attributes', 'price', 'cost', 'reorderLevel', 'status', 'barcode'];

  // Verify product belongs to tenant
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const variant = await Variant.findOneAndUpdate(
    { _id: variantId, productId },
    updates,
    { new: true, runValidators: true }
  );

  if (!variant) {
    return next(new AppError('Variant not found', 404));
  }

  res.status(200).json({
    success: true,
    data: variant,
  });
});

// Delete variant
exports.deleteVariant = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.params;

  // Verify product belongs to tenant
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  const variant = await Variant.findOneAndDelete({
    _id: variantId,
    productId,
  });

  if (!variant) {
    return next(new AppError('Variant not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Variant deleted successfully',
  });
});

// Search variants by SKU or name
exports.searchVariants = catchAsync(async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return next(new AppError('Search query is required', 400));
  }

  // Find products first for this tenant
  const products = await Product.find({ tenantId: req.tenantId }, '_id');
  const productIds = products.map((p) => p._id);

  const variants = await Variant.find({
    productId: { $in: productIds },
    $or: [
      { sku: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ],
  }).limit(20);

  res.status(200).json({
    success: true,
    data: variants,
  });
});

// Get all variants for tenant (for purchase orders, etc.)
exports.getAllVariants = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 100, supplierId } = req.query;

  // Find products first for this tenant
  const products = await Product.find({ tenantId: req.tenantId }, '_id');
  const productIds = products.map((p) => p._id);

  const skip = (page - 1) * limit;

  const filter = {
    productId: { $in: productIds },
    status: 'active',
  };

  // Filter by supplier if provided
  if (supplierId) {
    filter.supplierId = supplierId;
  }

  const variants = await Variant.find(filter)
    .populate('supplierId', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ sku: 1 });

  const total = await Variant.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: variants,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Adjust stock for a variant
exports.adjustStock = catchAsync(async (req, res, next) => {
  const { productId, variantId } = req.params;
  const { quantity, reason, movementType } = req.body;

  if (!quantity || quantity === 0) {
    return next(new AppError('Quantity is required and cannot be zero', 400));
  }

  if (!reason) {
    return next(new AppError('Reason for stock adjustment is required', 400));
  }

  // Verify product belongs to tenant
  const product = await Product.findOne({
    _id: productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Find the variant
  const variant = await Variant.findOne({
    _id: variantId,
    productId,
  });

  if (!variant) {
    return next(new AppError('Variant not found', 404));
  }

  // Check if adjustment would result in negative stock
  const newStock = variant.currentStock + quantity;
  if (newStock < 0) {
    return next(new AppError(`Cannot adjust stock. Would result in negative stock (${newStock})`, 400));
  }

  // Update variant stock
  variant.currentStock = newStock;
  await variant.save();

  // Record stock movement
  await StockMovement.create({
    tenantId: req.tenantId,
    variantId: variant._id,
    quantity: quantity,
    movementType: movementType || 'adjustment',
    referenceType: 'manual',
    referenceId: null,
    notes: reason,
    createdBy: req.user.userId,
  });

  res.status(200).json({
    success: true,
    data: variant,
    message: 'Stock adjusted successfully',
  });
});

