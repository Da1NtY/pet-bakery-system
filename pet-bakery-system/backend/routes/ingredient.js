const express = require('express');
const router = express.Router();
const IngredientController = require('../controllers/IngredientController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', IngredientController.list);
router.get('/low-stock', IngredientController.getLowStock);
router.get('/:id', IngredientController.detail);
router.post('/', IngredientController.create);
router.put('/:id', IngredientController.update);
router.post('/:id/adjust-stock', IngredientController.adjustStock);

module.exports = router;