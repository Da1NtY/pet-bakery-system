const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

router.post('/login', AuthController.login);
router.post('/register', AuthController.register)
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/change-password', authenticate, AuthController.changePassword);

module.exports = router;