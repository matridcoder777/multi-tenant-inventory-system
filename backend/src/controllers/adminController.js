const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Get all tenants (master admin only)
exports.getAllTenants = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const tenants = await Tenant.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Tenant.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: tenants,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single tenant details
exports.getTenantDetails = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Get user count
  const userCount = await User.countDocuments({ tenantId });

  res.status(200).json({
    success: true,
    data: {
      ...tenant.toObject(),
      userCount,
    },
  });
});

// Create new tenant
exports.createTenant = catchAsync(async (req, res, next) => {
  const { name, slug, ownerName, ownerEmail, ownerPassword } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
    return next(new AppError('All fields are required', 400));
  }

  // Check if tenant slug already exists
  const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
  if (existingTenant) {
    return next(new AppError('Tenant slug already exists', 400));
  }

  // Check if owner email already exists in any tenant
  const existingEmail = await User.findOne({ email: ownerEmail });
  if (existingEmail) {
    return next(new AppError('Email already in use', 400));
  }

  // Create tenant
  const tenant = await Tenant.create({
    name,
    slug: slug.toLowerCase(),
    status: 'active',
  });

  // Create owner user
  const owner = await User.create({
    tenantId: tenant._id,
    name: ownerName,
    email: ownerEmail,
    password: ownerPassword,
    role: 'owner',
    status: 'active',
  });

  res.status(201).json({
    success: true,
    data: {
      tenant,
      owner: owner.toJSON(),
    },
  });
});

// Update tenant status
exports.updateTenantStatus = catchAsync(async (req, res, next) => {
  const { tenantId } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { status },
    { new: true, runValidators: true }
  );

  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  res.status(200).json({
    success: true,
    data: tenant,
  });
});

// Get all users for a tenant (tenant owner only)
exports.getTenantUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, role } = req.query;
  const skip = (page - 1) * limit;

  // Check if requester is owner of this tenant
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return next(new AppError('Unauthorized', 403));
  }

  const filter = { tenantId: req.tenantId };
  if (role) {
    filter.role = role;
  }

  const users = await User.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .select('-password');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Create user in tenant (tenant owner only)
exports.createTenantUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validate input
  if (!name || !email || !password || !role) {
    return next(new AppError('Name, email, password, and role are required', 400));
  }

  // Check valid roles
  if (!['manager', 'staff'].includes(role)) {
    return next(new AppError('Invalid role. Only manager and staff allowed', 400));
  }

  // Check if email already exists in this tenant
  const existingUser = await User.findOne({
    tenantId: req.tenantId,
    email,
  });

  if (existingUser) {
    return next(new AppError('Email already exists in this tenant', 400));
  }

  // Create user
  const user = await User.create({
    tenantId: req.tenantId,
    name,
    email,
    password,
    role,
    status: 'active',
  });

  res.status(201).json({
    success: true,
    data: user.toJSON(),
  });
});

// Update tenant user
exports.updateTenantUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { name, role, status } = req.body;

  // Check if user belongs to this tenant
  const user = await User.findOne({
    _id: userId,
    tenantId: req.tenantId,
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent changing owner role
  if (user.role === 'owner' && role !== 'owner') {
    return next(new AppError('Cannot change owner role', 400));
  }

  const updates = {};
  if (name) updates.name = name;
  if (role && ['manager', 'staff'].includes(role)) updates.role = role;
  if (status && ['active', 'inactive'].includes(status)) updates.status = status;

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select('-password');

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

// Delete tenant user
exports.deleteTenantUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  // Check if user belongs to this tenant
  const user = await User.findOne({
    _id: userId,
    tenantId: req.tenantId,
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent deleting owner
  if (user.role === 'owner') {
    return next(new AppError('Cannot delete tenant owner', 400));
  }

  await User.findByIdAndDelete(userId);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});
