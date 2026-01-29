require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');
const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Variant = require('../src/models/Variant');
const Supplier = require('../src/models/Supplier');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Product.deleteMany({}),
      Variant.deleteMany({}),
      Supplier.deleteMany({}),
    ]);

    console.log('Cleared existing data');

    // Create tenants
    const tenants = await Tenant.create([
      {
        name: 'Acme Electronics',
        slug: 'acme-electronics',
        plan: 'pro',
        settings: {
          lowStockThreshold: 10,
          currency: 'USD',
        },
      },
      {
        name: 'TechStores Inc',
        slug: 'techstores-inc',
        plan: 'starter',
        settings: {
          lowStockThreshold: 5,
          currency: 'USD',
        },
      },
    ]);

    console.log('Created tenants:', tenants.map((t) => t.name));

    // Create users for each tenant
    const users = await User.create([
      // Acme Electronics users
      {
        tenantId: tenants[0]._id,
        name: 'Alice Johnson',
        email: 'alice@acme.com',
        password: 'password123',
        role: 'owner',
      },
      {
        tenantId: tenants[0]._id,
        name: 'Bob Smith',
        email: 'bob@acme.com',
        password: 'password123',
        role: 'manager',
      },
      {
        tenantId: tenants[0]._id,
        name: 'Charlie Brown',
        email: 'charlie@acme.com',
        password: 'password123',
        role: 'staff',
      },
      // TechStores users
      {
        tenantId: tenants[1]._id,
        name: 'Diana Prince',
        email: 'diana@techstores.com',
        password: 'password123',
        role: 'owner',
      },
      {
        tenantId: tenants[1]._id,
        name: 'Eve Wilson',
        email: 'eve@techstores.com',
        password: 'password123',
        role: 'manager',
      },
      {
        tenantId: tenants[1]._id,
        name: 'Frank Miller',
        email: 'frank@techstores.com',
        password: 'password123',
        role: 'staff',
      },
    ]);

    console.log('Created users');

    // Create products for each tenant
    const acmeProducts = await Product.create([
      {
        tenantId: tenants[0]._id,
        name: 'Laptop Pro 15',
        description: 'High-performance laptop',
        category: 'Electronics',
        brand: 'TechBrand',
      },
      {
        tenantId: tenants[0]._id,
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        category: 'Accessories',
        brand: 'PeripheralMax',
      },
      {
        tenantId: tenants[0]._id,
        name: 'USB-C Cable',
        description: '2m USB-C charging cable',
        category: 'Cables',
        brand: 'CableGood',
      },
    ]);

    const techstoresProducts = await Product.create([
      {
        tenantId: tenants[1]._id,
        name: 'Desktop Monitor 27"',
        description: '4K curved monitor',
        category: 'Electronics',
        brand: 'DisplayTech',
      },
      {
        tenantId: tenants[1]._id,
        name: 'Mechanical Keyboard',
        description: 'Gaming mechanical keyboard',
        category: 'Accessories',
        brand: 'KeyMaster',
      },
    ]);

    console.log('Created products');

    // Create variants for Acme Electronics
    await Variant.create([
      {
        productId: acmeProducts[0]._id,
        sku: 'LAPTOP-PRO-15-SIL',
        name: 'Laptop Pro 15 Silver',
        attributes: { color: 'Silver', RAM: '16GB', storage: '512GB' },
        currentStock: 15,
        reorderLevel: 5,
        price: 1999.99,
        cost: 1200,
      },
      {
        productId: acmeProducts[0]._id,
        sku: 'LAPTOP-PRO-15-GRAY',
        name: 'Laptop Pro 15 Gray',
        attributes: { color: 'Gray', RAM: '16GB', storage: '512GB' },
        currentStock: 3,
        reorderLevel: 5,
        price: 1999.99,
        cost: 1200,
      },
      {
        productId: acmeProducts[1]._id,
        sku: 'MOUSE-WIRELESS-BLK',
        name: 'Wireless Mouse Black',
        attributes: { color: 'Black', connectivity: 'Wireless' },
        currentStock: 45,
        reorderLevel: 10,
        price: 29.99,
        cost: 12,
      },
      {
        productId: acmeProducts[2]._id,
        sku: 'CABLE-USB-C-2M',
        name: 'USB-C Cable 2m',
        attributes: { length: '2m', color: 'White' },
        currentStock: 2,
        reorderLevel: 10,
        price: 12.99,
        cost: 3,
      },
    ]);

    // Create variants for TechStores
    await Variant.create([
      {
        productId: techstoresProducts[0]._id,
        sku: 'MONITOR-27-4K',
        name: '27" 4K Monitor',
        attributes: { size: '27"', resolution: '4K' },
        currentStock: 8,
        reorderLevel: 5,
        price: 599.99,
        cost: 350,
      },
      {
        productId: techstoresProducts[1]._id,
        sku: 'KEYBOARD-MECH-RGB',
        name: 'Mechanical Keyboard RGB',
        attributes: { switchType: 'Cherry MX', lighting: 'RGB' },
        currentStock: 20,
        reorderLevel: 8,
        price: 149.99,
        cost: 80,
      },
    ]);

    console.log('Created variants');

    // Create suppliers
    await Supplier.create([
      {
        tenantId: tenants[0]._id,
        name: 'Global Tech Supplies',
        email: 'supplier@globaltech.com',
        phone: '+1-555-0100',
        address: {
          street: '123 Supply Ave',
          city: 'Austin',
          state: 'TX',
          country: 'USA',
        },
        paymentTerms: 'Net 30',
      },
      {
        tenantId: tenants[1]._id,
        name: 'Eastern Electronics Co',
        email: 'sales@easternelec.com',
        phone: '+1-555-0200',
        address: {
          street: '456 Manufacturing Blvd',
          city: 'Shanghai',
          state: 'Shanghai',
          country: 'China',
        },
        paymentTerms: 'Net 45',
      },
    ]);

    console.log('Created suppliers');

    console.log('\n✅ Database seeding completed!');
    console.log('\nTenant 1: Acme Electronics');
    console.log('  Owner: alice@acme.com (password123)');
    console.log('  Manager: bob@acme.com (password123)');
    console.log('  Staff: charlie@acme.com (password123)');
    console.log('\nTenant 2: TechStores Inc');
    console.log('  Owner: diana@techstores.com (password123)');
    console.log('  Manager: eve@techstores.com (password123)');
    console.log('  Staff: frank@techstores.com (password123)');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
