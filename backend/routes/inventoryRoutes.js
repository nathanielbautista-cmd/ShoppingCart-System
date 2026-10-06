const express = require('express');
const router = express.Router();
const {
  getInventory,
  adjustStock,
  getLowStockAlerts
} = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getInventory);
router.get('/low-stock', getLowStockAlerts);
router.put('/:productId/stock', protect, adminOnly, adjustStock);

module.exports = router;
