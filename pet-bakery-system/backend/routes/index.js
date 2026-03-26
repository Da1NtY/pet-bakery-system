const express = require('express');
const router = express.Router();

// 各模块路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const categoryRoutes = require('./category');
const productRoutes = require('./product');
const ingredientRoutes = require('./ingredient');
const bomRoutes = require('./bom');
const customerRoutes = require('./customer');
const orderRoutes = require('./order');
const statsRoutes = require('./stats');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/ingredients', ingredientRoutes);
router.use('/bom', bomRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/stats', statsRoutes);

module.exports = router;