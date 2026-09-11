const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SearchLog = sequelize.define('SearchLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  keyword: { type: DataTypes.STRING(200), allowNull: false },
  resultCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'search_logs',
  updatedAt: false,
});

module.exports = SearchLog;
