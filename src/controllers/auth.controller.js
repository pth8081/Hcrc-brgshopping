const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (!fullName || !email || !password) {
    throw new ApiError(400, 'fullName, email and password are required');
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, passwordHash, phone });

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({
    success: true,
    data: { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  const token = signToken({ id: user.id, role: user.role });
  res.json({
    success: true,
    data: { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['passwordHash'] } });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user });
});

// Google/Facebook login lands here after passport resolves req.user (see
// src/config/passport.js). There's no fetch/XHR to hand a JWT back to on a
// full-page redirect flow, so it's passed as a query param to a tiny static
// page (oauth-callback.html) that stores it exactly like a normal login.
const oauthCallback = (req, res) => {
  const token = signToken({ id: req.user.id, role: req.user.role });
  res.redirect(`/oauth-callback.html?token=${encodeURIComponent(token)}`);
};

module.exports = { register, login, me, oauthCallback };
