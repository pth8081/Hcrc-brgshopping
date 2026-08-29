const { Cart, CartItem, Product } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

async function getOrCreateCart(userId) {
  const [cart] = await Cart.findOrCreate({ where: { userId } });
  return cart;
}

const getMyCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'slug', 'thumbnailUrl', 'price', 'salePrice'] }],
  });
  res.json({ success: true, data: { cartId: cart.id, items } });
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) throw new ApiError(400, 'productId is required');

  const product = await Product.findByPk(productId);
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');

  const cart = await getOrCreateCart(req.user.id);
  const [item, created] = await CartItem.findOrCreate({
    where: { cartId: cart.id, productId },
    defaults: { quantity, priceAtAdd: product.salePrice || product.price },
  });
  if (!created) {
    item.quantity += Number(quantity);
    await item.save();
  }

  res.status(201).json({ success: true, data: item });
});

const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) throw new ApiError(400, 'quantity must be at least 1');

  const cart = await getOrCreateCart(req.user.id);
  const item = await CartItem.findOne({ where: { id: req.params.itemId, cartId: cart.id } });
  if (!item) throw new ApiError(404, 'Cart item not found');

  item.quantity = quantity;
  await item.save();
  res.json({ success: true, data: item });
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const item = await CartItem.findOne({ where: { id: req.params.itemId, cartId: cart.id } });
  if (!item) throw new ApiError(404, 'Cart item not found');

  await item.destroy();
  res.json({ success: true, data: null });
});

const clear = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await CartItem.destroy({ where: { cartId: cart.id } });
  res.json({ success: true, data: null });
});

module.exports = { getMyCart, addItem, updateItem, removeItem, clear, getOrCreateCart };
