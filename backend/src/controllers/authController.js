const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { generateToken } = require('../utils/jwt');

// Register user
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, tenantSlug } = req.body;

  // Validate input
  if (!name || !email || !password || !tenantSlug) {
    return next(new AppError('Missing required fields', 400));
  }

  // Find tenant
  const tenant = await Tenant.findOne({ slug: tenantSlug });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  // Check if user already exists
  let user = await User.findOne({ tenantId: tenant._id, email });
  if (user) {
    return next(new AppError('User already exists for this email', 400));
  }

  // Create new user
  user = await User.create({
    tenantId: tenant._id,
    name,
    email,
    password,
    role: 'staff',
  });

  const token = generateToken(user._id, user.tenantId, user.role);

  res.status(201).json({
    success: true,
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// Login user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password, tenantSlug } = req.body;
  console.log('[LOGIN] Starting login process for:', email);

  // Validate input
  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  // Check if this is master admin login (tenantSlug is null/undefined or 'admin')
  if (!tenantSlug || tenantSlug === 'admin') {
    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (user.status !== 'active') {
      return next(new AppError('User account is inactive', 403));
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id, null, user.role); // No tenant for admin

    return res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
        isAdmin: true,
      },
    });
  }

  // Regular tenant login
  if (!tenantSlug) {
    return next(new AppError('Tenant slug is required', 400));
  }

  // Find tenant
  const tenant = await Tenant.findOne({ slug: tenantSlug });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }
  console.log('[LOGIN] Tenant found:', tenant.slug);

  // Find user with password field
  const user = await User.findOne({ tenantId: tenant._id, email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }
  console.log('[LOGIN] User found:', user.email);

  // Check password
  console.log('[LOGIN] Checking password...');
  const isPasswordMatch = await user.matchPassword(password);
  console.log('[LOGIN] Password match result:', isPasswordMatch);
  if (!isPasswordMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if user is active
  if (user.status !== 'active') {
    return next(new AppError('User account is inactive', 403));
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id, user.tenantId, user.role);

  res.status(200).json({
    success: true,
    data: {
      user: user.toJSON(),
      token,
    },
  });
});

// Get current user
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// Logout (frontend will remove token)
exports.logout = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});
