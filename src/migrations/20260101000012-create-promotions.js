module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('promotions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.STRING(500), allowNull: true },
      imageUrl: { type: Sequelize.STRING(500), allowNull: true },
      code: { type: Sequelize.STRING(30), allowNull: true, unique: true },
      discountType: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'percent' },
      discountValue: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      minOrderAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      maxDiscountAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      startDate: { type: Sequelize.DATE, allowNull: false },
      endDate: { type: Sequelize.DATE, allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('promotions');
  },
};
