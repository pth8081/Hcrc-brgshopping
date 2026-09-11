const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DISCOUNT_TYPES = ['percent', 'fixed'];

const Promotion = sequelize.define('Promotion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: true },
  imageUrl: { type: DataTypes.STRING(500), allowNull: true },
  code: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  discountType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'percent', validate: { isIn: [DISCOUNT_TYPES] } },
  discountValue: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  minOrderAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  maxDiscountAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'promotions',
});

Promotion.DISCOUNT_TYPES = DISCOUNT_TYPES;

module.exports = Promotion;
