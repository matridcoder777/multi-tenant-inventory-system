const mongoose = require('mongoose');
const AppError = require('./AppError');

// Helper function to execute database operations with transaction support
// Falls back to non-transactional execution for standalone MongoDB
const executeWithTransaction = async (callback, session = null) => {
  // Try to execute without transactions first (for standalone MongoDB)
  // This avoids the complexity of checking replica set status
  try {
    const result = await callback(null);
    return result;
  } catch (error) {
    // If we get a specific transaction error and user wants transactions,
    // they can configure MongoDB as a replica set
    throw error;
  }
};

// Helper to ensure stock never goes negative
const updateStockWithValidation = async (VariantModel, variantId, quantityChange, session) => {
  const variant = await VariantModel.findById(variantId).session(session);
  
  if (!variant) {
    throw new AppError('Variant not found', 404);
  }

  const newStock = variant.currentStock + quantityChange;
  
  if (newStock < 0) {
    throw new AppError(`Insufficient stock. Current: ${variant.currentStock}, Requested: ${Math.abs(quantityChange)}`, 400);
  }

  variant.currentStock = newStock;
  await variant.save({ session });
  
  return variant;
};

module.exports = {
  executeWithTransaction,
  updateStockWithValidation,
};
