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

// Attaches req.user when a valid token is present, but never rejects the
// request — for endpoints (view/search logging) that behave for guests too
// and only personalize when the visitor happens to be logged in.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Invalid/expired token on an optional-auth route: proceed as a guest.
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
