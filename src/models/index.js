const sequelize = require('../config/db');

const User = require('./user.model');
const Address = require('./address.model');
const Category = require('./category.model');
const Product = require('./product.model');
const ProductImage = require('./productImage.model');
const Cart = require('./cart.model');
const CartItem = require('./cartItem.model');
const Order = require('./order.model');
const OrderItem = require('./orderItem.model');
const OrderStatusHistory = require('./orderStatusHistory.model');

// --- Associations ---
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId' });

Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

User.hasOne(Cart, { foreignKey: 'userId', as: 'cart', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(Address, { foreignKey: 'addressId', as: 'address' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId', as: 'history', onDelete: 'CASCADE' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  Address,
  Category,
  Product,
  ProductImage,
  Cart,
  CartItem,
  Order,
  OrderItem,
  OrderStatusHistory,
};
