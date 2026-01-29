const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  lineStatus: {
    type: String,
    enum: ['pending', 'partial', 'received'],
    default: 'pending',
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
      index: true,
    },
    items: [poItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
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

// Indexes
purchaseOrderSchema.index({ tenantId: 1, status: 1 });
purchaseOrderSchema.index({ tenantId: 1, createdAt: -1 });
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplierId: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
