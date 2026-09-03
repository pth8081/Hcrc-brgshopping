const {
  sequelize, Order, OrderItem, OrderStatusHistory, Cart, CartItem, Product, Address, User,
} = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateCart } = require('./cart.controller');

const checkout = asyncHandler(async (req, res) => {
  const { recipientName, phone, addressLine, paymentMethod = 'cod', note } = req.body;
  if (!recipientName || !phone || !addressLine) {
    throw new ApiError(400, 'recipientName, phone and addressLine are required');
  }

  const cart = await getOrCreateCart(req.user.id);
  const cartItems = await CartItem.findAll({ where: { cartId: cart.id }, include: [{ model: Product, as: 'product' }] });
  if (cartItems.length === 0) throw new ApiError(400, 'Cart is empty');

  const order = await sequelize.transaction(async (t) => {
    const address = await Address.create({
      userId: req.user.id,
      recipientName,
      phone,
      addressLine,
    }, { transaction: t });

    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

    const newOrder = await Order.create({
      userId: req.user.id,
      addressId: address.id,
      paymentMethod,
      note: note || null,
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

    await OrderStatusHistory.create({
      orderId: newOrder.id,
      status: newOrder.status,
      paymentStatus: newOrder.paymentStatus,
      note: 'Đơn hàng được tạo',
      changedByUserId: req.user.id,
    }, { transaction: t });

    return newOrder;
  });

  res.status(201).json({ success: true, data: order });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id },
    include: [{ model: OrderItem, as: 'items' }, { model: Address, as: 'address' }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: orders });
});

const getById = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Address, as: 'address' },
      { model: User, attributes: ['id', 'fullName', 'email', 'phone'] },
      { model: OrderStatusHistory, as: 'history', separate: true, order: [['createdAt', 'ASC']] },
    ],
  });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not allowed to view this order');
  }
  res.json({ success: true, data: order });
});

const listAll = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    include: [{ model: User, attributes: ['id', 'fullName', 'phone'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: orders });
});

async function restockOrderItems(orderId, transaction) {
  const items = await OrderItem.findAll({ where: { orderId }, transaction });
  for (const item of items) {
    if (item.productId) {
      await Product.increment('stockQuantity', { by: item.quantity, where: { id: item.productId }, transaction });
    }
  }
}

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!Order.STATUSES.includes(status)) throw new ApiError(400, `status must be one of: ${Order.STATUSES.join(', ')}`);

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const wasCancelled = order.status === 'cancelled';
  await sequelize.transaction(async (t) => {
    order.status = status;
    await order.save({ transaction: t });

    if (status === 'cancelled' && !wasCancelled) {
      await restockOrderItems(order.id, t);
    }

    await OrderStatusHistory.create({
      orderId: order.id,
      status,
      note: note || null,
      changedByUserId: req.user.id,
    }, { transaction: t });
  });

  res.json({ success: true, data: order });
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!Order.PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(400, `paymentStatus must be one of: ${Order.PAYMENT_STATUSES.join(', ')}`);
  }

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  await sequelize.transaction(async (t) => {
    order.paymentStatus = paymentStatus;
    await order.save({ transaction: t });

    await OrderStatusHistory.create({
      orderId: order.id,
      paymentStatus,
      note: 'Cập nhật trạng thái thanh toán',
      changedByUserId: req.user.id,
    }, { transaction: t });
  });

  res.json({ success: true, data: order });
});

const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'pending') {
    throw new ApiError(400, 'Chỉ có thể huỷ đơn khi đơn đang ở trạng thái chờ xác nhận');
  }

  await sequelize.transaction(async (t) => {
    order.status = 'cancelled';
    await order.save({ transaction: t });
    await restockOrderItems(order.id, t);
    await OrderStatusHistory.create({
      orderId: order.id,
      status: 'cancelled',
      note: 'Khách hàng huỷ đơn',
      changedByUserId: req.user.id,
    }, { transaction: t });
  });

  res.json({ success: true, data: order });
});

const myNotifications = asyncHandler(async (req, res) => {
  const history = await OrderStatusHistory.findAll({
    include: [{ model: Order, where: { userId: req.user.id }, attributes: ['id'] }],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });
  res.json({ success: true, data: history });
});

module.exports = {
  checkout, myOrders, getById, listAll, updateStatus, updatePaymentStatus, cancelMyOrder, myNotifications,
};
