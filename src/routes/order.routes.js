const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const { guestOrderLimiter } = require('../middlewares/rateLimit.middleware');

// Public — no account needed, so these must come before the requireAuth gate below.
router.post('/guest-checkout', guestOrderLimiter, orderController.guestCheckout);
router.get('/lookup', guestOrderLimiter, orderController.lookupGuestOrder);

router.use(requireAuth);
router.post('/checkout', orderController.checkout);
router.get('/my', orderController.myOrders);
router.get('/notifications', orderController.myNotifications);

router.get('/', requireAdmin, orderController.listAll);

router.get('/:id', orderController.getById);
router.put('/:id/cancel', orderController.cancelMyOrder);
router.put('/:id/status', requireAdmin, orderController.updateStatus);
router.put('/:id/payment-status', requireAdmin, orderController.updatePaymentStatus);

module.exports = router;
