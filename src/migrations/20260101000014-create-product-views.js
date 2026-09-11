module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_views', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
      },
      categoryId: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
    await queryInterface.addIndex('product_views', ['userId', 'createdAt']);
    await queryInterface.addIndex('product_views', ['productId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('product_views');
  },
};
