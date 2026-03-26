const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ProductController.list);
router.get('/:id', ProductController.detail);
router.post('/', ProductController.create);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

module.exports = router;