const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { CART_STATUS } = require('../config/constants');





const generateTransactionId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomSuffix}`;
};






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

    cart.status = CART_STATUS.WAITING_FOR_CASHIER;
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
  try {
    const { cartId } = req.params;
    const { paymentMethod = 'CASH', discount = 0, cashierId = 'SYSTEM', cashierNotes = '', amountReceived } = req.body;

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
        message: 'Cannot checkout with an empty cart'
      });
    }

    if (cart.status === CART_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'This cart has already been checked out and completed'
      });
    }


    const subtotal = cart.subtotal;
    const appliedDiscount = Number(discount) > 0 ? Number(discount) : 0;
    const finalTotal = Math.max(0, Number((subtotal - appliedDiscount).toFixed(2)));
    const paidAmount = paymentMethod.toUpperCase() === 'CASH'
      ? Number(amountReceived)
      : finalTotal;

    if (!Number.isFinite(paidAmount) || paidAmount < finalTotal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient payment. Amount received must be at least ${finalTotal.toFixed(2)}`
      });
    }
    const change = Number((paidAmount - finalTotal).toFixed(2));


    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product "${item.name}" (barcode: ${item.barcode}) no longer exists in database`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for "${product.name}". Available stock: ${product.stock}, required: ${item.quantity}`
        });
      }
    }


    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
    }



    try {
      await Transaction.collection.dropIndex('transactionCode_1');
      console.log('Dropped stale index transactionCode_1');
    } catch (idxErr) {

    }

    const transactionId = generateTransactionId();
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


    cart.status = CART_STATUS.COMPLETED;
    await cart.save();

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
