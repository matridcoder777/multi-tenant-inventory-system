require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/database');
const config = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');
const { authMiddleware } = require('./src/middleware/auth');
const tenantInjector = require('./src/middleware/tenantInjector');
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const purchaseOrderRoutes = require('./src/routes/purchaseOrders');
const analyticsRoutes = require('./src/routes/analytics');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const { verifyToken } = require('./src/utils/jwt');
    const decoded = verifyToken(token);
    socket.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };
    socket.join(`tenant-${decoded.tenantId}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`User ${socket.user.userId} connected to tenant ${socket.user.tenantId}`);

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.userId} disconnected`);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes (auth routes don't need authentication)
app.use('/api/auth', authRoutes);

// Apply authentication and tenant injector globally for all protected routes
app.use(authMiddleware);
app.use(tenantInjector);

// Protected routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', purchaseOrderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', require('./src/routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  console.log(`Socket.io ready for connections`);
});

module.exports = { app, io };
