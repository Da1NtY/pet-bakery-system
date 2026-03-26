const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate); // 所有用户路由需要登录

router.get('/', UserController.list);
router.get('/:id', UserController.detail);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);
router.post('/:id/reset-password', UserController.resetPassword);

module.exports = router;