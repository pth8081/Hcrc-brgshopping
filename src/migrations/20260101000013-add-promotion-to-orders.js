module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'promotionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'promotions', key: 'id' },
    });
    await queryInterface.addColumn('orders', 'discountAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'discountAmount');
    await queryInterface.removeColumn('orders', 'promotionId');
  },
};
