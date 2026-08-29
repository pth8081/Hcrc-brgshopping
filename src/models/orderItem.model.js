const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Snapshots productName/price at time of purchase so later edits to the
// Product row never change the historical record of what was ordered.
const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  productId: { type: DataTypes.INTEGER, allowNull: true },
  productName: { type: DataTypes.STRING(255), allowNull: false },
  price: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  subtotal: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
}, {
  tableName: 'order_items',
});

module.exports = OrderItem;
