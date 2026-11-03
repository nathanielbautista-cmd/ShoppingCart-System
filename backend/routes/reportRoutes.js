const express = require('express');
const { getProductPerformance, getDashboardOverview, streamDashboardEvents } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/product-performance', protect, adminOnly, getProductPerformance);
router.get('/dashboard/events', protect, adminOnly, streamDashboardEvents);
router.get('/dashboard', protect, adminOnly, getDashboardOverview);

module.exports = router;
