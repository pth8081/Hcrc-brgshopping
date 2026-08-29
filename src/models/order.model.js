const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];
const PAYMENT_METHODS = ['cod', 'bank_transfer', 'e_wallet'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'];

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  addressId: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', validate: { isIn: [ORDER_STATUSES] } },
  paymentMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'cod', validate: { isIn: [PAYMENT_METHODS] } },
  paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'unpaid', validate: { isIn: [PAYMENT_STATUSES] } },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  note: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'orders',
});

Order.STATUSES = ORDER_STATUSES;
Order.PAYMENT_METHODS = PAYMENT_METHODS;
Order.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = Order;
