const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    await queryInterface.bulkInsert('users', [{
      fullName: 'Administrator',
      email: 'admin@brgshopping.local',
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', { email: 'admin@brgshopping.local' });
  },
};
