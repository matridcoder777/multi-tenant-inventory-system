const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
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
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentTerms: {
      type: String,
      default: 'Net 30',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    productPricing: [
      {
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Variant',
        },
        price: Number,
        leadTimeDays: Number,
      },
    ],
  },
  { timestamps: true }
);

// Index for fast lookups
supplierSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
