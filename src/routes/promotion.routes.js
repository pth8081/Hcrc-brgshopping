const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', promotionController.listActive);
router.get('/all', requireAuth, requireAdmin, promotionController.listAll);
router.post('/validate', promotionController.validateCode);
router.post('/', requireAuth, requireAdmin, promotionController.create);
router.put('/:id', requireAuth, requireAdmin, promotionController.update);
router.delete('/:id', requireAuth, requireAdmin, promotionController.remove);

module.exports = router;
