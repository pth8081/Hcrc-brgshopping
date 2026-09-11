const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middlewares/auth.middleware');

router.get('/', optionalAuth, productController.list);
router.get('/best-sellers', productController.bestSellers);
router.post('/:id/view', optionalAuth, productController.recordView);
router.get('/:id/also-bought', productController.alsoBought);
router.get('/:slug', productController.getBySlug);
router.post('/', requireAuth, requireAdmin, productController.create);
router.put('/:id', requireAuth, requireAdmin, productController.update);
router.delete('/:id', requireAuth, requireAdmin, productController.remove);

module.exports = router;
