const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    barcode: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const transactionVoidSchema = new mongoose.Schema(
  {
    lineItemId: mongoose.Schema.Types.ObjectId,
    cartId: String,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    barcode: String,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    subtotal: Number,
    reason: String,
    explanation: String,
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierUsername: String,
    voidedAt: Date
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    cartId: {
      type: String,
      required: true,
      index: true
    },
    items: [transactionItemSchema],
    voids: [transactionVoidSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'GCASH', 'CARD', 'ONLINE'],
      default: 'CASH'
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'CANCELLED'],
      default: 'PAID'
    },
    amountReceived: {
      type: Number,
      default: 0,
      min: 0
    },
    change: {
      type: Number,
      default: 0,
      min: 0
    },
    cashierId: {
      type: String,
      default: 'SYSTEM'
    },
    cashierNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
