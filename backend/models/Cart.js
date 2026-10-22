const { createSqliteModel, createId } = require('./sqliteModel');
const { CART_STATUS } = require('../config/constants');

const attachCartArrays = (cart) => {
  if (!Array.isArray(cart.items)) cart.items = [];
  if (!Array.isArray(cart.voidHistory)) cart.voidHistory = [];
  for (const item of cart.items) {
    if (!item._id) item._id = createId();
    if (!item.createdAt) item.createdAt = new Date();
    if (!item.updatedAt) item.updatedAt = new Date();
  }
  for (const entry of cart.voidHistory) if (!entry._id) entry._id = createId();
  Object.defineProperty(cart.items, 'id', {
    value: (id) => cart.items.find((entry) => String(entry._id) === String(id)),
    configurable: true,
    enumerable: false
  });
};

module.exports = createSqliteModel({
  collection: 'carts',
  uniqueFields: ['cartId'],
  defaults: {
    status: CART_STATUS.ACTIVE,
    pendingTransactionId: null,
    budget: 0,
    subtotal: 0,
    total: 0,
    items: [],
    voidHistory: [],
    hasWeightAnomaly: false,
    anomalyNote: ''
  },
  attach: attachCartArrays,
  validate(cart) {
    if (!cart.cartId || !String(cart.cartId).trim()) throw new Error('Please provide a unique cart ID');
    if (!Object.values(CART_STATUS).includes(cart.status)) throw new Error('Invalid cart status');
    if (Number(cart.budget) < 0 || Number(cart.subtotal) < 0 || Number(cart.total) < 0) throw new Error('Cart totals cannot be negative');
  },
  methods: {
    recalculateTotals() {
      this.subtotal = Number(this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
      this.total = this.subtotal;
      return this;
    }
  }
});
