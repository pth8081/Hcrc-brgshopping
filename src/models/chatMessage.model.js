const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversationId: { type: DataTypes.INTEGER, allowNull: false },
  senderType: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [['customer', 'admin']] } },
  body: { type: DataTypes.STRING(2000), allowNull: false },
}, {
  tableName: 'chat_messages',
  updatedAt: false,
});

module.exports = ChatMessage;
