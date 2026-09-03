const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per status or payment-status change on an order, so both the
// customer and admin can see a timeline instead of just the current state.
const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: true },
  paymentStatus: { type: DataTypes.STRING(20), allowNull: true },
  note: { type: DataTypes.STRING(500), allowNull: true },
  changedByUserId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'order_status_history',
});

module.exports = OrderStatusHistory;
