const { Op } = require('sequelize');
const { Product, Category, ProductView, Order, OrderItem } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// "Dành cho bạn": blend the categories a user has *viewed* with the ones
// they've actually *purchased* (weighted higher), then surface other active
// products from their top categories. Pure SQL aggregation done in JS at
// this data scale — no external ML/AI service, consistent with the rest of
// this offline-deployable app.
const VIEW_WEIGHT = 1;
const PURCHASE_WEIGHT = 3;
const TOP_CATEGORY_COUNT = 3;

// Shared by /for-you and /top-categories: the user's purchased-product ids
// (to exclude from "for you") plus their categories ranked by affinity.
async function computeAffinity(userId) {
  const views = await ProductView.findAll({ where: { userId, categoryId: { [Op.ne]: null } }, attributes: ['categoryId'], raw: true });

  const orders = await Order.findAll({ where: { userId }, attributes: ['id'], raw: true });
  const orderIds = orders.map((o) => o.id);
  const purchasedItems = orderIds.length
    ? await OrderItem.findAll({ where: { orderId: orderIds }, attributes: ['productId'], raw: true })
    : [];
  const purchasedProductIds = [...new Set(purchasedItems.map((i) => i.productId).filter(Boolean))];
  const purchasedProducts = purchasedProductIds.length
    ? await Product.findAll({ where: { id: purchasedProductIds }, attributes: ['id', 'categoryId'], raw: true })
    : [];

  const categoryScore = new Map();
  for (const v of views) categoryScore.set(v.categoryId, (categoryScore.get(v.categoryId) || 0) + VIEW_WEIGHT);
  for (const p of purchasedProducts) {
    if (p.categoryId) categoryScore.set(p.categoryId, (categoryScore.get(p.categoryId) || 0) + PURCHASE_WEIGHT);
  }

  const topCategoryIds = [...categoryScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORY_COUNT)
    .map(([categoryId]) => categoryId);

  return { topCategoryIds, purchasedProductIds };
}

const forYou = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;
  const { topCategoryIds, purchasedProductIds } = await computeAffinity(req.user.id);
  if (topCategoryIds.length === 0) return res.json({ success: true, data: [] });

  const where = { categoryId: topCategoryIds, isActive: true };
  if (purchasedProductIds.length) where.id = { [Op.notIn]: purchasedProductIds };

  const products = await Product.findAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
  });

  res.json({ success: true, data: products });
});

// Used by the homepage to re-rank its default product grid toward a logged-in
// visitor's interests, without duplicating the affinity query client-side.
const topCategories = asyncHandler(async (req, res) => {
  const { topCategoryIds } = await computeAffinity(req.user.id);
  res.json({ success: true, data: topCategoryIds });
});

module.exports = { forYou, topCategories };
