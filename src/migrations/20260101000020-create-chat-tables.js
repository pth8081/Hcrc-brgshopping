module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_conversations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      // Random token the browser generates and keeps in localStorage, so an
      // anonymous visitor's chat survives a page reload without an account.
      guestToken: { type: Sequelize.STRING(64), allowNull: true },
      guestName: { type: Sequelize.STRING(150), allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'open' },
      lastMessageAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
    await queryInterface.addIndex('chat_conversations', ['userId']);
    await queryInterface.addIndex('chat_conversations', ['guestToken']);
    await queryInterface.addIndex('chat_conversations', ['status', 'lastMessageAt']);

    await queryInterface.createTable('chat_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'chat_conversations', key: 'id' },
        onDelete: 'CASCADE',
      },
      senderType: { type: Sequelize.STRING(10), allowNull: false },
      body: { type: Sequelize.STRING(2000), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('getdate') },
    });
    await queryInterface.addIndex('chat_messages', ['conversationId', 'id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('chat_messages');
    await queryInterface.dropTable('chat_conversations');
  },
};
