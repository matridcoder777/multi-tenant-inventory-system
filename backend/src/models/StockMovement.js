const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Variant',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      // Can be positive (in) or negative (out)
    },
    movementType: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'adjustment', 'damaged', 'fulfillment'],
      required: true,
    },
    referenceType: {
      type: String,
      enum: ['order', 'purchase_order', 'return', 'manual', 'damaged'],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      // Could be order ID, purchase order ID, etc.
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookups
stockMovementSchema.index({ tenantId: 1, variantId: 1 });
stockMovementSchema.index({ tenantId: 1, createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
