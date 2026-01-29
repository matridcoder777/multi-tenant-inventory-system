const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const User = require('../src/models/User');
const Tenant = require('../src/models/Tenant');

async function fixPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Hash the demo password
    const hashedPassword = await bcryptjs.hash('password123', 10);

    // Get both tenants
    const acmeTenant = await Tenant.findOne({ slug: 'acme-electronics' });
    const techTenant = await Tenant.findOne({ slug: 'techstores-inc' });

    // Update Acme Electronics users
    if (acmeTenant) {
      await User.updateMany(
        { tenantId: acmeTenant._id },
        { password: hashedPassword }
      );
      console.log('✓ Updated Acme Electronics users');
    }

    // Update TechStores Inc users
    if (techTenant) {
      await User.updateMany(
        { tenantId: techTenant._id },
        { password: hashedPassword }
      );
      console.log('✓ Updated TechStores Inc users');
    }

    // Verify
    const acmeUsers = await User.find({ tenantId: acmeTenant._id });
    const techUsers = await User.find({ tenantId: techTenant._id });

    console.log('\n=== Acme Electronics Users ===');
    acmeUsers.forEach(u => console.log(`  ${u.email} (${u.role})`));

    console.log('\n=== TechStores Inc Users ===');
    techUsers.forEach(u => console.log(`  ${u.email} (${u.role})`));

    console.log('\n✓ All demo users now have password: password123');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixPasswords();
