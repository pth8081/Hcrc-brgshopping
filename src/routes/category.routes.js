const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', categoryController.list);
router.get('/:slug', categoryController.getBySlug);
router.post('/', requireAuth, requireAdmin, categoryController.create);
router.put('/:id', requireAuth, requireAdmin, categoryController.update);
router.delete('/:id', requireAuth, requireAdmin, categoryController.remove);

module.exports = router;
