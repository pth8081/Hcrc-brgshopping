const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fullName: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  // Null for a social-only account (Google/Facebook) that never set a password.
  passwordHash: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'customer', validate: { isIn: [['customer', 'admin']] } },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  googleId: { type: DataTypes.STRING(50), allowNull: true },
  facebookId: { type: DataTypes.STRING(50), allowNull: true },
  avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
}, {
  tableName: 'users',
});

module.exports = User;
