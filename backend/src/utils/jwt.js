const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('./AppError');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId, tenantId, role) => {
  const payload = {
    userId,
    tenantId: tenantId ? tenantId.toString() : null,
    role,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401);
    }
    throw new AppError('Invalid token', 401);
  }
};

// Decode token without verification (useful for reading payload)
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
