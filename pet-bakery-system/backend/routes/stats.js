const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/StatsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard', StatsController.getDashboard);
router.get('/daily', StatsController.getDailyStats);
router.get('/products', StatsController.getProductStats);
router.get('/customers', StatsController.getCustomerStats);

module.exports = router;