const express = require('express');
const { getCashiers, createCashier } = require('../controllers/cashierAccountController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, adminOnly);
router.route('/cashiers')
  .get(getCashiers)
  .post(createCashier);

module.exports = router;
