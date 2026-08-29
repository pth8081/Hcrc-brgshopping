const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  categoryId: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(280), allowNull: false, unique: true },
  sku: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  price: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  salePrice: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  thumbnailUrl: { type: DataTypes.STRING(500), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'products',
});

module.exports = Product;
