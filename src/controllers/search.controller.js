const { Op, fn, col } = require('sequelize');
const { sequelize, SearchLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Autocomplete suggestions drawn from what people have actually searched for
// on this store — not a fixed dictionary — so it improves as real search
// traffic accumulates. Falls back to nothing (never errors) for a brand new
// store with no search history yet.
const suggestions = asyncHandler(async (req, res) => {
  const { q = '', limit = 6 } = req.query;
  const prefix = q.trim();
  const where = prefix ? { keyword: { [Op.like]: `${prefix}%` } } : {};

  const rows = await SearchLog.findAll({
    where,
    attributes: ['keyword', [fn('COUNT', col('id')), 'hits']],
    group: ['keyword'],
    order: [[sequelize.literal('hits'), 'DESC']],
    limit: Number(limit),
    raw: true,
  });

  res.json({ success: true, data: rows.map((r) => r.keyword) });
});

module.exports = { suggestions };
