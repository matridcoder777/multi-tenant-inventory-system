const mongoose = require('mongoose');
const Order = require('../models/Order');
const Variant = require('../models/Variant');
const StockMovement = require('../models/StockMovement');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { executeWithTransaction } = require('../utils/transactionHelper');

// Generate unique order number
const generateOrderNumber = async (tenantId) => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const count = await Order.countDocuments({ tenantId });
  return `ORD-${dateStr}-${String(count + 1).padStart(5, '0')}`;
};

// Create order (with stock validation)
exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, customerInfo, notes, discount = 0, tax = 0 } = req.body;

  if (!items || items.length === 0) {
    return next(new AppError('Order must contain at least one item', 400));
  }

  const result = await executeWithTransaction(async (session) => {
    let totalAmount = 0;
    const processedItems = [];

    // Validate and lock stock for each variant
    for (const item of items) {
      const query = Variant.findById(item.variantId);
      const variant = session ? await query.session(session) : await query;

      if (!variant) {
        throw new AppError(`Variant ${item.variantId} not found`, 404);
      }

      // Check stock availability
      if (variant.currentStock < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${variant.sku}. Available: ${variant.currentStock}, Requested: ${item.quantity}`,
          400
        );
      }

      // Atomically decrement stock with conditional update to prevent race conditions
      const updateOptions = { new: true };
      if (session) updateOptions.session = session;
      
      const updateResult = await Variant.findOneAndUpdate(
        { 
          _id: variant._id,
          currentStock: { $gte: item.quantity } // Ensure stock is still available
        },
        { $inc: { currentStock: -item.quantity } },
        updateOptions
      );

      if (!updateResult) {
        throw new AppError(
          `Concurrent order detected. Insufficient stock for ${variant.sku}. Please try again.`,
          409
        );
      }

      const subtotal = item.quantity * variant.price;
      totalAmount += subtotal;

      processedItems.push({
        variantId: variant._id,
        sku: variant.sku,
        quantity: item.quantity,
        price: variant.price,
        subtotal,
      });

      // Record stock movement
      const movementData = {
        tenantId: req.tenantId,
        variantId: variant._id,
        quantity: -item.quantity,
        movementType: 'sale',
        referenceType: 'order',
        notes: `Order created`,
        createdBy: req.user.userId,
      };
      
      if (session) {
        await StockMovement.create([movementData], { session });
      } else {
        await StockMovement.create(movementData);
      }
    }

    // Calculate final amount
    const finalAmount = totalAmount - discount + tax;

    // Create order
    const orderNumber = await generateOrderNumber(req.tenantId);
    const orderData = {
      tenantId: req.tenantId,
      orderNumber,
      status: 'pending',
      items: processedItems,
      totalAmount,
      discount,
      tax,
      finalAmount,
      customerInfo,
      notes,
      createdBy: req.user.userId,
    };
    
    let order;
    if (session) {
      order = await Order.create([orderData], { session });
      return order[0];
    } else {
      order = await Order.create(orderData);
      return order;
    }
  });

  // Emit real-time event for new order
  if (req.io) {
    req.io.to(`tenant-${req.tenantId}`).emit('orderCreated', {
      orderId: result._id,
      orderNumber: result.orderNumber,
      status: result.status,
      totalAmount: result.finalAmount,
    });
  }

  res.status(201).json({
    success: true,
    data: result,
    message: 'Order created successfully',
  });
});

// Get orders
exports.getOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { tenantId: req.tenantId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate('items.variantId');

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// Get single order
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    tenantId: req.tenantId,
  }).populate('items.variantId');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// Cancel order with rollback
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  const result = await executeWithTransaction(async (session) => {
    const query = Order.findOne({
      _id: orderId,
      tenantId: req.tenantId,
    });
    const order = session ? await query.session(session) : await query;

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'cancelled') {
      throw new AppError('Order already cancelled', 400);
    }

    if (order.status === 'fulfilled') {
      throw new AppError('Cannot cancel fulfilled order', 400);
    }

    // Rollback stock for each item (only unfulfilled quantities)
    for (const item of order.items) {
      const unfulfilledQty = item.quantity - (item.fulfilledQuantity || 0);

      if (unfulfilledQty > 0) {
        // Restore stock atomically
        const updateOptions = session ? { session } : {};
        await Variant.findByIdAndUpdate(
          item.variantId,
          { $inc: { currentStock: unfulfilledQty } },
          updateOptions
        );

        // Record stock movement for rollback
        const movementData = {
          tenantId: req.tenantId,
          variantId: item.variantId,
          quantity: unfulfilledQty,
          movementType: 'adjustment',
          referenceType: 'order',
          referenceId: order._id,
          notes: `Order ${order.orderNumber} cancelled - Restored ${unfulfilledQty} units. Reason: ${reason || 'No reason provided'}`,
          createdBy: req.user.userId,
        };
        
        if (session) {
          await StockMovement.create([movementData], { session });
        } else {
          await StockMovement.create(movementData);
        }
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.userId;
    order.cancelReason = reason || 'No reason provided';
    const saveOptions = session ? { session } : {};
    await order.save(saveOptions);

    // Emit real-time event
    if (req.io) {
      req.io.to(`tenant-${req.tenantId}`).emit('orderCancelled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: order.cancelReason,
      });
    }

    return order;
  });

  res.status(200).json({
    success: true,
    data: result,
    message: 'Order cancelled and stock restored successfully',
  });
});

// Partial fulfillment
exports.fulfillOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { items } = req.body;

  if (!items || items.length === 0) {
    return next(new AppError('Fulfillment items are required', 400));
  }

  const result = await executeWithTransaction(async (session) => {
    const query = Order.findOne({
      _id: orderId,
      tenantId: req.tenantId,
    });
    const order = session ? await query.session(session) : await query;

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'fulfilled') {
      throw new AppError('Order already fulfilled', 400);
    }

    if (order.status === 'cancelled') {
      throw new AppError('Cannot fulfill cancelled order', 400);
    }

    // Update order status to processing if it's pending
    if (order.status === 'pending') {
      order.status = 'processing';
    }

    let allFulfilled = true;

    // Process fulfillment for each item
    for (const fulfillItem of items) {
      const orderItem = order.items.find((oi) => oi._id.toString() === fulfillItem.itemId);

      if (!orderItem) {
        throw new AppError(`Order item ${fulfillItem.itemId} not found`, 404);
      }

      const remainingQty = orderItem.quantity - (orderItem.fulfilledQuantity || 0);
      
      if (remainingQty <= 0) {
        throw new AppError(`Item ${orderItem.sku} already fully fulfilled`, 400);
      }

      const fulfillQty = Math.min(fulfillItem.quantity, remainingQty);

      if (fulfillQty <= 0) {
        continue;
      }

      // Update fulfilled quantity
      orderItem.fulfilledQuantity = (orderItem.fulfilledQuantity || 0) + fulfillQty;

      // Record stock movement for fulfillment
      const movementData = {
        tenantId: req.tenantId,
        variantId: orderItem.variantId,
        quantity: -fulfillQty,
        movementType: 'fulfillment',
        referenceType: 'order',
        referenceId: order._id,
        notes: `Order ${order.orderNumber} - Fulfilled ${fulfillQty} of ${orderItem.quantity} units`,
        createdBy: req.user.userId,
      };
      
      if (session) {
        await StockMovement.create([movementData], { session });
      } else {
        await StockMovement.create(movementData);
      }

      // Check if this item is fully fulfilled
      if (orderItem.fulfilledQuantity < orderItem.quantity) {
        allFulfilled = false;
      }
    }

    // Update order status based on fulfillment
    order.status = allFulfilled ? 'fulfilled' : 'partially_fulfilled';
    
    if (allFulfilled) {
      order.fulfilledAt = new Date();
    }

    const saveOptions = session ? { session } : {};
    await order.save(saveOptions);

    // Emit real-time event
    if (req.io) {
      req.io.to(`tenant-${req.tenantId}`).emit('orderUpdated', {
        orderId: order._id,
        status: order.status,
        orderNumber: order.orderNumber,
      });
    }

    return order;
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});
