const express = require('express');
const { getProductPerformance, getDashboardOverview } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/product-performance', protect, adminOnly, getProductPerformance);
router.get('/dashboard', protect, adminOnly, getDashboardOverview);

module.exports = router;
