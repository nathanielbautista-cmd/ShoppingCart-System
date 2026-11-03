const express = require('express');
const {
  createPayment,
  getPayment,
  mockCheckout,
  cancelPayment,
  simulateSuccess,
  webhook,
  getPendingPayments,
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/qrph/webhook', webhook);
router.get('/pending', protect, adminOnly, getPendingPayments);
router.post('/qrph/:cartId', createPayment);
router.get('/mock/:paymentId', mockCheckout);
router.post('/mock/:paymentId/confirm', simulateSuccess);
router.get('/:paymentId', getPayment);
router.post('/:paymentId/cancel', cancelPayment);
router.post('/:paymentId/simulate-success', simulateSuccess);

module.exports = router;
