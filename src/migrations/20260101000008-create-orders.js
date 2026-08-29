module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      addressId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'addresses', key: 'id' },
      },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
      paymentMethod: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'cod' },
      paymentStatus: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'unpaid' },
      totalAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      note: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
  },
};
