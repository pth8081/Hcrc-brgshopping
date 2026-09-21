const { Op } = require('sequelize');
const {
  sequelize, Order, OrderItem, OrderStatusHistory, Cart, CartItem, Product, Address, User, Promotion,
} = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateCart } = require('./cart.controller');
const { computeDiscount } = require('./promotion.controller');

const checkout = asyncHandler(async (req, res) => {
  const { recipientName, phone, addressLine, paymentMethod = 'cod', note, promoCode } = req.body;
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

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.priceAtAdd) * item.quantity, 0);

    let promotion = null;
    let discountAmount = 0;
    if (promoCode) {
      const now = new Date();
      promotion = await Promotion.findOne({
        where: { code: promoCode.trim().toUpperCase(), isActive: true, startDate: { [Op.lte]: now }, endDate: { [Op.gte]: now } },
        transaction: t,
      });
      if (!promotion) throw new ApiError(404, 'Mã khuyến mại không hợp lệ hoặc đã hết hạn');
      if (subtotal < Number(promotion.minOrderAmount)) {
        throw new ApiError(400, `Đơn hàng tối thiểu ${Number(promotion.minOrderAmount).toLocaleString('vi-VN')}đ để áp dụng mã này`);
      }
      discountAmount = computeDiscount(promotion, subtotal);
    }

    const totalAmount = subtotal - discountAmount;

    const newOrder = await Order.create({
      userId: req.user.id,
      addressId: address.id,
      promotionId: promotion ? promotion.id : null,
      paymentMethod,
      note: note || null,
      totalAmount,
      discountAmount,
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

// Same idea as checkout() above, but for a visitor with no account: the
// cart lives in the browser (localStorage, see getGuestCart() in
// public/js/api.js) instead of a server-side Cart, so the items come
// straight from the request body — and every price/stock check is redone
// here from the database, never trusted from the client.
const guestCheckout = asyncHandler(async (req, res) => {
  const { items, guestName, guestPhone, guestAddress, guestEmail, paymentMethod = 'cod', note, promoCode } = req.body;
  if (!guestName || !guestPhone || !guestAddress) {
    throw new ApiError(400, 'guestName, guestPhone and guestAddress are required');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'items is required');
  }

  const productIds = items.map((i) => Number(i.productId)).filter(Boolean);
  const products = await Product.findAll({ where: { id: productIds, isActive: true } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const lineItems = items.map((i) => {
    const product = productById.get(Number(i.productId));
    const quantity = Number(i.quantity) || 0;
    if (!product) throw new ApiError(404, `Sản phẩm #${i.productId} không còn tồn tại`);
    if (quantity < 1) throw new ApiError(400, 'quantity must be at least 1');
    if (product.stockQuantity < quantity) throw new ApiError(400, `${product.name} chỉ còn ${product.stockQuantity} sản phẩm`);
    const price = Number(product.salePrice || product.price);
    return { product, quantity, price };
  });

  const order = await sequelize.transaction(async (t) => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);

    let promotion = null;
    let discountAmount = 0;
    if (promoCode) {
      const now = new Date();
      promotion = await Promotion.findOne({
        where: { code: promoCode.trim().toUpperCase(), isActive: true, startDate: { [Op.lte]: now }, endDate: { [Op.gte]: now } },
        transaction: t,
      });
      if (!promotion) throw new ApiError(404, 'Mã khuyến mại không hợp lệ hoặc đã hết hạn');
      if (subtotal < Number(promotion.minOrderAmount)) {
        throw new ApiError(400, `Đơn hàng tối thiểu ${Number(promotion.minOrderAmount).toLocaleString('vi-VN')}đ để áp dụng mã này`);
      }
      discountAmount = computeDiscount(promotion, subtotal);
    }

    const newOrder = await Order.create({
      userId: null,
      guestName,
      guestPhone,
      guestEmail: guestEmail || null,
      guestAddress,
      promotionId: promotion ? promotion.id : null,
      paymentMethod,
      note: note || null,
      totalAmount: subtotal - discountAmount,
      discountAmount,
    }, { transaction: t });

    for (const li of lineItems) {
      await OrderItem.create({
        orderId: newOrder.id,
        productId: li.product.id,
        productName: li.product.name,
        price: li.price,
        quantity: li.quantity,
        subtotal: li.price * li.quantity,
      }, { transaction: t });

      await Product.decrement('stockQuantity', { by: li.quantity, where: { id: li.product.id }, transaction: t });
    }

    await OrderStatusHistory.create({
      orderId: newOrder.id,
      status: newOrder.status,
      paymentStatus: newOrder.paymentStatus,
      note: 'Đơn hàng được tạo (khách vãng lai)',
    }, { transaction: t });

    return newOrder;
  });

  res.status(201).json({ success: true, data: order });
});

// Public order tracking for a guest who has no account to view /orders.html
// with. Deliberately scoped to guest orders only (userId IS NULL) — an
// account order's status is only visible by logging in, so this can't be
// used to peek at someone else's order just by knowing its id and phone.
const lookupGuestOrder = asyncHandler(async (req, res) => {
  const { code, phone } = req.query;
  const id = Number(code);
  if (!id || !phone) throw new ApiError(400, 'code and phone are required');

  const order = await Order.findOne({
    where: { id, userId: null, guestPhone: String(phone).trim() },
    include: [{ model: OrderItem, as: 'items' }],
  });
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng với mã và số điện thoại này');

  res.json({ success: true, data: order });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { userId: req.user.id },
    include: [{ model: OrderItem, as: 'items' }, { model: Address, as: 'address' }, { model: Promotion, as: 'promotion', attributes: ['id', 'title', 'code'] }],
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
      { model: Promotion, as: 'promotion', attributes: ['id', 'title', 'code'] },
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
  checkout, guestCheckout, lookupGuestOrder, myOrders, getById, listAll, updateStatus, updatePaymentStatus, cancelMyOrder, myNotifications,
};
