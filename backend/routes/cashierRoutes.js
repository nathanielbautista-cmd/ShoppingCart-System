const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cart = require('../models/Cart');
const { protect, cashierOnly } = require('../middleware/authMiddleware');
const {
  processCheckout,
  getTransactions,
  getTransactionById
} = require('../controllers/checkoutController');
const { CART_STATUS } = require('../config/constants');


router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (!user || user.role !== 'cashier' || !(await user.matchPassword(password || ''))) {
      return res.status(401).json({ success: false, message: 'Invalid cashier email or password' });
    }


    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'icart_secret_jwt_key_2026_capstone', { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});

router.use(protect, cashierOnly);

router.get('/carts/waiting', async (req, res, next) => {
  try {
    const carts = await Cart.find({ status: CART_STATUS.WAITING_FOR_CASHIER }).sort({ updatedAt: 1 });
    res.json({ success: true, count: carts.length, carts });
  } catch (error) { next(error); }
});

router.get('/carts/:cartId', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ cartId: req.params.cartId.trim().toUpperCase() });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    res.json({ success: true, cart });
  } catch (error) { next(error); }
});

router.post('/transactions/:cartId', (req, res, next) => {
  req.body.cashierId = req.user.name || req.user.email;
  req.params.cartId = req.params.cartId.trim().toUpperCase();
  processCheckout(req, res, next);
});
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

module.exports = router;
