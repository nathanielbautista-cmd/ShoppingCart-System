const User = require('../models/User');

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhoneNumber = (value = '') => value.trim().replace(/[\s()-]/g, '');

const publicCashier = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const getCashiers = async (req, res, next) => {
  try {
    const cashiers = await User.find({ role: 'cashier' }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: cashiers.length,
      cashiers: cashiers.map(publicCashier)
    });
  } catch (error) {
    next(error);
  }
};

const createCashier = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(String(phoneNumber || ''));
    const normalizedName = String(name || '').trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone number, and temporary password are required'
      });
    }
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid phone number (7 to 15 digits)' });
    }
    if (String(password).length > 128 || !STRONG_PASSWORD.test(String(password))) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account already exists with this email' });
    }

    const cashier = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      password: String(password),
      role: 'cashier',
      // Cashier accounts are trusted staff accounts created by an authenticated admin.
      isEmailVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Cashier account created successfully',
      cashier: publicCashier(cashier)
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account already exists with this email' });
    }
    next(error);
  }
};

module.exports = { getCashiers, createCashier };
