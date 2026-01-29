const AppError = require('../utils/AppError');

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    err = new AppError(message, 400);
  }

  // Handle duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    err = new AppError(`${field} already exists`, 400);
  }

  // Handle cast error
  if (err.name === 'CastError') {
    err = new AppError('Invalid ID format', 400);
  }

  // Send error response
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
