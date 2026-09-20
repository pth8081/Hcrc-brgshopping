const { Op } = require('sequelize');
const slugify = require('slugify');
const { sequelize, Product, Category, ProductImage, Order, OrderItem, ProductView, SearchLog } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const bestSellers = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  // Deliberately no `include` here: combined with `group` + `limit`, Sequelize's
  // MSSQL dialect injects the joined table's primary key into ORDER BY to keep
  // OFFSET/FETCH deterministic, which SQL Server then rejects (not in GROUP BY).
  // Excluding cancelled orders by id up front avoids the join entirely.
  const cancelledOrders = await Order.findAll({ where: { status: 'cancelled' }, attributes: ['id'], raw: true });
  const cancelledOrderIds = cancelledOrders.map((o) => o.id);

  const rows = await OrderItem.findAll({
    where: cancelledOrderIds.length ? { orderId: { [Op.notIn]: cancelledOrderIds } } : undefined,
    attributes: ['productId', [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold']],
    group: ['productId'],
    order: [[sequelize.literal('totalSold'), 'DESC']],
    limit: Number(limit),
    raw: true,
  });

  const productIds = rows.map((r) => r.productId).filter(Boolean);
  if (productIds.length === 0) return res.json({ success: true, data: [] });

  const products = await Product.findAll({
    where: { id: productIds, isActive: true },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = productIds.map((id) => byId.get(id)).filter(Boolean);

  res.json({ success: true, data: ordered });
});

const SORTS = {
  newest: [['createdAt', 'DESC']],
  price_asc: [[sequelize.fn('COALESCE', sequelize.col('salePrice'), sequelize.col('price')), 'ASC']],
  price_desc: [[sequelize.fn('COALESCE', sequelize.col('salePrice'), sequelize.col('price')), 'DESC']],
};

const list = asyncHandler(async (req, res) => {
  const { categoryId, search, page = 1, limit = 20, sort, onSale, maxPrice } = req.query;
  const where = { isActive: true };
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { [Op.like]: `%${search}%` };
  if (onSale === 'true') where.salePrice = { [Op.ne]: null };
  if (maxPrice) where.price = { [Op.lte]: Number(maxPrice) };

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await Product.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    limit: Number(limit),
    offset,
    order: SORTS[sort] || SORTS.newest,
  });

  if (search) {
    // Fire-and-forget: a slow/failed write here must never slow down or break the search itself.
    SearchLog.create({ userId: req.user?.id || null, keyword: search.trim().slice(0, 200), resultCount: count }).catch(() => {});
  }

  res.json({
    success: true,
    data: rows,
    pagination: { page: Number(page), limit: Number(limit), total: count },
  });
});

const getBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    where: { slug: req.params.slug },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: ProductImage, as: 'images', attributes: ['id', 'imageUrl', 'sortOrder'] },
    ],
  });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, data: product });
});

const create = asyncHandler(async (req, res) => {
  const { name, categoryId, sku, description, price, salePrice, stockQuantity, thumbnailUrl } = req.body;
  if (!name || price === undefined) throw new ApiError(400, 'name and price are required');

  const slug = slugify(name, { lower: true, strict: true });
  const product = await Product.create({
    name, slug, categoryId, sku, description, price, salePrice, stockQuantity, thumbnailUrl,
  });
  res.status(201).json({ success: true, data: product });
});

const update = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const fields = ['categoryId', 'sku', 'description', 'price', 'salePrice', 'stockQuantity', 'thumbnailUrl', 'isActive'];
  for (const field of fields) {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  }
  if (req.body.name) {
    product.name = req.body.name;
    product.slug = slugify(req.body.name, { lower: true, strict: true });
  }
  await product.save();

  res.json({ success: true, data: product });
});

const remove = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  await product.destroy();
  res.json({ success: true, data: null });
});

// Guests can browse fine; a view is only worth recording (and personalizing
// on) once we know who is looking, so this silently no-ops for them.
const recordView = asyncHandler(async (req, res) => {
  if (req.user) {
    const product = await Product.findByPk(req.params.id, { attributes: ['id', 'categoryId'] });
    if (product) {
      await ProductView.create({ userId: req.user.id, productId: product.id, categoryId: product.categoryId });
    }
  }
  res.status(204).end();
});

const alsoBought = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;
  const productId = Number(req.params.id);

  const ordersWithProduct = await OrderItem.findAll({
    where: { productId },
    attributes: ['orderId'],
    raw: true,
  });
  const orderIds = ordersWithProduct.map((r) => r.orderId);
  if (orderIds.length === 0) return res.json({ success: true, data: [] });

  const rows = await OrderItem.findAll({
    where: { orderId: orderIds, productId: { [Op.ne]: productId } },
    attributes: ['productId', [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('OrderItem.orderId'))), 'coCount']],
    group: ['OrderItem.productId'],
    order: [[sequelize.literal('coCount'), 'DESC']],
    limit: Number(limit),
    raw: true,
  });

  const productIds = rows.map((r) => r.productId);
  if (productIds.length === 0) return res.json({ success: true, data: [] });

  const products = await Product.findAll({
    where: { id: productIds, isActive: true },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = productIds.map((id) => byId.get(id)).filter(Boolean);

  res.json({ success: true, data: ordered });
});

module.exports = { list, getBySlug, create, update, remove, bestSellers, recordView, alsoBought };
