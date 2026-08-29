const slugify = require('slugify');
const { Category } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
  res.json({ success: true, data: categories });
});

const getBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ where: { slug: req.params.slug } });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: category });
});

const create = asyncHandler(async (req, res) => {
  const { name, parentId, description, imageUrl } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const slug = slugify(name, { lower: true, strict: true });
  const category = await Category.create({ name, slug, parentId: parentId || null, description, imageUrl });
  res.status(201).json({ success: true, data: category });
});

const update = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const { name, parentId, description, imageUrl, isActive } = req.body;
  if (name) {
    category.name = name;
    category.slug = slugify(name, { lower: true, strict: true });
  }
  if (parentId !== undefined) category.parentId = parentId;
  if (description !== undefined) category.description = description;
  if (imageUrl !== undefined) category.imageUrl = imageUrl;
  if (isActive !== undefined) category.isActive = isActive;
  await category.save();

  res.json({ success: true, data: category });
});

const remove = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  await category.destroy();
  res.json({ success: true, data: null });
});

module.exports = { list, getBySlug, create, update, remove };
