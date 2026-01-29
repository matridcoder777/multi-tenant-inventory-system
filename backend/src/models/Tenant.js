const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'starter',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
    },
    settings: {
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
  },
  { timestamps: true }
);

// Index for fast tenant lookups
tenantSchema.index({ slug: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
