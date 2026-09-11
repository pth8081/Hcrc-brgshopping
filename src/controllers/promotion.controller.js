const { Op } = require('sequelize');
const { Promotion } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// A bare "YYYY-MM-DD" end date (from an <input type="date">) parses as UTC
// midnight, which would make a promotion expire before its last day even
// starts — push it to the end of that day instead.
function endOfDayIfDateOnly(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999`);
  }
  return value;
}

function computeDiscount(promotion, orderTotal) {
  let discount =
    promotion.discountType === 'percent'
      ? (Number(orderTotal) * Number(promotion.discountValue)) / 100
      : Number(promotion.discountValue);
  if (promotion.maxDiscountAmount != null) discount = Math.min(discount, Number(promotion.maxDiscountAmount));
  return Math.min(discount, Number(orderTotal));
}

const listActive = asyncHandler(async (req, res) => {
  const now = new Date();
  const promotions = await Promotion.findAll({
    where: { isActive: true, startDate: { [Op.lte]: now }, endDate: { [Op.gte]: now } },
    order: [['endDate', 'ASC']],
  });
  res.json({ success: true, data: promotions });
});

const listAll = asyncHandler(async (req, res) => {
  const promotions = await Promotion.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: promotions });
});

const validateCode = asyncHandler(async (req, res) => {
  const { code, orderTotal } = req.body;
  if (!code) throw new ApiError(400, 'code is required');

  const now = new Date();
  const promotion = await Promotion.findOne({
    where: { code: code.trim().toUpperCase(), isActive: true, startDate: { [Op.lte]: now }, endDate: { [Op.gte]: now } },
  });
  if (!promotion) throw new ApiError(404, 'Mã khuyến mại không hợp lệ hoặc đã hết hạn');
  if (Number(orderTotal || 0) < Number(promotion.minOrderAmount)) {
    throw new ApiError(400, `Đơn hàng tối thiểu ${Number(promotion.minOrderAmount).toLocaleString('vi-VN')}đ để áp dụng mã này`);
  }

  const discountAmount = computeDiscount(promotion, orderTotal || 0);
  res.json({ success: true, data: { promotionId: promotion.id, title: promotion.title, discountAmount } });
});

const create = asyncHandler(async (req, res) => {
  const { title, description, imageUrl, code, discountType, discountValue, minOrderAmount, maxDiscountAmount, startDate, endDate, isActive } = req.body;
  if (!title || discountValue === undefined || !startDate || !endDate) {
    throw new ApiError(400, 'title, discountValue, startDate and endDate are required');
  }

  const promotion = await Promotion.create({
    title,
    description,
    imageUrl,
    code: code ? code.trim().toUpperCase() : null,
    discountType: discountType || 'percent',
    discountValue,
    minOrderAmount: minOrderAmount || 0,
    maxDiscountAmount: maxDiscountAmount || null,
    startDate,
    endDate: endOfDayIfDateOnly(endDate),
    isActive: isActive !== undefined ? isActive : true,
  });
  res.status(201).json({ success: true, data: promotion });
});

const update = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');

  const fields = ['title', 'description', 'imageUrl', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscountAmount', 'startDate', 'endDate', 'isActive'];
  for (const field of fields) {
    if (req.body[field] !== undefined) promotion[field] = req.body[field];
  }
  if (req.body.endDate !== undefined) promotion.endDate = endOfDayIfDateOnly(req.body.endDate);
  if (req.body.code !== undefined) promotion.code = req.body.code ? req.body.code.trim().toUpperCase() : null;
  await promotion.save();

  res.json({ success: true, data: promotion });
});

const remove = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByPk(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  await promotion.destroy();
  res.json({ success: true, data: null });
});

module.exports = { listActive, listAll, validateCode, create, update, remove, computeDiscount };
