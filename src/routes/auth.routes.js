const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { passport, GOOGLE_ENABLED, FACEBOOK_ENABLED } = require('../config/passport');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', requireAuth, authController.me);

// Social login: a full-page redirect flow (not fetch/XHR), since the
// provider's consent screen needs a real browser navigation. If the admin
// hasn't set the provider's Client ID/Secret in .env yet, send the visitor
// back to the login page instead of letting passport throw on an
// unregistered strategy.
router.get('/google', (req, res, next) => {
  if (!GOOGLE_ENABLED) return res.redirect('/login.html?oauth=not_configured');
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: true })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
  if (!GOOGLE_ENABLED) return res.redirect('/login.html?oauth=not_configured');
  passport.authenticate('google', { session: false, failureRedirect: '/login.html?oauth=error' })(req, res, next);
}, authController.oauthCallback);

router.get('/facebook', (req, res, next) => {
  if (!FACEBOOK_ENABLED) return res.redirect('/login.html?oauth=not_configured');
  passport.authenticate('facebook', { scope: ['email'], session: false, state: true })(req, res, next);
});
router.get('/facebook/callback', (req, res, next) => {
  if (!FACEBOOK_ENABLED) return res.redirect('/login.html?oauth=not_configured');
  passport.authenticate('facebook', { session: false, failureRedirect: '/login.html?oauth=error' })(req, res, next);
}, authController.oauthCallback);

module.exports = router;
