import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const initializeSocket = (token) => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Event listeners
export const onStockUpdate = (callback) => {
  if (socket) socket.on('stock:update', callback);
};

export const onOrderCreated = (callback) => {
  if (socket) socket.on('order:created', callback);
};

export const onOrderStatusChanged = (callback) => {
  if (socket) socket.on('order:status-changed', callback);
};

export const onLowStockAlert = (callback) => {
  if (socket) socket.on('alert:low-stock', callback);
};

export const onPOUpdated = (callback) => {
  if (socket) socket.on('po:updated', callback);
};

export default socket;
