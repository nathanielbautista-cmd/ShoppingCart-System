const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { CART_STATUS } = require('../config/constants');
const { generateTransactionId } = require('../utils/transactionId');






const requestCashierCheckout = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request checkout for an empty cart'
      });
    }

    if (![CART_STATUS.ACTIVE, CART_STATUS.WAITING_FOR_CASHIER].includes(cart.status)) {
      return res.status(409).json({
        success: false,
        message: 'Only an active, unpaid cart can be submitted to the cashier'
      });
    }

    cart.status = CART_STATUS.WAITING_FOR_CASHIER;
    cart.pendingTransactionId = cart.pendingTransactionId || generateTransactionId();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart submitted to Cashier counter. Please proceed to the cashier station.',
      cart: {
        cartId: cart.cartId,
        status: cart.status,
        total: cart.total,
        itemCount: cart.items.reduce((s, i) => s + i.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};






const processCheckout = async (req, res, next) => {
  let claimedCart = null;
  let previousStatus = null;
  const deductedItems = [];
  try {
    const { cartId } = req.params;
    const { paymentMethod = 'CASH', discount = 0, cashierId = 'SYSTEM', cashierNotes = '', amountReceived } = req.body;
    const normalizedCartId = cartId.trim().toUpperCase();
    const observedCart = await Cart.findOne({ cartId: normalizedCartId });
    if (!observedCart) throw Object.assign(new Error(`Cart with ID "${cartId}" not found`), { status: 404 });
    if (![CART_STATUS.ACTIVE, CART_STATUS.WAITING_FOR_CASHIER].includes(observedCart.status)) {
      throw Object.assign(new Error(
        observedCart.status === CART_STATUS.COMPLETED
          ? 'This cart has already been checked out and completed'
          : 'This cart is already being processed or is not payable'
      ), { status: 409 });
    }

    previousStatus = observedCart.status;
    claimedCart = await Cart.findOneAndUpdate(
      { _id: observedCart._id, status: observedCart.status, updatedAt: observedCart.updatedAt },
      { $set: { status: CART_STATUS.CHECKOUT } },
      { new: true }
    );
    if (!claimedCart) {
      throw Object.assign(new Error('The cart changed while payment was starting. Refresh and try again.'), { status: 409 });
    }
    const cart = claimedCart;
    if (cart.items.length === 0) {
      throw Object.assign(new Error('Cannot checkout with an empty cart'), { status: 400 });
    }


    const subtotal = cart.subtotal;
    const appliedDiscount = Number(discount) > 0 ? Number(discount) : 0;
    const finalTotal = Math.max(0, Number((subtotal - appliedDiscount).toFixed(2)));
    const paidAmount = paymentMethod.toUpperCase() === 'CASH'
      ? Number(amountReceived)
      : finalTotal;

    if (!Number.isFinite(paidAmount) || paidAmount < finalTotal) {
      throw Object.assign(new Error(`Insufficient payment. Amount received must be at least ${finalTotal.toFixed(2)}`), { status: 400 });
    }
    const change = Number((paidAmount - finalTotal).toFixed(2));


    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw Object.assign(new Error(`Product "${item.name}" (barcode: ${item.barcode}) no longer exists in database`), { status: 404 });
      }

      if (product.stock < item.quantity) {
        throw Object.assign(new Error(`Insufficient inventory for "${product.name}". Available stock: ${product.stock}, required: ${item.quantity}`), { status: 400 });
      }
    }


    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      deductedItems.push({ productId: item.productId, quantity: item.quantity });
    }



    try {
      await Transaction.collection.dropIndex('transactionCode_1');
      console.log('Dropped stale index transactionCode_1');
    } catch (idxErr) {

    }

    const transactionId = cart.pendingTransactionId || generateTransactionId();
    const voids = (cart.voidHistory || [])
      .filter((entry) => entry.transactionId === transactionId)
      .map((entry) => ({
        lineItemId: entry.lineItemId,
        cartId: entry.cartId,
        productId: entry.productId,
        barcode: entry.barcode,
        productName: entry.productName,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        subtotal: entry.subtotal,
        reason: entry.reason,
        explanation: entry.explanation,
        cashierId: entry.cashierId,
        cashierUsername: entry.cashierUsername,
        voidedAt: entry.voidedAt
      }));
    const transaction = await Transaction.create({
      transactionId,
      cartId: cart.cartId,
      items: cart.items.map((i) => ({
        productId: i.productId,
        barcode: i.barcode,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        subtotal: i.subtotal
      })),
      voids,
      subtotal,
      discount: appliedDiscount,
      total: finalTotal,
      paymentMethod: paymentMethod.toUpperCase(),
      paymentStatus: 'PAID',
      amountReceived: paidAmount,
      change,
      cashierId,
      cashierNotes
    });


    await Cart.findOneAndUpdate(
      { _id: cart._id, status: CART_STATUS.CHECKOUT },
      { $set: { status: CART_STATUS.COMPLETED } }
    );
    claimedCart = null;

    res.status(200).json({
      success: true,
      message: 'Checkout completed successfully. Inventory has been updated.',
      receipt: {
        transactionId: transaction.transactionId,
        cartId: cart.cartId,
        date: transaction.createdAt,
        items: transaction.items,
        subtotal: transaction.subtotal,
        discount: transaction.discount,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        paymentStatus: transaction.paymentStatus,
        amountReceived: transaction.amountReceived,
        change: transaction.change,
        cashierId: transaction.cashierId
      }
    });
  } catch (error) {
    for (const item of deductedItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(() => {});
    }
    if (claimedCart && previousStatus) {
      await Cart.findOneAndUpdate(
        { _id: claimedCart._id, status: CART_STATUS.CHECKOUT },
        { $set: { status: previousStatus } }
      ).catch(() => {});
    }
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};






const getTransactions = async (req, res, next) => {
  try {
    const { cartId, paymentMethod, limit = 50 } = req.query;
    const query = {};

    if (cartId) {
      query.cartId = cartId.trim().toUpperCase();
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod.trim().toUpperCase();
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    next(error);
  }
};






const getWaitingForCashier = async (req, res, next) => {
  try {
    const waitingCarts = await Cart.find({
      status: CART_STATUS.WAITING_FOR_CASHIER,
      cartId: { $nin: ['ICART-002', 'ICART-003'] }
    });
    res.status(200).json({ success: true, count: waitingCarts.length, carts: waitingCarts });
  } catch (error) {
    next(error);
  }
};






const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let transaction = await Transaction.findOne({ transactionId: id });
    if (!transaction) {
      transaction = await Transaction.findById(id).catch(() => null);
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: `Transaction "${id}" not found`
      });
    }

    res.status(200).json({
      success: true,
      transaction
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestCashierCheckout,
  processCheckout,
  getTransactions,
  getWaitingForCashier,
  getTransactionById
};
