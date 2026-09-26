const rateLimit = require('express-rate-limit');

// Login/register are the only unauthenticated write endpoints, so they're
// the obvious brute-force target once this app is reachable from the public
// internet. Keyed by IP (via `trust proxy`, set in app.js, so this sees the
// real client IP behind the nginx reverse proxy rather than nginx's own IP).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' },
});

// Guest checkout and the order-lookup endpoint are also unauthenticated
// writes/reads (lookup in particular could otherwise be used to brute-force
// guess a phone number against an order id) — same idea as authLimiter,
// just a bit more generous since a real guest legitimately hits both once
// per order rather than repeatedly.
const guestOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' },
});

// Chat is naturally chattier than a login form — a real conversation can
// easily be more than 10 messages in 15 minutes — so this only exists to
// stop scripted spam, not to get in a real customer's way.
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' },
});

// A user legitimately hits "get a new captcha" a few times while retyping a
// login/register form — more generous than authLimiter so that isn't what
// locks them out, while still capping scripted captcha-farming.
const captchaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' },
});

module.exports = { authLimiter, guestOrderLimiter, chatLimiter, captchaLimiter };
