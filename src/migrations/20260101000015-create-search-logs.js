module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('search_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      keyword: { type: Sequelize.STRING(200), allowNull: false },
      resultCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
    await queryInterface.addIndex('search_logs', ['keyword']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('search_logs');
  },
};
