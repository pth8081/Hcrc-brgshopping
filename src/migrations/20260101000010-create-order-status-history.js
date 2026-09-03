module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('order_status_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: { type: Sequelize.STRING(20), allowNull: true },
      paymentStatus: { type: Sequelize.STRING(20), allowNull: true },
      note: { type: Sequelize.STRING(500), allowNull: true },
      changedByUserId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('order_status_history');
  },
};
