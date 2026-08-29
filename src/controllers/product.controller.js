const { Op } = require('sequelize');
const slugify = require('slugify');
const { Product, Category, ProductImage } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { categoryId, search, page = 1, limit = 20 } = req.query;
  const where = { isActive: true };
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { [Op.like]: `%${search}%` };

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await Product.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }],
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']],
  });

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

module.exports = { list, getBySlug, create, update, remove };
