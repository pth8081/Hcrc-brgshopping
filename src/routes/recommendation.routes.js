const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/for-you', requireAuth, recommendationController.forYou);
router.get('/top-categories', requireAuth, recommendationController.topCategories);

module.exports = router;
