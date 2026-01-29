const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
    },
    images: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for fast lookups
productSchema.index({ tenantId: 1, name: 1 });
productSchema.index({ tenantId: 1, category: 1 });
productSchema.index({ tenantId: 1, status: 1 });

// Virtual for variant count
productSchema.virtual('variantCount', {
  ref: 'Variant',
  localField: '_id',
  foreignField: 'productId',
  count: true,
});

module.exports = mongoose.model('Product', productSchema);
