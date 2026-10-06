const express = require('express');
const router = express.Router();
const {
  requestCashierCheckout,
  processCheckout,
  getTransactions,
  getTransactionById
  , getWaitingForCashier
} = require('../controllers/checkoutController');

// Transaction listing & receipts
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

// Checkout Actions
router.post('/:cartId/request-cashier', requestCashierCheckout);
router.post('/:cartId', processCheckout);
// List carts waiting for cashier assistance
router.get('/waiting', getWaitingForCashier);

module.exports = router;
