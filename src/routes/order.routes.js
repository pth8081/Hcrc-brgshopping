const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.post('/checkout', orderController.checkout);
router.get('/my', orderController.myOrders);
router.get('/:id', orderController.getById);

router.get('/', requireAdmin, orderController.listAll);
router.put('/:id/status', requireAdmin, orderController.updateStatus);

module.exports = router;
