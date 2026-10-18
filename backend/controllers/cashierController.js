const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const { CART_STATUS } = require('../config/constants');
const { generateTransactionId } = require('../utils/transactionId');

const VOID_REASONS = new Set([
  'CUSTOMER_CHANGED_MIND',
  'INCORRECT_PRODUCT',
  'DUPLICATE_SCAN',
  'OTHER'
]);

const createVoidCartItem = (CartModel = Cart) => async (req, res, next) => {
  try {
    const cartId = String(req.params.cartId || '').trim().toUpperCase();
    const itemId = String(req.params.itemId || '').trim();
    const requestId = String(req.body.requestId || '').trim();
    const reason = String(req.body.reason || '').trim().toUpperCase();
    const explanation = String(req.body.explanation || '').trim();
    const quantity = Number(req.body.quantity);

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: 'A valid cart line item is required' });
    }
    if (!requestId || requestId.length > 100) {
      return res.status(400).json({ success: false, message: 'A valid request ID is required' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Void quantity must be a positive whole number' });
    }
    if (!VOID_REASONS.has(reason)) {
      return res.status(400).json({ success: false, message: 'Select a valid void reason' });
    }
    if (reason === 'OTHER' && (!explanation || explanation.length > 200)) {
      return res.status(400).json({ success: false, message: 'Other requires an explanation of 200 characters or fewer' });
    }
    if (reason !== 'OTHER' && explanation.length > 200) {
      return res.status(400).json({ success: false, message: 'Explanation cannot exceed 200 characters' });
    }

    const cart = await CartModel.findOne({ cartId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    if (cart.status !== CART_STATUS.WAITING_FOR_CASHIER) {
      return res.status(409).json({ success: false, message: 'Items can only be voided while the cart is pending and unpaid' });
    }
    if ((cart.voidHistory || []).some((entry) => entry.requestId === requestId)) {
      return res.status(409).json({ success: false, message: 'This void request has already been processed' });
    }

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'The selected item does not belong to this cart' });
    if (quantity > item.quantity) {
      return res.status(400).json({ success: false, message: `Only ${item.quantity} unit(s) are available to void` });
    }

    const transactionId = cart.pendingTransactionId || generateTransactionId();
    const voidedSubtotal = Number((item.price * quantity).toFixed(2));
    const remainingQuantity = item.quantity - quantity;
    const unitWeight = item.quantity ? item.expectedWeight / item.quantity : 0;
    const newSubtotal = Number(Math.max(0, cart.subtotal - voidedSubtotal).toFixed(2));
    const audit = {
      requestId,
      transactionId,
      cartId: cart.cartId,
      lineItemId: item._id,
      productId: item.productId,
      barcode: item.barcode,
      productName: item.name,
      quantity,
      unitPrice: item.price,
      subtotal: voidedSubtotal,
      reason,
      explanation: reason === 'OTHER' ? explanation : '',
      cashierId: req.user._id,
      cashierUsername: req.user.name || req.user.email,
      voidedAt: new Date()
    };
    const filter = {
      _id: cart._id,
      status: CART_STATUS.WAITING_FOR_CASHIER,
      'voidHistory.requestId': { $ne: requestId },
      items: { $elemMatch: { _id: item._id, quantity: item.quantity } }
    };
    const update = remainingQuantity === 0
      ? {
          $pull: { items: { _id: item._id } },
          $set: { subtotal: newSubtotal, total: newSubtotal, pendingTransactionId: transactionId },
          $push: { voidHistory: audit }
        }
      : {
          $set: {
            'items.$[line].quantity': remainingQuantity,
            'items.$[line].subtotal': Number((item.price * remainingQuantity).toFixed(2)),
            'items.$[line].expectedWeight': Number((unitWeight * remainingQuantity).toFixed(2)),
            'items.$[line].weightStatus': 'PENDING',
            subtotal: newSubtotal,
            total: newSubtotal,
            pendingTransactionId: transactionId
          },
          $push: { voidHistory: audit }
        };
    const options = { new: true, runValidators: true };
    if (remainingQuantity > 0) options.arrayFilters = [{ 'line._id': item._id }];
    const updatedCart = await CartModel.findOneAndUpdate(filter, update, options);

    if (!updatedCart) {
      const latest = await CartModel.findById(cart._id);
      if ((latest?.voidHistory || []).some((entry) => entry.requestId === requestId)) {
        return res.status(409).json({ success: false, message: 'This void request has already been processed' });
      }
      return res.status(409).json({ success: false, message: 'The cart changed while the void was being processed. Refresh and try again.' });
    }

    return res.status(200).json({
      success: true,
      message: `${quantity} × ${item.name} voided. Remind the customer to remove the physical item from the basket.`,
      void: audit,
      cart: updatedCart
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { VOID_REASONS, createVoidCartItem, voidCartItem: createVoidCartItem() };
