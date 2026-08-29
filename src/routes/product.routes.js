const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);
router.post('/', requireAuth, requireAdmin, productController.create);
router.put('/:id', requireAuth, requireAdmin, productController.update);
router.delete('/:id', requireAuth, requireAdmin, productController.remove);

module.exports = router;
