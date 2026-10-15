const express = require('express');
const router = express.Router();
const {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');


router.post('/login', login);


router.post('/register', register);


router.post('/verify-email', verifyEmail);


router.post('/resend-verification', resendVerification);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);


router.get('/me', protect, getMe);


router.put('/change-password', protect, changePassword);

module.exports = router;
