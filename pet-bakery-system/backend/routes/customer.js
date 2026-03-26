const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/CustomerController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', CustomerController.list);
router.get('/:id', CustomerController.detail);
router.post('/', CustomerController.create);
router.put('/:id', CustomerController.update);

// 宠物管理
router.post('/:customerId/pets', CustomerController.addPet);
router.put('/pets/:petId', CustomerController.updatePet);
router.delete('/pets/:petId', CustomerController.deletePet);

module.exports = router;