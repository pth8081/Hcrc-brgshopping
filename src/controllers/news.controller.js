const slugify = require('slugify');
const { News } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await News.findAndCountAll({
    where: { isPublished: true },
    limit: Number(limit),
    offset,
    order: [['publishedAt', 'DESC']],
  });
  res.json({ success: true, data: rows, pagination: { page: Number(page), limit: Number(limit), total: count } });
});

const getBySlug = asyncHandler(async (req, res) => {
  const news = await News.findOne({ where: { slug: req.params.slug, isPublished: true } });
  if (!news) throw new ApiError(404, 'News not found');
  res.json({ success: true, data: news });
});

const listAll = asyncHandler(async (req, res) => {
  const news = await News.findAll({ order: [['publishedAt', 'DESC']] });
  res.json({ success: true, data: news });
});

const create = asyncHandler(async (req, res) => {
  const { title, summary, content, imageUrl, isPublished, publishedAt } = req.body;
  if (!title || !content) throw new ApiError(400, 'title and content are required');

  const slug = slugify(title, { lower: true, strict: true });
  const news = await News.create({
    title,
    slug,
    summary,
    content,
    imageUrl,
    isPublished: isPublished !== undefined ? isPublished : true,
    publishedAt: publishedAt || new Date(),
    authorUserId: req.user.id,
  });
  res.status(201).json({ success: true, data: news });
});

const update = asyncHandler(async (req, res) => {
  const news = await News.findByPk(req.params.id);
  if (!news) throw new ApiError(404, 'News not found');

  const fields = ['summary', 'content', 'imageUrl', 'isPublished', 'publishedAt'];
  for (const field of fields) {
    if (req.body[field] !== undefined) news[field] = req.body[field];
  }
  if (req.body.title) {
    news.title = req.body.title;
    news.slug = slugify(req.body.title, { lower: true, strict: true });
  }
  await news.save();

  res.json({ success: true, data: news });
});

const remove = asyncHandler(async (req, res) => {
  const news = await News.findByPk(req.params.id);
  if (!news) throw new ApiError(404, 'News not found');
  await news.destroy();
  res.json({ success: true, data: null });
});

module.exports = { list, getBySlug, listAll, create, update, remove };
