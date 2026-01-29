const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Create supplier
exports.createSupplier = catchAsync(async (req, res, next) => {
  const { name, email, phone, address, paymentTerms } = req.body;

  if (!name || !email || !phone) {
    return next(new AppError('Name, email, and phone are required', 400));
  }

  const supplier = await Supplier.create({
    tenantId: req.tenantId,
    name,
    email,
    phone,
    address,
    paymentTerms,
  });

  res.status(201).json({
    success: true,
    data: supplier,
  });
});

// Get suppliers
exports.getSuppliers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { tenantId: req.tenantId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const suppliers = await Supplier.find(query)
    .skip(skip)
    .limit(limit);

  const total = await Supplier.countDocuments(query);

  res.status(200).json({
    success: true,
    data: suppliers,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single supplier
exports.getSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findOne({
    _id: req.params.supplierId,
    tenantId: req.tenantId,
  });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

// Update supplier
exports.updateSupplier = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'email', 'phone', 'address', 'paymentTerms', 'status'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.supplierId, tenantId: req.tenantId },
    updates,
    { new: true, runValidators: true }
  );

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

// Delete supplier
exports.deleteSupplier = catchAsync(async (req, res, next) => {
  const supplier = await Supplier.findOneAndDelete({
    _id: req.params.supplierId,
    tenantId: req.tenantId,
  });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Supplier deleted successfully',
  });
});

// Update product pricing
exports.updateProductPricing = catchAsync(async (req, res, next) => {
  const { variantId, price, leadTimeDays } = req.body;

  if (!variantId || price === undefined) {
    return next(new AppError('Variant ID and price are required', 400));
  }

  const supplier = await Supplier.findOne({
    _id: req.params.supplierId,
    tenantId: req.tenantId,
  });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  // Update or add pricing
  const existingPricing = supplier.productPricing.find(
    (p) => p.variantId.toString() === variantId
  );

  if (existingPricing) {
    existingPricing.price = price;
    existingPricing.leadTimeDays = leadTimeDays;
  } else {
    supplier.productPricing.push({ variantId, price, leadTimeDays });
  }

  await supplier.save();

  res.status(200).json({
    success: true,
    data: supplier,
  });
});
