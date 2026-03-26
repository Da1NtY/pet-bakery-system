const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/statistics', OrderController.getStatistics);
router.get('/', OrderController.list);
router.get('/:id', OrderController.detail);
router.post('/', OrderController.create);
router.post('/:id/confirm', OrderController.confirm);
router.post('/:id/cancel', OrderController.cancel);
router.post('/:id/status', OrderController.updateStatus);
router.post('/:id/payment', OrderController.addPayment);

module.exports = router;