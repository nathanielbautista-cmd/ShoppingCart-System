const express = require('express');
const { getReportSummary } = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/summary', protect, adminOnly, getReportSummary);

module.exports = router;
