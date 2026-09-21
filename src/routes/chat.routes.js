const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middlewares/auth.middleware');
const { chatLimiter } = require('../middlewares/rateLimit.middleware');

// Admin inbox — placed first so its extra path segments never get treated
// as a customer conversation id below.
router.get('/admin/conversations', requireAuth, requireAdmin, chatController.listConversations);
router.get('/admin/conversations/:id/messages', requireAuth, requireAdmin, chatController.getAdminMessages);
router.post('/admin/conversations/:id/messages', requireAuth, requireAdmin, chatController.adminReply);
router.put('/admin/conversations/:id/close', requireAuth, requireAdmin, chatController.closeConversation);

// Customer-facing — works for both a logged-in user (via optionalAuth) and
// an anonymous guest (via a client-generated guestToken), never requiring
// an account just to talk to support.
router.post('/start', chatLimiter, optionalAuth, chatController.start);
router.post('/:id/messages', chatLimiter, optionalAuth, chatController.sendMessage);
router.get('/:id/messages', chatLimiter, optionalAuth, chatController.getMessages);

module.exports = router;
