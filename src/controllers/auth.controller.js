const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const svgCaptcha = require('svg-captcha');
const { User } = require('../models');
const { signToken } = require('../utils/jwt');
const captchaStore = require('../utils/captchaStore');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// Self-hosted captcha: the image and the answer are both generated in this
// process (svg-captcha), never a call out to a third party (reCAPTCHA/
// hCaptcha would both need the browser to load a script from — and phone
// home to — Google/Cloudflare, which breaks the no-internet-dependency
// requirement this app is built around). See src/utils/captchaStore.js.
const getCaptcha = asyncHandler(async (req, res) => {
  const captcha = svgCaptcha.create({ size: 5, noise: 3, color: true, background: '#f6f6f5' });
  const captchaId = crypto.randomUUID();
  captchaStore.save(captchaId, captcha.text);
  res.json({ success: true, data: { captchaId, svg: captcha.data } });
});

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, captchaId, captchaText } = req.body;
  if (!fullName || !email || !password) {
    throw new ApiError(400, 'fullName, email and password are required');
  }
  if (!captchaStore.verify(captchaId, captchaText)) {
    throw new ApiError(400, 'Mã captcha không đúng hoặc đã hết hạn');
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
  const { email, password, captchaId, captchaText } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');
  if (!captchaStore.verify(captchaId, captchaText)) {
    throw new ApiError(400, 'Mã captcha không đúng hoặc đã hết hạn');
  }

  const user = await User.findOne({ where: { email } });
  // No passwordHash means a social-only account (Google/Facebook) that
  // never set one — same generic error as "wrong password" rather than
  // crashing bcrypt.compare on a null hash.
  if (!user || !user.isActive || !user.passwordHash) throw new ApiError(401, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  const token = signToken({ id: user.id, role: user.role });
  res.json({
    success: true,
    data: { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  const data = user.toJSON();
  // Tells the "change password" page whether to require the current
  // password (a social-only account has none to enter yet).
  data.hasPassword = Boolean(data.passwordHash);
  delete data.passwordHash;
  res.json({ success: true, data });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const user = await User.findByPk(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.passwordHash) {
    if (!currentPassword) throw new ApiError(400, 'Vui lòng nhập mật khẩu hiện tại');
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    // 400, not 401: this is an authenticated request (the JWT itself is
    // fine) failing on a business-logic check. apiFetch() on the frontend
    // treats *any* 401 as "the session/token is invalid" and clears it —
    // returning 401 here would silently log the user out just for
    // mistyping their current password.
    if (!match) throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, data: null });
});

// Google/Facebook login lands here after passport resolves req.user (see
// src/config/passport.js). There's no fetch/XHR to hand a JWT back to on a
// full-page redirect flow, so it's passed as a query param to a tiny static
// page (oauth-callback.html) that stores it exactly like a normal login.
const oauthCallback = (req, res) => {
  const token = signToken({ id: req.user.id, role: req.user.role });
  res.redirect(`/oauth-callback.html?token=${encodeURIComponent(token)}`);
};

module.exports = { getCaptcha, register, login, me, changePassword, oauthCallback };
