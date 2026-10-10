const express = require('express');
const router = express.Router();
const {
  requestCashierCheckout,
  processCheckout,
  getTransactions,
  getTransactionById
  , getWaitingForCashier
} = require('../controllers/checkoutController');


router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);


router.post('/:cartId/request-cashier', requestCashierCheckout);
router.post('/:cartId', processCheckout);

router.get('/waiting', getWaitingForCashier);

module.exports = router;
