const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', newsController.list);
router.get('/all', requireAuth, requireAdmin, newsController.listAll);
router.get('/:slug', newsController.getBySlug);
router.post('/', requireAuth, requireAdmin, newsController.create);
router.put('/:id', requireAuth, requireAdmin, newsController.update);
router.delete('/:id', requireAuth, requireAdmin, newsController.remove);

module.exports = router;
