const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'icart-qrph-'));
process.env.SQLITE_DB_PATH = path.join(testDirectory, 'payments.db');
process.env.QRPH_PROVIDER = 'mock';
process.env.QRPH_MOCK_CHECKOUT_BASE_URL = 'http://127.0.0.1:5000/api/payments/mock';
// The kiosk runs the backend in production mode even while the explicitly
// configured QR Ph provider is the local mock/demo provider.
process.env.NODE_ENV = 'production';

const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const { closeDB } = require('../config/db');
const { createPayment, mockCheckout, simulateSuccess } = require('../controllers/paymentController');

const invoke = async (handler, { params = {}, body = {}, headers = {} } = {}) => {
  const response = { statusCode: 200, body: null };
  const req = { params, body, headers, rawBody: Buffer.from(JSON.stringify(body)) };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(payload) { response.body = payload; return this; },
    set() { return this; },
    type() { return this; },
    send(payload) { response.body = payload; return this; },
  };
  let nextError;
  await handler(req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return response;
};

after(() => {
  closeDB();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('creates a locked QR Ph payment and finalizes it exactly once', async () => {
  const product = await Product.create({
    barcode: 'QRPH-TEST-001',
    name: 'QR Ph Test Product',
    category: 'Test',
    price: 125.5,
    stock: 5,
    weight: 100,
  });
  const cart = await Cart.create({
    cartId: 'ICART-QRPH-TEST',
    status: 'ACTIVE',
    subtotal: 251,
    total: 251,
    items: [{
      productId: product._id,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: 2,
      subtotal: 251,
      expectedWeight: 200,
    }],
  });

  const logo = 'data:image/png;base64,aUNhcnQ=';
  const created = await invoke(createPayment, {
    params: { cartId: cart.cartId },
    body: { branding: { storeName: 'Metro Test Store', storeLogo: logo } },
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.payment.status, 'PENDING');
  assert.equal(created.body.payment.amount, 251);
  assert.match(created.body.payment.qrImage, /^data:image\/png;base64,/);

  const createdPayment = await Payment.findOne({ paymentId: created.body.payment.paymentId });
  assert.equal(
    createdPayment.qrPayload,
    `http://127.0.0.1:5000/api/payments/mock/${created.body.payment.paymentId}`
  );
  assert.equal(createdPayment.mockStoreName, 'Metro Test Store');
  assert.equal(createdPayment.mockStoreLogo, logo);

  const checkoutPage = await invoke(mockCheckout, { params: { paymentId: created.body.payment.paymentId } });
  assert.equal(checkoutPage.statusCode, 200);
  assert.match(checkoutPage.body, /Metro Test Store/);
  assert.match(checkoutPage.body, /data:image\/png;base64,aUNhcnQ=/);
  assert.doesNotMatch(checkoutPage.body, /NO REAL MONEY|QR Ph test payment|capstone demonstrations/i);

  const lockedCart = await Cart.findOne({ cartId: cart.cartId });
  assert.equal(lockedCart.status, 'PAYMENT_PENDING');
  assert.equal(lockedCart.pendingPaymentId, created.body.payment.paymentId);

  const paid = await invoke(simulateSuccess, { params: { paymentId: created.body.payment.paymentId } });
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.body.payment.status, 'PAID');
  assert.match(paid.body.payment.invoiceNumber, /^INV-/);

  const transaction = await Transaction.findOne({ transactionId: paid.body.payment.transactionId });
  assert.equal(transaction.paymentMethod, 'QRPH');
  assert.equal(transaction.paymentStatus, 'PAID');
  assert.equal(transaction.total, 251);
  assert.equal(transaction.paymentReference, created.body.payment.reference);

  const completedCart = await Cart.findOne({ cartId: cart.cartId });
  const updatedProduct = await Product.findById(product._id);
  assert.equal(completedCart.status, 'COMPLETED');
  assert.equal(updatedProduct.stock, 3);

  const repeated = await invoke(simulateSuccess, { params: { paymentId: created.body.payment.paymentId } });
  assert.equal(repeated.body.payment.status, 'PAID');
  assert.equal(await Transaction.countDocuments({ providerPaymentId: transaction.providerPaymentId }), 1);
  assert.equal((await Product.findById(product._id)).stock, 3);
  assert.equal((await Payment.findOne({ paymentId: created.body.payment.paymentId })).status, 'PAID');
});
