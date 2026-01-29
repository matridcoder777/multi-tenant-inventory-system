// Emit stock update event to tenant room
const emitStockUpdate = (io, tenantId, variantId, newStock, movement) => {
  io.to(`tenant-${tenantId}`).emit('stock:update', {
    variantId,
    newStock,
    movement,
    timestamp: new Date(),
  });
};

// Emit order creation event
const emitOrderCreated = (io, tenantId, order) => {
  io.to(`tenant-${tenantId}`).emit('order:created', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: order.items.length,
    timestamp: new Date(),
  });
};

// Emit order status change
const emitOrderStatusChanged = (io, tenantId, orderId, status) => {
  io.to(`tenant-${tenantId}`).emit('order:status-changed', {
    orderId,
    status,
    timestamp: new Date(),
  });
};

// Emit low-stock alert
const emitLowStockAlert = (io, tenantId, variant, currentStock, threshold) => {
  io.to(`tenant-${tenantId}`).emit('alert:low-stock', {
    variantId: variant._id,
    sku: variant.sku,
    name: variant.name,
    currentStock,
    threshold,
    severity: currentStock === 0 ? 'critical' : 'warning',
    timestamp: new Date(),
  });
};

// Emit purchase order update
const emitPOUpdated = (io, tenantId, po) => {
  io.to(`tenant-${tenantId}`).emit('po:updated', {
    poId: po._id,
    poNumber: po.poNumber,
    status: po.status,
    timestamp: new Date(),
  });
};

module.exports = {
  emitStockUpdate,
  emitOrderCreated,
  emitOrderStatusChanged,
  emitLowStockAlert,
  emitPOUpdated,
};
