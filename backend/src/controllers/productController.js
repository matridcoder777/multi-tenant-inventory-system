const Product = require('../models/Product');
const Variant = require('../models/Variant');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Create product
exports.createProduct = catchAsync(async (req, res, next) => {
  const { name, description, category, brand } = req.body;

  if (!name || !category) {
    return next(new AppError('Name and category are required', 400));
  }

  const product = await Product.create({
    tenantId: req.tenantId,
    name,
    description,
    category,
    brand,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

// Get all products
exports.getProducts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, category, status } = req.query;

  const query = { tenantId: req.tenantId };
  if (category) query.category = category;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single product
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({
    _id: req.params.productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Get variants for this product
  const variants = await Variant.find({ productId: product._id });

  res.status(200).json({
    success: true,
    data: {
      ...product.toObject(),
      variants,
    },
  });
});

// Update product
exports.updateProduct = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'description', 'category', 'brand', 'status', 'images', 'tags'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const product = await Product.findOneAndUpdate(
    { _id: req.params.productId, tenantId: req.tenantId },
    updates,
    { new: true, runValidators: true }
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// Delete product
exports.deleteProduct = catchAsync(async (req, res, next) => {
  // Check if product has variants
  const variantCount = await Variant.countDocuments({ productId: req.params.productId });
  if (variantCount > 0) {
    return next(new AppError('Cannot delete product with existing variants', 400));
  }

  const product = await Product.findOneAndDelete({
    _id: req.params.productId,
    tenantId: req.tenantId,
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});
