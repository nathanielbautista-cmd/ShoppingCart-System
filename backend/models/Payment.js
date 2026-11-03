const { createSqliteModel } = require('./sqliteModel');

module.exports = createSqliteModel({
  collection: 'payments',
  uniqueFields: ['paymentId', 'providerPaymentId', 'reference'],
  defaults: {
    provider: 'QRPH',
    providerMode: 'mock',
    currency: 'PHP',
    status: 'PENDING',
    qrPayload: '',
    qrImage: '',
    transactionId: null,
    invoiceNumber: null,
    paidAt: null,
    failureReason: '',
    rawProviderStatus: '',
  },
  validate(payment) {
    if (!payment.paymentId) throw new Error('Payment ID is required');
    if (!payment.cartId) throw new Error('Cart ID is required');
    if (!payment.reference) throw new Error('Payment reference is required');
    if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
  },
});
