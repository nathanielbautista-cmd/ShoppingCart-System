const express = require('express');
const {
  getTransactions,
  getTransactionById
} = require('../controllers/checkoutController');

const router = express.Router();

router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

module.exports = router;
