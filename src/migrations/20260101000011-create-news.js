module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('news', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      slug: { type: Sequelize.STRING(230), allowNull: false, unique: true },
      summary: { type: Sequelize.STRING(500), allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: false },
      imageUrl: { type: Sequelize.STRING(500), allowNull: true },
      isPublished: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      publishedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      authorUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('news');
  },
};
