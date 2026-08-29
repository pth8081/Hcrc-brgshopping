const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Missing authentication token'));

  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
