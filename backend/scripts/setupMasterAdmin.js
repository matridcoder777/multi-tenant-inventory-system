const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../src/models/User');

const setupMasterAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Create master admin user (special tenant user with admin role)
    // Master admin is a special user with tenantId pointing to a system admin tenant
    // For now, we'll use a special approach: create a user without tenantId requirement

    const masterAdminExists = await User.findOne({ email: 'admin@system.local' });
    if (masterAdminExists) {
      console.log('✓ Master admin already exists');
      console.log('Credentials:');
      console.log('  Email: admin@system.local');
      console.log('  Password: admin123456');
      process.exit(0);
    }

    // Create master admin without tenantId (special case)
    const masterAdmin = new User({
      name: 'System Admin',
      email: 'admin@system.local',
      password: 'admin123456',
      role: 'admin',
      status: 'active',
      tenantId: null, // No tenant for system admin
    });

    await masterAdmin.save();
    console.log('✓ Master admin created successfully!');
    console.log('\nMaster Admin Credentials:');
    console.log('  Email: admin@system.local');
    console.log('  Password: admin123456');
    console.log('\nIMPORTANT: Change this password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error setting up master admin:', error);
    process.exit(1);
  }
};

setupMasterAdmin();
