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

module.exports = { authLimiter };
