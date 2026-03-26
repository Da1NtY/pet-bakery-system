const express = require('express');
const router = express.Router();
const BomController = require('../controllers/BomController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/sku/:skuId', BomController.getBySkuId);
router.get('/sku/:skuId/history', BomController.getHistory);
router.post('/', BomController.save);

module.exports = router;