const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChatConversation = sequelize.define('ChatConversation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  guestToken: { type: DataTypes.STRING(64), allowNull: true },
  guestName: { type: DataTypes.STRING(150), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open', validate: { isIn: [['open', 'closed']] } },
  lastMessageAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'chat_conversations',
});

module.exports = ChatConversation;
