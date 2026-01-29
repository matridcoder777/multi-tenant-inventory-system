# Setup Guide - Multi-Tenant Inventory Management System

## Step-by-Step Installation

### Prerequisites
- Node.js 14.0 or higher
- MongoDB 4.0+ (with transaction support)
- npm or yarn package manager
- Git

### 1. Install MongoDB (if not already installed)

**On macOS (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

**On Linux (Ubuntu):**
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**On Windows:**
- Download from https://www.mongodb.com/try/download/community
- Run installer and follow setup wizard
- MongoDB will start as a service

**Verify Installation:**
```bash
mongo --version
# Should show MongoDB version 4.0+
```

### 2. Clone Repository

```bash
cd path/to/desired/location
git clone <repository-url>
cd Multi-Tenant\ Inventory\ Management\ System
```

### 3. Install Dependencies

**Option A: Install all at once**
```bash
npm run install-all
```

**Option B: Install separately**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 4. Configure Environment Variables

**Backend Configuration:**
```bash
cd backend
cp ../.env.example .env
```

Edit `.env` file:
```env
# Server Config
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/inventory-system

# JWT
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRE=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

**Frontend Configuration:**
```bash
cd frontend
cp .env.example .env
```

Edit `.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 5. Seed Database

Populate database with demo data:
```bash
cd backend
npm run seed
```

**Output:**
```
✅ Database seeding completed!

Tenant 1: Acme Electronics
  Owner: alice@acme.com (password123)
  Manager: bob@acme.com (password123)
  Staff: charlie@acme.com (password123)

Tenant 2: TechStores Inc
  Owner: diana@techstores.com (password123)
  Manager: eve@techstores.com (password123)
  Staff: frank@techstores.com (password123)
```

### 6. Start Development Servers

**Option A: In separate terminals**

```bash
# Terminal 1: Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend (http://localhost:3000)
cd frontend
npm start
```

**Option B: Using npm (from root, if using npm 7+)**
```bash
npm run backend &
npm run frontend
```

### 7. Access Application

Open browser and navigate to:
```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

### 8. Login with Demo Account

1. **Select Tenant:** Acme Electronics
2. **Email:** alice@acme.com
3. **Password:** password123
4. Click **Login**

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Ensure MongoDB is running
mongosh  # Should open MongoDB shell

# If not running:
# macOS: brew services start mongodb-community@6.0
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB
```

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```

**Solution:** Change port in backend/.env
```env
PORT=5001  # Use different port
```

### Module Not Found

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Seed Script Error

**Solution:**
```bash
# Ensure MongoDB is running
# Clear existing data and re-seed
cd backend
npm run seed
```

### CORS Error in Frontend

**Solution:** Verify backend URL in frontend/.env
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Project Structure Overview

```
Multi-Tenant Inventory Management System/
├── backend/
│   ├── src/
│   │   ├── config/              # Database connection
│   │   ├── middleware/          # Auth, errors, tenants
│   │   ├── models/              # Data schemas
│   │   ├── controllers/         # Business logic
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Socket.io service
│   │   └── utils/               # JWT, transactions
│   ├── scripts/
│   │   └── seed.js              # Database seeding
│   ├── server.js                # Express app entry
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── context/             # Auth provider
│   │   ├── pages/               # Route components
│   │   ├── components/          # Reusable UI
│   │   ├── services/            # API & Socket clients
│   │   ├── styles/              # CSS files
│   │   ├── App.js               # Main component
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env.example
│
├── README.md                     # Project overview
├── ARCHITECTURE.md              # Technical architecture
├── .env.example                 # Global env template
└── package.json                 # Root scripts
```

## Development Workflow

### 1. Creating a New API Feature

**Step 1: Create Model** (`backend/src/models/NewModel.js`)
```javascript
const schema = new Schema({
  tenantId: { type: ObjectId, required: true, index: true },
  // ... other fields
});
module.exports = model('NewModel', schema);
```

**Step 2: Create Controller** (`backend/src/controllers/newController.js`)
```javascript
exports.createItem = catchAsync(async (req, res, next) => {
  const item = await NewModel.create({
    tenantId: req.tenantId,
    // ... data
  });
  res.status(201).json({ success: true, data: item });
});
```

**Step 3: Create Route** (`backend/src/routes/new.js`)
```javascript
const router = express.Router();
router.post('/', authMiddleware, roleGuard(['owner']), createItem);
module.exports = router;
```

**Step 4: Register Route** (`backend/server.js`)
```javascript
app.use('/api/new', newRoutes);
```

### 2. Database Queries

**Always include tenantId filter:**
```javascript
// ✅ CORRECT - Ensures data isolation
const items = await Model.find({ 
  tenantId: req.tenantId,
  status: 'active' 
});

// ❌ WRONG - Potential data leak
const items = await Model.find({ status: 'active' });
```

### 3. Using Transactions

**For multi-step operations:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Step 1
  await Model1.updateOne({}, {}, { session });
  // Step 2
  await Model2.create([...], { session });
  // Commit if all successful
  await session.commitTransaction();
} catch (error) {
  // Rollback on any error
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

### 4. Adding Frontend Component

**Create Page** (`frontend/src/pages/NewPage.js`)
```javascript
import { useEffect, useState } from 'react';
import { newService } from '../services/api';

const NewPage = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    newService.getItems().then(res => {
      setData(res.data.data);
    });
  }, []);
  
  return <div>{/* JSX */}</div>;
};

export default NewPage;
```

**Add Route** (`frontend/src/App.js`)
```javascript
<Route path="/new" element={<PrivateRoute><NewPage /></PrivateRoute>} />
```

## Production Deployment

### Environment Setup
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory
JWT_SECRET=<use strong random key>
FRONTEND_URL=https://yourdomain.com
```

### Build Frontend
```bash
cd frontend
npm run build
# Output: frontend/build/ directory
```

### Deploy Options

**Option 1: Heroku**
```bash
heroku login
heroku create your-app-name
git push heroku main
```

**Option 2: Digital Ocean**
```bash
# Deploy backend and frontend separately
# Use nginx as reverse proxy
# Configure MongoDB Atlas
```

**Option 3: AWS**
- Backend: EC2 or Elastic Beanstalk
- Frontend: S3 + CloudFront
- Database: MongoDB Atlas or AWS DocumentDB

## Testing

### Test Demo Flow

1. **Login** with alice@acme.com / password123
2. **Create Product** via Dashboard
3. **Add Variants** with unique SKUs
4. **Create Order** and watch stock change
5. **Check Analytics** dashboard
6. **Create PO** and receive items

### Performance Testing

**Check Dashboard Load Time:**
```bash
# With 10k+ products, should load in <2 seconds
Open browser DevTools → Network tab → Check waterfall
```

## Common Commands

### Backend
```bash
# Development
npm run dev

# Production
npm start

# Seed database
npm run seed
```

### Frontend
```bash
# Development
npm start

# Build
npm run build

# Production serve (requires serve package)
npm install -g serve
serve -s build
```

## Additional Resources

- **Architecture Documentation:** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Documentation:** See [README.md](./README.md#-api-endpoints)
- **MongoDB Docs:** https://docs.mongodb.com/
- **React Docs:** https://react.dev/
- **Express Docs:** https://expressjs.com/

## Support & Contributing

1. Check existing issues
2. Test with provided demo data
3. Document changes in code comments
4. Follow existing code patterns

---

**Everything set up?** Head to http://localhost:3000 and start managing inventory!
