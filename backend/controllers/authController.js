const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const MAX_PASSWORD_RESET_ATTEMPTS = 5;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id) => jwt.sign(
  { id },
  process.env.JWT_SECRET || 'icart_secret_jwt_key_2026_capstone',
  { expiresIn: '30d' }
);

const normalizePhoneNumber = (value = '') => value.trim().replace(/[\s()-]/g, '');
const hashVerificationCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const createVerificationCode = () => crypto.randomInt(100000, 1000000).toString();
const maskEmail = (email) => {
  const [localPart = '', domain = ''] = String(email).split('@');
  return `${localPart.slice(0, 2) || '*'}***@${domain}`;
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const issueVerificationCode = async (user) => {
  const code = createVerificationCode();
  const previousVerification = {
    token: user.emailVerificationToken,
    expires: user.emailVerificationExpires,
    attempts: user.emailVerificationAttempts,
    lastSentAt: user.emailVerificationLastSentAt
  };

  user.emailVerificationToken = hashVerificationCode(code);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  user.emailVerificationAttempts = 0;
  user.emailVerificationLastSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail({ email: user.email, name: user.name, code });
  } catch (error) {
    user.emailVerificationToken = previousVerification.token;
    user.emailVerificationExpires = previousVerification.expires;
    user.emailVerificationAttempts = previousVerification.attempts;
    user.emailVerificationLastSentAt = previousVerification.lastSentAt;
    await user.save({ validateBeforeSave: false }).catch(() => {});
    throw error;
  }
};

const issuePasswordResetCode = async (user) => {
  const code = createVerificationCode();
  const previousReset = {
    token: user.passwordResetToken,
    expires: user.passwordResetExpires,
    attempts: user.passwordResetAttempts,
    lastSentAt: user.passwordResetLastSentAt
  };

  user.passwordResetToken = hashVerificationCode(code);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  user.passwordResetAttempts = 0;
  user.passwordResetLastSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      code,
      role: user.role
    });
  } catch (error) {
    user.passwordResetToken = previousReset.token;
    user.passwordResetExpires = previousReset.expires;
    user.passwordResetAttempts = previousReset.attempts;
    user.passwordResetLastSentAt = previousReset.lastSentAt;
    await user.save({ validateBeforeSave: false }).catch(() => {});
    throw error;
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const role = String(req.body.role || '').toLowerCase().trim();
    if (!EMAIL_PATTERN.test(email) || !['admin', 'cashier'].includes(role)) {
      return res.status(400).json({ success: false, message: 'A valid email and account type are required' });
    }

    const user = await User.findOne({ email, role }).select(
      '+passwordResetToken +passwordResetExpires +passwordResetAttempts +passwordResetLastSentAt'
    );
    const genericMessage = 'If that account exists, a password reset code has been sent to its email.';
    if (!user) {
      console.warn(`[Auth] Password reset account mismatch: role=${role}, email=${maskEmail(email)}`);
      return res.status(200).json({ success: true, message: genericMessage });
    }

    if (user.passwordResetLastSentAt &&
        Date.now() - user.passwordResetLastSentAt.getTime() < PASSWORD_RESET_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting another reset code.' });
    }

    await issuePasswordResetCode(user);
    console.info(`[Auth] Password reset email sent: role=${role}, email=${maskEmail(email)}`);
    return res.status(200).json({ success: true, message: genericMessage });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const role = String(req.body.role || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!EMAIL_PATTERN.test(email) || !['admin', 'cashier'].includes(role) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Email, account type, and a valid 6-digit code are required' });
    }
    if (newPassword.length > 128 || !STRONG_PASSWORD.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    const user = await User.findOne({ email, role }).select(
      '+passwordResetToken +passwordResetExpires +passwordResetAttempts'
    );
    if (!user || !user.passwordResetToken || !user.passwordResetExpires ||
        user.passwordResetExpires <= new Date()) {
      return res.status(400).json({ success: false, message: 'Reset code is invalid or expired' });
    }

    const expected = Buffer.from(user.passwordResetToken, 'hex');
    const received = Buffer.from(hashVerificationCode(code), 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      if (user.passwordResetAttempts >= MAX_PASSWORD_RESET_ATTEMPTS) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: user.passwordResetAttempts >= MAX_PASSWORD_RESET_ATTEMPTS
          ? 'Too many incorrect codes. Request a new reset code.'
          : 'Reset code is invalid or expired'
      });
    }

    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must be different from your current password' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'This login is for admin accounts only' });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before signing in'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: generateToken(user._id),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  let user;
  try {
    const { name, email, phoneNumber, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(String(phoneNumber || ''));

    if (!name || !normalizedEmail || !normalizedPhone || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone number, and password are required' });
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (String(name).trim().length < 2 || String(name).trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid phone number (7 to 15 digits)' });
    }
    if (password.length > 128 || !STRONG_PASSWORD.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: existingUser.isEmailVerified ? 'EMAIL_IN_USE' : 'EMAIL_NOT_VERIFIED',
        message: existingUser.isEmailVerified
          ? 'An account already exists with this email'
          : 'This email is already registered but not verified. Request a new code.'
      });
    }

    user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      password,
      role: 'admin',
      isEmailVerified: false
    });

    await issueVerificationCode(user);
    res.status(201).json({
      success: true,
      message: 'Account created. Check your email for the verification code.',
      email: user.email
    });
  } catch (error) {
    if (user && !user.isEmailVerified) {
      await User.deleteOne({ _id: user._id }).catch(() => {});
    }
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Email and a valid 6-digit code are required' });
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationToken +emailVerificationExpires +emailVerificationAttempts'
    );

    if (!user || user.isEmailVerified || !user.emailVerificationToken ||
        !user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code is invalid or expired' });
    }

    const expected = Buffer.from(user.emailVerificationToken, 'hex');
    const received = Buffer.from(hashVerificationCode(code), 'hex');
    if (!crypto.timingSafeEqual(expected, received)) {
      user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
      if (user.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: user.emailVerificationAttempts >= MAX_VERIFICATION_ATTEMPTS
          ? 'Too many incorrect codes. Request a new verification code.'
          : 'Verification code is invalid or expired'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token: generateToken(user._id),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email }).select('+emailVerificationLastSentAt');
    if (!user || user.isEmailVerified) {
      return res.status(200).json({ success: true, message: 'If the account is pending, a new code has been sent.' });
    }

    if (user.emailVerificationLastSentAt &&
        Date.now() - user.emailVerificationLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting another code.' });
    }

    await issueVerificationCode(user);
    res.status(200).json({
      success: true,
      message: 'A new verification code was sent to your email.'
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length > 128 || !STRONG_PASSWORD.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  changePassword
};
