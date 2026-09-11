const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductView = sequelize.define('ProductView', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: false },
  categoryId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'product_views',
  updatedAt: false,
});

module.exports = ProductView;
