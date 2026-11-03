const { createSqliteModel } = require('./sqliteModel');

module.exports = createSqliteModel({
  collection: 'transactions',
  uniqueFields: ['transactionId', 'invoiceNumber', 'providerPaymentId'],
  defaults: {
    items: [],
    voids: [],
    discount: 0,
    paymentMethod: 'CASH',
    paymentProvider: '',
    providerPaymentId: null,
    paymentReference: '',
    paymentStatus: 'PAID',
    amountReceived: 0,
    change: 0,
    cashierId: 'SYSTEM',
    cashierNotes: '',
    invoiceNumber: null,
    invoiceIssuedAt: null,
    paidAt: null,
    receiptPrintedAt: null,
    receiptPrintError: ''
  },
  validate(transaction) {
    if (!transaction.transactionId) throw new Error('Transaction ID is required');
    if (!transaction.cartId) throw new Error('Cart ID is required');
    if (Number(transaction.subtotal) < 0 || Number(transaction.total) < 0) throw new Error('Transaction totals cannot be negative');
  }
});
