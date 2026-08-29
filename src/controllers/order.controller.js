const { sequelize, Order, OrderItem, Cart, CartItem, Product } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateCart } = require('./cart.controller');

const checkout = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod = 'cod', note } = req.body;

  const cart = await getOrCreateCart(req.user.id);
  const cartItems = await CartItem.findAll({ where: { cartId: cart.id }, include: [{ model: Product, as: 'product' }] });
  if (cartItems.length === 0) throw new ApiError(400, 'Cart is empty');

  const order = await sequelize.transaction(async (t) => {
    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

    const newOrder = await Order.create({
      userId: req.user.id,
      addressId: addressId || null,
      paymentMethod,
      note,
      totalAmount,
    }, { transaction: t });

    for (const item of cartItems) {
      await OrderItem.create({
        orderId: newOrder.id,
        productId: item.productId,
        productName: item.product.name,
        price: item.priceAtAdd,
        quantity: item.quantity,
        subtotal: Number(item.priceAtAdd) * item.quantity,
      }, { transaction: t });

      await Product.decrement('stockQuantity', { by: item.quantity, where: { id: item.productId }, transaction: t });
    }

    await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

    return newOrder;
  });

  res.status(201).json({ success: true, data: order });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id },
    include: [{ model: OrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: orders });
});

const getById = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this order');
  }
  res.json({ success: true, data: order });
});

const listAll = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: orders });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Order.STATUSES.includes(status)) throw new ApiError(400, `status must be one of: ${Order.STATUSES.join(', ')}`);

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  order.status = status;
  await order.save();
  res.json({ success: true, data: order });
});

module.exports = { checkout, myOrders, getById, listAll, updateStatus };
