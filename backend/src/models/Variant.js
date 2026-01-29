const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    attributes: {
      type: Map,
      of: String,
      default: new Map(),
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    cost: {
      type: Number,
      required: true,
      min: [0, 'Cost cannot be negative'],
    },
    weight: {
      type: Number,
      default: 0,
    },
    barcode: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Compound unique index: tenantId + productId + sku
variantSchema.index({ productId: 1, sku: 1 });

module.exports = mongoose.model('Variant', variantSchema);
