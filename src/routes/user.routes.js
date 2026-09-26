const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireAdmin);
router.get('/', userController.list);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.put('/:id/reset-password', userController.resetPassword);

module.exports = router;
