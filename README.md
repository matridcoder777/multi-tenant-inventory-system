# Multi-Tenant Inventory Management System

A production-ready SaaS platform for managing inventory across multiple independent tenants with complete order management, supplier relationships, and real-time updates.

![MERN Stack](https://img.shields.io/badge/Stack-MERN-blue)
![Node.js](https://img.shields.io/badge/Node.js-v22.5-green)
![React](https://img.shields.io/badge/React-v18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-v7.5-green)

---

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Test Credentials](#test-credentials)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Development](#development)
- [Known Limitations](#known-limitations)
- [Assumptions](#assumptions)
- [Time Breakdown](#time-breakdown)

---

## Features

### ✅ Core Features Implemented

#### 1. **Multi-Tenancy System**
- Complete tenant isolation with row-level security
- Master admin portal for tenant management
- Create, update, and manage multiple tenants
- Tenant status management (active, inactive, suspended)
- Demo tenants: "Acme Electronics" and "TechStores Inc"

#### 2. **Authentication & Authorization**
- Dual authentication paths:
  - **Master Admin**: Email/password login (no tenant required)
  - **Tenant Users**: Email/password + tenant selection
- Role-based access control (RBAC):
  - **Admin**: Manages all tenants globally
  - **Owner**: Full access to tenant data, can manage users
  - **Manager**: Can manage inventory and orders
  - **Staff**: Read-only access to inventory, can view orders
- JWT token-based authentication (1-hour expiry)
- Password hashing with bcryptjs

#### 3. **Inventory Management**
- Product catalog with variants
- SKU tracking per variant
- Real-time stock level management
- Stock adjustment with audit trail
- Reorder level management
- Supplier relationship management for variants

#### 4. **Order Management**
- Complete order lifecycle (pending → fulfilled → cancelled)
- Partial fulfillment tracking (0-100% completion)
- Order item details with pricing snapshot
- Stock deduction on fulfillment
- Order history and status tracking
- Concurrency-safe order processing

#### 5. **Purchase Orders (Supplier Management)**
- Create purchase orders from suppliers
- Variant selection with supplier filtering
- PO status tracking
- Cost calculation per variant
- Supplier invoice management

#### 6. **User Management (Tenant Owner)**
- Create and manage tenant users
- Assign roles (owner, manager, staff)
- Activate/deactivate user accounts
- Prevent deletion of owner account
- User activity tracking

#### 7. **Analytics Dashboard**
- Weekly order summary by status
- Inventory health indicators
- Low stock alerts
- Quick statistics cards

#### 8. **Real-Time Updates**
- Socket.io integration for live updates
- Order status changes broadcast to connected clients
- Inventory updates in real-time
- User activity notifications

#### 9. **Admin Features**
- Master admin portal for tenant management
- Create new tenants with owner accounts
- View all tenants with metadata
- Update tenant status
- User management per tenant
- Tenant analytics and reporting

---

## Project Structure

```
Multi-Tenant Inventory Management System/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       # Login, registration, dual auth paths
│   │   │   ├── productController.js    # Product & variant CRUD
│   │   │   ├── orderController.js      # Order management & fulfillment
│   │   │   ├── inventoryController.js  # Stock adjustments
│   │   │   ├── supplierController.js   # Supplier management
│   │   │   ├── poController.js         # Purchase order management
│   │   │   └── adminController.js      # Master admin operations
│   │   ├── models/
│   │   │   ├── User.js                 # User with optional tenantId (null = admin)
│   │   │   ├── Tenant.js               # Tenant metadata
│   │   │   ├── Product.js              # Products with embedded variants
│   │   │   ├── Order.js                # Orders with denormalized items
│   │   │   ├── Supplier.js             # Supplier relationships
│   │   │   ├── PurchaseOrder.js        # Supplier purchase orders
│   │   │   └── StockMovement.js        # Audit trail for inventory
│   │   ├── middleware/
│   │   │   ├── auth.js                 # Authentication & JWT verification
│   │   │   ├── tenantInjector.js       # Multi-tenancy isolation
│   │   │   └── errorHandler.js         # Error handling
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── inventory.js
│   │   │   ├── suppliers.js
│   │   │   ├── admin.js
│   │   │   └── analytics.js
│   │   ├── utils/
│   │   │   ├── jwt.js                  # Token generation with null tenantId support
│   │   │   ├── AppError.js
│   │   │   └── catchAsync.js
│   │   ├── config/
│   │   │   └── env.js
│   │   └── socket/
│   │       └── socketHandler.js        # Real-time event emissions
│   ├── scripts/
│   │   ├── setupMasterAdmin.js         # Create initial admin user
│   │   └── fixDemoPasswords.js         # Reset demo credentials
│   ├── .env.example
│   └── server.js                       # Express + Socket.io setup
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.js            # Dual auth: admin + tenant
│   │   │   ├── Dashboard.js
│   │   │   ├── InventoryPage.js
│   │   │   ├── ProductDetailPage.js
│   │   │   ├── OrdersPage.js
│   │   │   ├── OrderDetailPage.js
│   │   │   ├── SuppliersPage.js
│   │   │   ├── PurchaseOrdersPage.js
│   │   │   ├── AdminPortalPage.js      # Master admin tenant management
│   │   │   └── UserManagementPage.js   # Tenant owner user management
│   │   ├── components/
│   │   │   ├── Navbar.js               # Context-aware menu (admin vs tenant)
│   │   │   ├── PrivateRoute.js
│   │   │   └── OrderDetailPage/
│   │   │       └── FulfillmentModal.js
│   │   ├── context/
│   │   │   └── AuthContext.js          # Global auth state with isAdmin flag
│   │   ├── services/
│   │   │   ├── api.js                  # Axios instance
│   │   │   └── socket.js               # Socket.io client setup
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── auth.css
│   │   │   ├── navbar.css
│   │   │   ├── adminPortal.css
│   │   │   ├── userManagement.css
│   │   │   └── ... (component-specific styles)
│   │   └── App.js                      # Routes with conditional admin/user paths
│   └── package.json
│
├── ARCHITECTURE.md                     # Detailed design decisions & rationale
├── README.md                           # This file
└── .gitignore
```

---

## Quick Start

### Prerequisites

- **Node.js** v18+ (tested on v22.5)
- **MongoDB** v7.0+ (local or Atlas connection)
- **npm** or **yarn**

### Installation

#### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd "Multi-Tenant Inventory Management System"

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI

# Frontend setup
cd ../frontend
npm install
```

#### 2. Configure Environment Variables

**Backend (.env):**
```env
MONGODB_URI=mongodb://localhost:27017/inventory_system
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRE=1h
NODE_ENV=development
```

**Frontend (no .env needed, uses http://localhost:5000 API)**

#### 3. Initialize Master Admin

```bash
cd backend
npm run setup-admin
# Creates: admin@system.local / admin123456
```

#### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

---

## Test Credentials

### Master Admin (Manages All Tenants)

| Email | Password |
|-------|----------|
| `admin@system.local` | `admin123456` |

**Login Flow:**
1. Check "Master Admin Login" checkbox
2. Enter credentials above
3. Redirects to `/admin` portal

### Acme Electronics Tenant

| Email | Password | Role |
|-------|----------|------|
| `alice@acme.com` | `password123` | Owner |
| `bob@acme.com` | `password123` | Manager |
| `charlie@acme.com` | `password123` | Staff |

### TechStores Inc Tenant

| Email | Password | Role |
|-------|----------|------|
| `diana@techstores.com` | `password123` | Owner |
| `eve@techstores.com` | `password123` | Manager |
| `frank@techstores.com` | `password123` | Staff |

**Login Flow:**
1. Select tenant from dropdown
2. Enter credentials for that tenant
3. Demo credentials update automatically when tenant changes

---

## API Documentation

### Authentication Endpoints

**POST /api/auth/login**
```json
{
  "email": "alice@acme.com",
  "password": "password123",
  "tenantSlug": "acme-electronics"  // omit or use "admin" for master admin
}

Response:
{
  "success": true,
  "data": {
    "user": { "id", "email", "role", "tenantId" },
    "token": "jwt_token",
    "isAdmin": false  // true if master admin
  }
}
```

### Tenant Management (Admin Only)

**GET /api/admin/tenants** - List all tenants
```json
Response: { data: [{ _id, name, slug, status, createdAt }] }
```

**POST /api/admin/tenants** - Create new tenant
```json
{
  "name": "New Corp",
  "slug": "new-corp",
  "ownerName": "John Doe",
  "ownerEmail": "john@newcorp.com",
  "ownerPassword": "securepass123"
}
```

**PATCH /api/admin/tenants/:tenantId/status** - Update status
```json
{ "status": "active" }  // or "inactive", "suspended"
```

### Product Management

**GET /api/products?page=1&limit=20** - List products
**POST /api/products** - Create product
**PUT /api/products/:id** - Update product
**DELETE /api/products/:id** - Delete product

**POST /api/products/:id/variants** - Add variant
**PATCH /api/products/:id/variants/:variantId** - Update variant
**DELETE /api/products/:id/variants/:variantId** - Remove variant

### Order Management

**GET /api/orders?page=1&limit=20** - List orders
**POST /api/orders** - Create order (deducts stock)
**PATCH /api/orders/:id/status** - Update order status
**POST /api/orders/:id/fulfill** - Partial fulfillment with stock deduction

### Stock Adjustments

**POST /api/inventory/adjust** - Manual stock adjustment
```json
{
  "variantId": "ObjectId",
  "quantity": 10,
  "type": "IN"  // or "OUT" for stock correction
}
```

**GET /api/inventory/movements** - Stock movement audit trail

### User Management (Owner Only)

**GET /api/admin/users** - List tenant users
**POST /api/admin/users** - Create user (owner only)
**PATCH /api/admin/users/:userId** - Update user
**DELETE /api/admin/users/:userId** - Delete user (not owner)

---

## Architecture

Detailed architecture decisions, multi-tenancy approach, concurrency handling, and performance optimizations are documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

**Key Highlights:**
- **Multi-Tenancy**: Row-level isolation via tenantId field
- **Data Safety**: Pessimistic locking for concurrent inventory updates
- **Performance**: Indexed queries, pagination, aggregation pipelines
- **Scalability**: Sharding-ready design (by tenantId)
- **Real-time**: Socket.io for live order/inventory updates

---

## Development

### Running Tests

```bash
cd backend
npm test  # Run test suite (if implemented)
```

### Development Mode with Hot Reload

```bash
# Backend (with nodemon)
cd backend
npm run dev

# Frontend (with React dev server)
cd frontend
npm start
```

### Code Structure

- **Controllers**: Business logic, database queries
- **Models**: Mongoose schemas with validation
- **Middleware**: Authentication, tenancy, error handling
- **Services**: API calls, socket events
- **Utilities**: JWT generation, error handling

---

## Known Limitations

### 1. **MongoDB Standalone (No Distributed Transactions)**
- **Limitation**: Multi-document transactions only within single replica set
- **Impact**: Cross-tenant operations require careful coordination
- **Mitigation**: All operations filtered by tenantId, no cross-tenant atomicity needed
- **Upgrade Path**: MongoDB Replica Set for true distributed transactions

### 2. **JWT Token Revocation Delay**
- **Limitation**: Tokens valid until expiry (1 hour) even after logout
- **Impact**: Deleted user account can use old token for 1 hour
- **Mitigation**: Short expiry window, frontend clears localStorage on logout
- **Upgrade Path**: Redis blacklist for immediate token invalidation

### 3. **Single Server Deployment**
- **Limitation**: No horizontal scaling of Node.js backend
- **Impact**: Single point of failure, max ~1000 concurrent users per server
- **Mitigation**: Works fine for <100 tenants in SaaS context
- **Upgrade Path**: Load balancer + Node cluster module + sticky sessions

### 4. **Variant Price Denormalization**
- **Limitation**: Order items snapshot price at time of order
- **Impact**: Product price changes don't reflect in old orders
- **Justification**: Required for order accuracy and audit trail
- **Mitigation**: Expected behavior in most e-commerce systems

### 5. **Real-Time Updates Scope**
- **Limitation**: Socket.io broadcasts to connected clients only
- **Impact**: Offline users don't get notifications, must refresh on login
- **Upgrade Path**: Email/SMS notifications for offline users

### 6. **No Payment Integration**
- **Limitation**: Orders don't process payments, no payment gateway
- **Scope**: System treats all orders as pre-approved/cash
- **Upgrade Path**: Stripe/PayPal integration when needed

---

## Assumptions

### Data Assumptions

1. **Variant Suppliers Required**
   - Every variant MUST have a supplier
   - Enforced at model level with `required: true`
   - Enables purchase order tracking and supply chain management

2. **Unique Tenant Slugs**
   - Tenant slug must be globally unique (used in URLs)
   - Database unique index enforced
   - Format: lowercase, hyphens, 3-50 characters

3. **Order Items Immutable**
   - Once order created, items cannot be modified
   - Stock snapshot taken at order time
   - Prevents accidental order manipulation

4. **Stock Movements Track Inventory Changes**
   - All stock changes produce audit trail
   - Allows reconciliation and debugging
   - Immutable for compliance

### Business Assumptions

1. **Single Tenant per User**
   - User belongs to exactly one tenant (or null for admin)
   - No cross-tenant user access
   - Simplifies permission model

2. **Order Fulfillment Linear**
   - Items fulfilled in quantity
   - No partial-item fulfillment (unit-level only)
   - Stock deducted = fulfillment applied

3. **Supplier is Stable**
   - Variant-supplier relationship rarely changes
   - History not tracked (assumes stable supply chain)
   - Can be extended with supplier change audit log if needed

4. **Real-time Updates Optional**
   - WebSocket loss doesn't break functionality
   - Falls back to HTTP polling if needed
   - Background tasks continue without real-time feedback

### Infrastructure Assumptions

1. **MongoDB Running Locally or Atlas**
   - Assumes valid MONGODB_URI in environment
   - No sharding or replication at startup
   - Can be upgraded to replica set later

2. **Ports 3000 & 5000 Available**
   - Frontend assumes 3000 free
   - Backend assumes 5000 free
   - Can be reconfigured via environment variables

3. **TLS/HTTPS for Production**
   - Current setup uses HTTP
   - Must be proxied through HTTPS in production
   - JWT tokens sent in Authorization header (safe with HTTPS)

---

## Time Breakdown

### Development Timeline

Total Development Time: **~40-50 hours**

### Phase 1: Foundation (8-10 hours)
- Project setup (npm, MongoDB, .env)
- Mongoose schema design
- Express server with middleware
- JWT authentication
- **Output**: Basic login working

### Phase 2: Inventory Management (8-10 hours)
- Product/Variant CRUD
- Stock level management
- Inventory dashboard
- Supplier relationships
- **Output**: Full inventory management working

### Phase 3: Order Management (8-10 hours)
- Order creation and status tracking
- Fulfillment with stock deduction
- Concurrency-safe transactions
- Order history
- **Output**: Orders with atomic stock updates

### Phase 4: Purchase Orders & UI (8-10 hours)
- Purchase order module
- Modern styling (gradient headers, animations)
- Dashboard analytics
- Real-time Socket.io integration
- **Output**: Full feature-rich UI

### Phase 5: Multi-Tenancy & Admin (6-8 hours)
- Master admin portal
- Tenant management CRUD
- User management per tenant
- Role-based access control
- **Output**: Complete multi-tenant admin

### Phase 6: Polish & Documentation (2-4 hours)
- Bug fixes
- ARCHITECTURE.md
- README.md
- Demo credentials setup
- **Output**: Production-ready with docs

### Breakdown by Task Type

| Task | Hours | Percent |
|------|-------|---------|
| Backend Development | 20 | 43% |
| Frontend Development | 15 | 32% |
| Database Design | 5 | 11% |
| Testing & Debugging | 4 | 9% |
| Documentation | 2 | 5% |
| **Total** | **46** | **100%** |

### Breakdown by Complexity

| Complexity | Task | Hours |
|-----------|------|-------|
| **High** | Pessimistic locking, stock movements, multi-tenancy isolation | 12 |
| **Medium** | CRUD operations, fulfillment logic, Socket.io integration | 20 |
| **Low** | UI components, styling, documentation | 14 |

### Key Time Investments

1. **Multi-Tenancy Design** (4h)
   - Planning row-level isolation
   - Implementing tenantInjector middleware
   - Testing data separation

2. **Order Fulfillment** (6h)
   - Pessimistic locking implementation
   - Stock deduction logic
   - Partial fulfillment tracking

3. **User Management** (5h)
   - Tenant user CRUD
   - Role-based permissions
   - Owner-specific restrictions

4. **Admin Portal** (5h)
   - Tenant creation/management
   - User management UI
   - Styling and animations

5. **Real-Time Updates** (4h)
   - Socket.io setup
   - Event broadcasting
   - Client-side listeners

6. **Bug Fixes & Polish** (6h)
   - Login page improvements
   - Demo credentials for multiple tenants
   - Error handling refinement

---

## Contributing

This is a demonstration project. For improvements or feedback:

1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions
2. Check [Known Limitations](#known-limitations) before proposing changes
3. Test across both demo tenants
4. Maintain role-based access control security

---

## License

Proprietary - This is a demonstration/training project.

---

## Support

For issues or questions:
1. Check README.md [Quick Start](#quick-start) section
2. Review ARCHITECTURE.md for design decisions
3. Check Known Limitations section
4. Verify test credentials are correct for selected tenant

---

**Last Updated:** January 29, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready
