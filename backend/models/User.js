const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
      validate: {
        validator: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(value),
        message: 'Password must include uppercase, lowercase, number, and special character'
      }
    },
    role: {
      type: String,
      enum: ['admin', 'cashier'],
      default: 'admin'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    emailVerificationLastSentAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true
  }
);


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
