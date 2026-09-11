const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/categories', require('./category.routes'));
router.use('/products', require('./product.routes'));
router.use('/cart', require('./cart.routes'));
router.use('/orders', require('./order.routes'));
router.use('/news', require('./news.routes'));
router.use('/promotions', require('./promotion.routes'));

module.exports = router;
