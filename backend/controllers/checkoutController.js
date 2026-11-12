const Transaction = require('../models/Transaction');

const getTransactions = async (req, res, next) => {
  try {
    const { cartId, paymentMethod, limit = 50 } = req.query;
    const query = {};

    if (cartId) query.cartId = cartId.trim().toUpperCase();
    if (paymentMethod) query.paymentMethod = paymentMethod.trim().toUpperCase();

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

const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let transaction = await Transaction.findOne({ transactionId: id });
    if (!transaction) transaction = await Transaction.findById(id).catch(() => null);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: `Transaction "${id}" not found`
      });
    }

    return res.status(200).json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTransactions, getTransactionById };
