const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// A fixed default password here would mean every deployment of this project
// starts with the same publicly-known admin credentials. Instead: use
// ADMIN_EMAIL/ADMIN_PASSWORD from .env when set (convenient for local/demo
// use, see .env.example), otherwise generate a random password and print it
// once — the operator must capture it from this output, since it is never
// stored anywhere in plaintext.
module.exports = {
  up: async (queryInterface) => {
    const email = process.env.ADMIN_EMAIL || 'admin@brgshopping.local';
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);

    await queryInterface.bulkInsert('users', [{
      fullName: 'Administrator',
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    if (!process.env.ADMIN_PASSWORD) {
      console.log('\n===========================================================');
      console.log(' Admin account created — SAVE THIS PASSWORD, it is shown once:');
      console.log(` Email:    ${email}`);
      console.log(` Password: ${password}`);
      console.log('===========================================================\n');
    }
  },
  down: async (queryInterface) => {
    const email = process.env.ADMIN_EMAIL || 'admin@brgshopping.local';
    await queryInterface.bulkDelete('users', { email });
  },
};
