const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Variant = require('../models/Variant');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { executeWithTransaction } = require('../utils/transactionHelper');

// Generate unique PO number
const generatePONumber = async (tenantId) => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await PurchaseOrder.countDocuments({ tenantId });
  return `PO-${dateStr}-${String(count + 1).padStart(5, '0')}`;
};

// Create purchase order
exports.createPO = catchAsync(async (req, res, next) => {
  const { supplierId, items, expectedDeliveryDate, notes } = req.body;

  if (!supplierId || !items || items.length === 0) {
    return next(new AppError('Supplier and items are required', 400));
  }

  // Check supplier exists
  const supplier = await Supplier.findOne({
    _id: supplierId,
    tenantId: req.tenantId,
  });

  if (!supplier) {
    return next(new AppError('Supplier not found', 404));
  }

  let subtotal = 0;
  const processedItems = [];

  // Validate variants
  for (const item of items) {
    const variant = await Variant.findById(item.variantId);

    if (!variant) {
      return next(new AppError(`Variant not found: ${item.variantId}`, 404));
    }

    const itemSubtotal = item.quantity * item.unitPrice;
    subtotal += itemSubtotal;

    processedItems.push({
      variantId: variant._id,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: itemSubtotal,
    });
  }

  const tax = req.body.tax || 0;
  const shipping = req.body.shipping || 0;
  const totalAmount = subtotal + tax + shipping;

  const poNumber = await generatePONumber(req.tenantId);
  const po = await PurchaseOrder.create({
    tenantId: req.tenantId,
    poNumber,
    supplierId,
    items: processedItems,
    subtotal,
    tax,
    shipping,
    totalAmount,
    expectedDeliveryDate,
    notes,
    createdBy: req.user.userId,
  });

  res.status(201).json({
    success: true,
    data: po,
  });
});

// Get purchase orders
exports.getPOs = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { tenantId: req.tenantId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const pos = await PurchaseOrder.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('supplierId');

  const total = await PurchaseOrder.countDocuments(query);

  res.status(200).json({
    success: true,
    data: pos,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single PO
exports.getPO = catchAsync(async (req, res, next) => {
  const po = await PurchaseOrder.findOne({
    _id: req.params.poId,
    tenantId: req.tenantId,
  }).populate('supplierId');

  if (!po) {
    return next(new AppError('Purchase order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: po,
  });
});

// Update PO status
exports.updatePOStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'sent', 'confirmed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.poId, tenantId: req.tenantId },
    { status },
    { new: true }
  );

  if (!po) {
    return next(new AppError('Purchase order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: po,
  });
});

// Receive items (auto-increase stock)
exports.receiveItems = catchAsync(async (req, res, next) => {
  const { poId } = req.params;
  const { items } = req.body;

  if (!items || items.length === 0) {
    return next(new AppError('Receipt items are required', 400));
  }

  const result = await executeWithTransaction(async (session) => {
    // Build query and conditionally use session
    const query = PurchaseOrder.findOne({
      _id: poId,
      tenantId: req.tenantId,
    });
    const po = session ? await query.session(session) : await query;

    if (!po) {
      throw new AppError('Purchase order not found', 404);
    }

    if (['draft', 'cancelled'].includes(po.status)) {
      throw new AppError(`Cannot receive items for ${po.status} PO`, 400);
    }

    let allReceived = true;

    // Process receipt for each item
    for (const receiptItem of items) {
      const poItem = po.items.find((pi) => pi._id.toString() === receiptItem.itemId);

      if (!poItem) {
        throw new AppError(`PO item ${receiptItem.itemId} not found`, 404);
      }

      const remainingQty = poItem.quantity - (poItem.receivedQuantity || 0);
      const receiveQty = Math.min(receiptItem.quantity, remainingQty);
      const actualPrice = receiptItem.actualPrice || poItem.unitPrice;

      if (receiveQty <= 0) {
        throw new AppError(`Item ${receiptItem.itemId} already received`, 400);
      }

      // Update variant stock using atomic operation
      const variantUpdate = await Variant.findByIdAndUpdate(
        poItem.variantId,
        { $inc: { currentStock: receiveQty } },
        { new: true }
      );

      if (!variantUpdate) {
        throw new AppError(`Variant ${poItem.variantId} not found`, 404);
      }

      // Record stock movement
      const movementData = {
        tenantId: req.tenantId,
        variantId: poItem.variantId,
        quantity: receiveQty,
        movementType: 'purchase',
        referenceType: 'purchase_order',
        referenceId: po._id,
        notes: `Received from PO ${po.poNumber}`,
        createdBy: req.user.userId,
      };

      if (session) {
        await StockMovement.create([movementData], { session });
      } else {
        await StockMovement.create(movementData);
      }

      // Update PO item
      poItem.receivedQuantity = (poItem.receivedQuantity || 0) + receiveQty;
      poItem.unitPrice = actualPrice; // Allow price variance

      if (poItem.receivedQuantity === poItem.quantity) {
        poItem.lineStatus = 'received';
      } else if (poItem.receivedQuantity > 0) {
        poItem.lineStatus = 'partial';
        allReceived = false;
      } else {
        allReceived = false;
      }
    }

    // Update PO status
    po.status = allReceived ? 'received' : 'partially_received';
    if (!allReceived) {
      po.status = 'partially_received';
    }
    po.actualDeliveryDate = new Date();

    if (session) {
      await po.save({ session });
    } else {
      await po.save();
    }

    return po;
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});
