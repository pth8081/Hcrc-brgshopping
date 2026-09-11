const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const News = sequelize.define('News', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(230), allowNull: false, unique: true },
  summary: { type: DataTypes.STRING(500), allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  imageUrl: { type: DataTypes.STRING(500), allowNull: true },
  isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  publishedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  authorUserId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'news',
});

module.exports = News;
