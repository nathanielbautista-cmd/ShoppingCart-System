const mongoose = require('mongoose');
const { CART_STATUS, WEIGHT_STATUS } = require('../config/constants');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    barcode: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      default: 1
    },

    expectedWeight: {
      type: Number,
      required: true,
      min: 0
    },

    verifiedWeight: {
      type: Number,
      default: 0,
      min: 0
    },
    weightStatus: {
      type: String,
      enum: Object.values(WEIGHT_STATUS),
      default: WEIGHT_STATUS.PENDING
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

const cartSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      required: [true, 'Please provide a unique cart ID'],
      unique: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(CART_STATUS),
      default: CART_STATUS.ACTIVE
    },
    budget: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    items: [cartItemSchema],

    hasWeightAnomaly: {
      type: Boolean,
      default: false
    },
    anomalyNote: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);


cartSchema.methods.recalculateTotals = function () {
  this.subtotal = Number(
    this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
  );
  this.total = this.subtotal;
  return this;
};

module.exports = mongoose.model('Cart', cartSchema);
