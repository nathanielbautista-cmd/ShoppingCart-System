const express = require('express');
const router = express.Router();
const {
  requestCashierCheckout,
  processCheckout,
  getTransactions,
  getTransactionById
  , getWaitingForCashier
} = require('../controllers/checkoutController');
const { protect, adminOnly } = require('../middleware/authMiddleware');


router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);


router.post('/:cartId/request-cashier', protect, adminOnly, requestCashierCheckout);
router.post('/:cartId', protect, adminOnly, processCheckout);

router.get('/waiting', protect, adminOnly, getWaitingForCashier);

module.exports = router;
