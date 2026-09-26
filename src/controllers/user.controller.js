const bcrypt = require('bcryptjs');
const { User } = require('../models');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const ROLES = ['customer', 'admin'];

const list = asyncHandler(async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: users });
});

const create = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, role = 'customer' } = req.body;
  if (!fullName || !email || !password) throw new ApiError(400, 'fullName, email and password are required');
  if (!ROLES.includes(role)) throw new ApiError(400, `role must be one of: ${ROLES.join(', ')}`);

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, passwordHash, phone, role });

  const data = user.toJSON();
  delete data.passwordHash;
  res.status(201).json({ success: true, data });
});

// No hard delete: orders/addresses reference userId with no cascade (by
// design — an order must keep its history even if the account goes away),
// so removing a user row outright would either fail on the FK or orphan
// their order history. Deactivating (isActive) is the supported way to
// shut off an account.
const update = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const { fullName, email, phone, role, isActive } = req.body;
  const isSelf = Number(req.params.id) === req.user.id;

  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new ApiError(400, `role must be one of: ${ROLES.join(', ')}`);
    if (isSelf && role !== 'admin') throw new ApiError(400, 'Không thể tự hạ quyền tài khoản đang đăng nhập');
    user.role = role;
  }
  if (isActive !== undefined) {
    if (isSelf && !isActive) throw new ApiError(400, 'Không thể tự khoá tài khoản đang đăng nhập');
    user.isActive = isActive;
  }
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;

  await user.save();
  const data = user.toJSON();
  delete data.passwordHash;
  res.json({ success: true, data });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) throw new ApiError(400, 'newPassword phải có ít nhất 6 ký tự');

  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, data: null });
});

module.exports = { list, create, update, resetPassword };
