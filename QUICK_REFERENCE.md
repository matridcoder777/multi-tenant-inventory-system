# Quick Reference Guide

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm run install-all

# 2. Start MongoDB (in separate terminal)
mongosh

# 3. Seed database (from backend directory)
cd backend && npm run seed

# 4. Start backend (from backend directory)
npm run dev

# 5. Start frontend (from frontend directory, new terminal)
cd frontend && npm start

# 6. Open http://localhost:3000
# Login: alice@acme.com / password123
```

## 📋 API Quick Reference

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/products` | Create product |
| GET | `/api/products` | List products |
| POST | `/api/products/:id/variants` | Add variant/SKU |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders |
| POST | `/api/inventory/purchase-orders` | Create PO |
| GET | `/api/analytics/dashboard` | Dashboard metrics |

## 🔐 Demo Credentials

### Tenant 1: Acme Electronics
```
Owner   alice@acme.com     / password123
Manager bob@acme.com       / password123
Staff   charlie@acme.com   / password123
```

### Tenant 2: TechStores Inc
```
Owner   diana@techstores.com   / password123
Manager eve@techstores.com     / password123
Staff   frank@techstores.com   / password123
```

## 📁 File Locations

### Backend Key Files
- **Server:** `backend/server.js`
- **Database Config:** `backend/src/config/database.js`
- **Models:** `backend/src/models/`
- **API Routes:** `backend/src/routes/`
- **Controllers:** `backend/src/controllers/`
- **Auth:** `backend/src/middleware/auth.js`

### Frontend Key Files
- **Main App:** `frontend/src/App.js`
- **Auth Context:** `frontend/src/context/AuthContext.js`
- **API Client:** `frontend/src/services/api.js`
- **Pages:** `frontend/src/pages/`
- **Styles:** `frontend/src/styles/`

## 🔧 Development Snippets

### Add Query Parameter to API Call
```javascript
// frontend/src/services/api.js
export const exampleService = {
  getItems: (page = 1, status = null) =>
    apiClient.get('/path', { params: { page, status } }),
};
```

### Create New API Endpoint
```javascript
// backend/src/controllers/exampleController.js
exports.getItems = catchAsync(async (req, res, next) => {
  const items = await Model.find({ tenantId: req.tenantId });
  res.json({ success: true, data: items });
});

// backend/src/routes/example.js
router.get('/', authMiddleware, getItems);
```

### Use Transaction
```javascript
// backend/src/controllers/orderController.js
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Multiple operations
  await Variant.updateOne({...}, {...}, { session });
  await Order.create([{...}], { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
}
```

### Emit Socket Event
```javascript
// backend/src/controllers/orderController.js
import { emitOrderCreated } from '../services/socketService';

// In controller
const order = await Order.create(...);
emitOrderCreated(req.io, req.tenantId, order);
```

### Listen to Socket Event
```javascript
// frontend/src/pages/Dashboard.js
import { onOrderCreated } from '../services/socket';

useEffect(() => {
  onOrderCreated((data) => {
    console.log('New order:', data);
    toast.success(`Order ${data.orderNumber} created`);
  });
}, []);
```

## 🔍 Common Tasks

### Create New Product
```bash
# Via API
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","category":"Electronics","brand":"TechBrand"}'

# Via Frontend
Click "Inventory" → "Add Product" → Fill form
```

### Create Order
```javascript
// Frontend code
const createOrder = async () => {
  const response = await orderService.createOrder({
    items: [
      { variantId: '...', quantity: 5 }
    ],
    customerInfo: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  });
};
```

### Check Low Stock
```bash
curl -X GET http://localhost:5000/api/analytics/low-stock \
  -H "Authorization: Bearer <token>"
```

### View Dashboard
```bash
Navigate to http://localhost:3000/dashboard
Shows:
- Inventory value
- Order metrics
- Top products
- Stock movements
```

## 🐛 Debugging

### Check Backend Logs
```bash
# Terminal showing: npm run dev
# Look for error messages and HTTP requests
```

### Check Frontend Logs
```bash
# Browser DevTools → Console tab
# Look for API errors and Socket events
```

### Verify Database
```bash
mongosh
use inventory-system
db.products.find({ tenantId: ObjectId('...') })
```

### Check Running Services
```bash
# Backend running?
curl http://localhost:5000/health

# MongoDB running?
mongosh --eval "db.adminCommand('ping')"

# Frontend running?
curl http://localhost:3000
```

## 📊 Performance Checking

### Dashboard Load Time
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to Dashboard
4. Check total load time (should be <2 seconds)

### Database Query Performance
```bash
# MongoDB
db.products.find({...}).explain("executionStats")
# Check executionStages for index usage
```

## 🔐 Security Checklist

- ✅ JWT tokens in localStorage
- ✅ All queries include tenantId
- ✅ Role permissions enforced
- ✅ Passwords hashed with bcrypt
- ✅ CORS restricted to frontend
- ✅ Environment variables for secrets

## 📚 Documentation Links

| Doc | Path | Purpose |
|-----|------|---------|
| Setup | `./SETUP.md` | Installation guide |
| Architecture | `./ARCHITECTURE.md` | Technical design |
| README | `./README.md` | Feature overview |
| This | `./QUICK_REFERENCE.md` | Quick lookup |

## 💡 Pro Tips

1. **Use Postman** for API testing
   - Import request examples
   - Store Bearer tokens
   - Save request collections

2. **Browser DevTools** for debugging
   - Console: Check errors
   - Network: Monitor API calls
   - Application: View localStorage

3. **MongoDB Compass** for database
   - Visual database management
   - Query builder
   - Performance monitoring

4. **VS Code Extensions**
   - Prettier: Code formatting
   - ESLint: Error detection
   - REST Client: API testing

## 🆘 Stuck?

1. **Check logs:** Terminal output, browser console
2. **Verify setup:** MongoDB running, ports available
3. **Clear cache:** `rm -rf node_modules && npm install`
4. **Re-seed:** `npm run seed` in backend
5. **Review:** [SETUP.md](./SETUP.md) → Troubleshooting

## 🎯 Next Steps

- [ ] Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] Test with demo credentials
- [ ] Create test product and order
- [ ] Check analytics dashboard
- [ ] Explore database schema
- [ ] Read [README.md](./README.md) for details

---

**Happy coding! 🚀**
