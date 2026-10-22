const bcrypt = require('bcryptjs');
const { createSqliteModel } = require('./sqliteModel');

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const HIDDEN_FIELDS = [
  'password',
  'emailVerificationToken',
  'emailVerificationExpires',
  'emailVerificationAttempts',
  'emailVerificationLastSentAt',
  'passwordResetToken',
  'passwordResetExpires',
  'passwordResetAttempts',
  'passwordResetLastSentAt'
];

module.exports = createSqliteModel({
  collection: 'users',
  uniqueFields: ['email'],
  hiddenFields: HIDDEN_FIELDS,
  defaults: {
    role: 'admin',
    isEmailVerified: false,
    emailVerificationAttempts: 0,
    passwordResetAttempts: 0
  },
  async prepare(user, { original, isNew }) {
    user.email = String(user.email || '').toLowerCase().trim();
    const passwordChanged = user.password && (isNew || user.password !== original.password);
    if (passwordChanged && !/^\$2[aby]\$/.test(user.password)) user.password = await bcrypt.hash(user.password, 10);
  },
  validate(user, options = {}) {
    if (options.validateBeforeSave === false) return;
    if (!user.name || String(user.name).trim().length > 100) throw new Error('Please provide a valid name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || '')) throw new Error('Please provide a valid email address');
    if (!/^\+?[0-9]{7,15}$/.test(user.phoneNumber || '')) throw new Error('Please provide a valid phone number');
    if (!['admin', 'cashier'].includes(user.role)) throw new Error('Invalid user role');
    if (!/^\$2[aby]\$/.test(user.password || '') && !STRONG_PASSWORD.test(user.password || '')) {
      throw new Error('Password must include uppercase, lowercase, number, and special character');
    }
  },
  methods: {
    async matchPassword(enteredPassword) {
      return bcrypt.compare(enteredPassword, this.password || '');
    }
  }
});
