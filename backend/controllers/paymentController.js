const crypto = require('crypto');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const { CART_STATUS } = require('../config/constants');
const { generateTransactionId } = require('../utils/transactionId');
const { publishDashboardUpdate } = require('../services/dashboardEventService');
const { createQrPhPayment, verifyWebhookSignature, providerMode } = require('../services/qrPhService');
const { printPaidReceipt, printerEnabled } = require('../services/receiptPrinterService');

const makePaymentId = () => `PAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const makeReference = (cartId) => `ICART-${String(cartId).replace(/[^A-Z0-9]/gi, '').slice(-10)}-${Date.now().toString().slice(-8)}`;
const makeInvoiceNumber = (transactionId) => `INV-${new Date().getFullYear()}-${String(transactionId).replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase()}`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const renderMockCheckout = (payment) => {
  const amount = Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const status = String(payment.status || 'PENDING').toUpperCase();
  const storeName = payment.mockStoreName || 'Metro Supermarket';
  const storeLogo = String(payment.mockStoreLogo || '');
  const logoMarkup = storeLogo
    ? `<img src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)} logo">`
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 9.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L20 8H7M10 19a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const payable = status === 'PENDING';
  const statusCopy = status === 'PAID'
    ? 'Payment successful'
    : status === 'EXPIRED'
      ? 'This payment code has expired'
      : status === 'CANCELLED'
        ? 'This payment was cancelled'
        : status === 'REVIEW_REQUIRED'
          ? 'Payment needs staff review'
          : 'Ready to pay';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <meta name="theme-color" content="#087f5b">
  <title>iCart Pay Simulator</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;color:#15263a;background:linear-gradient(160deg,#e9fff6,#f5f8fb 45%,#e8f0f7);font-family:Inter,Arial,sans-serif}.phone{width:min(100%,410px);overflow:hidden;border:1px solid #d9e4e0;border-radius:26px;background:#fff;box-shadow:0 24px 70px rgba(18,51,43,.2)}header{padding:22px;color:#fff;background:linear-gradient(135deg,#07956b,#056b51)}header strong{display:block;font-size:23px}.content{padding:24px}.merchant{text-align:center}.merchant .logo{display:flex;width:min(180px,65vw);height:80px;margin:0 auto 12px;padding:0;align-items:center;justify-content:center;overflow:hidden;border-radius:12px;color:#087f5b;background:transparent}.merchant .logo img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center}.merchant .logo svg{width:42px;height:42px}.merchant h1{margin:0;font-size:20px}.amount{margin:24px 0;padding:19px;border:1px solid #dfe8e5;border-radius:16px;background:#f7fbfa;text-align:center}.amount small,.amount strong{display:block}.amount small{color:#718094;font-size:11px;font-weight:800;text-transform:uppercase}.amount strong{margin-top:5px;color:#075e48;font-size:34px;letter-spacing:-.04em}.details{display:grid;gap:10px;margin-bottom:22px}.details p{display:flex;justify-content:space-between;gap:14px;margin:0;color:#7a8797;font-size:12px}.details b{min-width:0;color:#273a4f;text-align:right;overflow-wrap:anywhere}.status{margin-bottom:16px;padding:12px;border-radius:11px;color:#126348;background:#e8f8f1;font-size:12px;font-weight:800;text-align:center}.status.error{color:#9d3d32;background:#fff0ee}button{width:100%;min-height:52px;border:0;border-radius:14px;color:#fff;background:linear-gradient(135deg,#0ba879,#087657);box-shadow:0 10px 22px rgba(7,126,91,.24);font-size:15px;font-weight:900;cursor:pointer}button:disabled{cursor:wait;opacity:.6}
  </style>
</head>
<body>
  <main class="phone">
    <header><strong>iCart Pay</strong></header>
    <section class="content">
      <div class="merchant"><span class="logo">${logoMarkup}</span><h1>${escapeHtml(storeName)}</h1></div>
      <div class="amount"><small>Amount to pay</small><strong>PHP ${escapeHtml(amount)}</strong></div>
      <div class="details">
        <p><span>Reference</span><b>${escapeHtml(payment.reference)}</b></p>
        <p><span>Cart</span><b>${escapeHtml(payment.cartId)}</b></p>
        <p><span>Status</span><b id="statusText">${escapeHtml(statusCopy)}</b></p>
      </div>
      <div id="result" class="status${payable || status === 'PAID' ? '' : ' error'}">${escapeHtml(statusCopy)}</div>
      ${payable ? `<button id="payButton" type="button">Pay PHP ${escapeHtml(amount)}</button>` : ''}
    </section>
  </main>
  ${payable ? `<script>
    const button=document.getElementById('payButton');
    const result=document.getElementById('result');
    button.addEventListener('click',async()=>{
      button.disabled=true;button.textContent='Processing payment...';result.textContent='Contacting payment provider...';
      try{
        const response=await fetch(window.location.pathname+'/confirm',{method:'POST',headers:{'Content-Type':'application/json'}});
        const body=await response.json();
        if(!response.ok)throw new Error(body.message||'Payment failed');
        result.classList.remove('error');result.textContent='Payment successful';
        document.getElementById('statusText').textContent='Payment successful';
        button.textContent='Paid successfully';
        window.setTimeout(()=>window.location.reload(),900);
      }catch(error){
        result.classList.add('error');result.textContent=error.message||'Payment failed';
        button.disabled=false;button.textContent='Try payment again';
      }
    });
  </script>` : ''}
</body>
</html>`;
};

const publicPayment = (payment) => ({
  paymentId: payment.paymentId,
  cartId: payment.cartId,
  provider: payment.provider,
  providerMode: payment.providerMode,
  reference: payment.reference,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  qrImage: payment.qrImage,
  paidAt: payment.paidAt,
  transactionId: payment.transactionId,
  invoiceNumber: payment.invoiceNumber,
  failureReason: payment.failureReason,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const releaseCart = async (payment) => {
  await Cart.findOneAndUpdate(
    { cartId: payment.cartId, pendingPaymentId: payment.paymentId, status: CART_STATUS.PAYMENT_PENDING },
    { $set: { status: CART_STATUS.ACTIVE, pendingPaymentId: null } }
  );
};

const ensureReceiptPrinted = async (payment, transaction = null) => {
  if (!printerEnabled()) return;
  const receiptTransaction = transaction || await Transaction.findOne({
    providerPaymentId: payment.providerPaymentId,
  });
  if (!receiptTransaction || receiptTransaction.receiptPrintedAt) return;

  try {
    const result = await printPaidReceipt(receiptTransaction, {
      storeName: payment.mockStoreName || 'Metro Supermarket',
    });
    if (result.printed) {
      await Transaction.findByIdAndUpdate(receiptTransaction._id, {
        $set: { receiptPrintedAt: new Date(), receiptPrintError: '' },
      });
    }
  } catch (error) {
    console.error(`BP210 receipt printing failed for ${receiptTransaction.transactionId}:`, error.message);
    await Transaction.findByIdAndUpdate(receiptTransaction._id, {
      $set: { receiptPrintError: String(error.message || error).slice(0, 500) },
    }).catch(() => {});
  }
};

const finalizePaidPayment = async (payment) => {
  if (payment.status === 'PAID') {
    await ensureReceiptPrinted(payment);
    return payment;
  }

  const claimedPayment = await Payment.findOneAndUpdate(
    { paymentId: payment.paymentId, status: 'PENDING' },
    { $set: { status: 'PROCESSING', rawProviderStatus: 'PAID' } },
    { new: true }
  );
  if (!claimedPayment) {
    const current = await Payment.findOne({ paymentId: payment.paymentId });
    if (current?.status === 'PAID') {
      await ensureReceiptPrinted(current);
      return current;
    }
    throw Object.assign(new Error('Payment is already being processed or is no longer payable.'), { status: 409 });
  }

  const deductedItems = [];
  let claimedCart = null;
  try {
    claimedCart = await Cart.findOneAndUpdate(
      { cartId: claimedPayment.cartId, pendingPaymentId: claimedPayment.paymentId, status: CART_STATUS.PAYMENT_PENDING },
      { $set: { status: CART_STATUS.CHECKOUT } },
      { new: true }
    );
    if (!claimedCart) throw Object.assign(new Error('The cart is no longer locked to this payment.'), { status: 409 });
    if (!claimedCart.items.length) throw Object.assign(new Error('Cannot complete payment for an empty cart.'), { status: 400 });

    const expectedTotal = Number(Number(claimedCart.total).toFixed(2));
    if (Number(claimedPayment.amount) !== expectedTotal) {
      throw Object.assign(new Error('Paid amount does not match the locked cart total.'), { status: 409 });
    }

    for (const item of claimedCart.items) {
      const product = await Product.findById(item.productId);
      if (!product || Number(product.stock) < Number(item.quantity)) {
        throw Object.assign(new Error(`Inventory is no longer available for ${item.name}. Staff assistance is required.`), { status: 409 });
      }
    }

    for (const item of claimedCart.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { new: true });
      deductedItems.push({ productId: item.productId, quantity: item.quantity });
    }

    const transactionId = claimedCart.pendingTransactionId || generateTransactionId();
    const invoiceNumber = makeInvoiceNumber(transactionId);
    const existing = await Transaction.findOne({ providerPaymentId: claimedPayment.providerPaymentId });
    const transaction = existing || await Transaction.create({
      transactionId,
      invoiceNumber,
      invoiceIssuedAt: new Date(),
      cartId: claimedCart.cartId,
      items: claimedCart.items.map((item) => ({
        productId: item.productId,
        barcode: item.barcode,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      voids: [],
      subtotal: expectedTotal,
      discount: 0,
      total: expectedTotal,
      paymentMethod: 'QRPH',
      paymentProvider: claimedPayment.provider,
      providerPaymentId: claimedPayment.providerPaymentId,
      paymentReference: claimedPayment.reference,
      paymentStatus: 'PAID',
      amountReceived: expectedTotal,
      change: 0,
      paidAt: new Date(),
      cashierId: 'QRPH-AUTO',
      cashierNotes: 'Automatically verified through QR Ph payment confirmation.',
    });

    await Cart.findOneAndUpdate(
      { _id: claimedCart._id, status: CART_STATUS.CHECKOUT },
      { $set: { status: CART_STATUS.COMPLETED } }
    );
    claimedCart = null;

    const completedPayment = await Payment.findOneAndUpdate(
      { paymentId: claimedPayment.paymentId, status: 'PROCESSING' },
      { $set: {
        status: 'PAID',
        paidAt: new Date(),
        transactionId: transaction.transactionId,
        invoiceNumber: transaction.invoiceNumber,
        failureReason: '',
      } },
      { new: true }
    );

    await ensureReceiptPrinted(completedPayment, transaction);

    publishDashboardUpdate('qrph-payment-completed', {
      cartId: transaction.cartId,
      transactionId: transaction.transactionId,
      paymentId: completedPayment.paymentId,
    });
    return completedPayment;
  } catch (error) {
    for (const item of deductedItems) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(() => {});
    }
    if (claimedCart) {
      await Cart.findOneAndUpdate(
        { _id: claimedCart._id, status: CART_STATUS.CHECKOUT },
        { $set: { status: CART_STATUS.PAYMENT_PENDING } }
      ).catch(() => {});
    }
    await Payment.findOneAndUpdate(
      { paymentId: claimedPayment.paymentId, status: 'PROCESSING' },
      { $set: { status: 'REVIEW_REQUIRED', failureReason: error.message } }
    ).catch(() => {});
    throw error;
  }
};

const createPayment = async (req, res, next) => {
  try {
    const cartId = String(req.params.cartId || '').trim().toUpperCase();
    const cart = await Cart.findOne({ cartId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
    if (!cart.items.length) return res.status(400).json({ success: false, message: 'Cannot pay for an empty cart.' });
    if (![CART_STATUS.ACTIVE, CART_STATUS.PAYMENT_PENDING].includes(cart.status)) {
      return res.status(409).json({ success: false, message: 'This cart is already being processed.' });
    }

    if (cart.pendingPaymentId) {
      const pending = await Payment.findOne({ paymentId: cart.pendingPaymentId });
      if (pending?.status === 'PENDING') return res.json({ success: true, payment: publicPayment(pending) });
    }

    const amount = Number(Number(cart.total).toFixed(2));
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Cart total must be greater than zero.' });

    const paymentId = makePaymentId();
    const reference = makeReference(cartId);
    const providerPayment = await createQrPhPayment({ paymentId, reference, amount, cartId });
    const requestedBranding = req.body?.branding || {};
    const requestedStoreName = String(requestedBranding.storeName || '').trim().slice(0, 80);
    const requestedStoreLogo = String(requestedBranding.storeLogo || '');
    const safeStoreLogo = /^data:image\/(png|jpeg|webp);base64,/i.test(requestedStoreLogo) && requestedStoreLogo.length <= 1_500_000
      ? requestedStoreLogo
      : '';
    const payment = await Payment.create({
      paymentId,
      cartId,
      amount,
      currency: 'PHP',
      status: 'PENDING',
      mockStoreName: requestedStoreName || 'Metro Supermarket',
      mockStoreLogo: safeStoreLogo,
      ...providerPayment,
    });

    cart.status = CART_STATUS.PAYMENT_PENDING;
    cart.pendingPaymentId = payment.paymentId;
    cart.pendingTransactionId = cart.pendingTransactionId || generateTransactionId();
    await cart.save();
    publishDashboardUpdate('qrph-payment-created', { cartId, paymentId });

    res.status(201).json({ success: true, payment: publicPayment(payment) });
  } catch (error) {
    next(error);
  }
};

const getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (payment.status === 'PAID') await ensureReceiptPrinted(payment);
    res.json({ success: true, payment: publicPayment(payment) });
  } catch (error) {
    next(error);
  }
};

const mockCheckout = async (req, res, next) => {
  try {
    if (providerMode() !== 'mock') {
      return res.status(404).send('Payment simulator is unavailable.');
    }
    const payment = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!payment) return res.status(404).send('Payment not found.');
    res.set('Cache-Control', 'no-store');
    return res.status(200).type('html').send(renderMockCheckout(payment));
  } catch (error) {
    next(error);
  }
};

const cancelPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { paymentId: req.params.paymentId, status: 'PENDING' },
      { $set: { status: 'CANCELLED', failureReason: 'Cancelled by customer.' } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ success: false, message: 'Only pending payments can be cancelled.' });
    await releaseCart(payment);
    res.json({ success: true, payment: publicPayment(payment) });
  } catch (error) {
    next(error);
  }
};

const simulateSuccess = async (req, res, next) => {
  try {
    if (providerMode() !== 'mock') {
      return res.status(404).json({ success: false, message: 'Payment simulator is disabled.' });
    }
    const payment = await Payment.findOne({ paymentId: req.params.paymentId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    const completed = await finalizePaidPayment(payment);
    res.json({ success: true, payment: publicPayment(completed) });
  } catch (error) {
    next(error);
  }
};

const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-qrph-signature'] || req.headers['x-signature'];
    if (!verifyWebhookSignature(req.rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }
    const payload = req.body || {};
    const paymentId = payload.paymentId || payload.metadata?.paymentId;
    const providerPaymentId = payload.providerPaymentId || payload.id;
    const reference = payload.reference;
    const payment = paymentId
      ? await Payment.findOne({ paymentId })
      : providerPaymentId
        ? await Payment.findOne({ providerPaymentId: String(providerPaymentId) })
        : reference
          ? await Payment.findOne({ reference: String(reference) })
          : null;
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    const status = String(payload.status || '').toUpperCase();
    if (['PAID', 'COMPLETED', 'SUCCESS', 'SUCCEEDED'].includes(status)) {
      const completed = await finalizePaidPayment(payment);
      return res.json({ success: true, paymentId: completed.paymentId, status: completed.status });
    }
    if (['FAILED', 'CANCELLED'].includes(status)) {
      const updated = await Payment.findOneAndUpdate(
        { paymentId: payment.paymentId, status: 'PENDING' },
        { $set: { status, rawProviderStatus: status, failureReason: payload.message || `Provider marked payment ${status}.` } },
        { new: true }
      );
      if (updated) await releaseCart(updated);
      return res.json({ success: true, paymentId: payment.paymentId, status: updated?.status || payment.status });
    }
    res.json({ success: true, paymentId: payment.paymentId, status: payment.status });
  } catch (error) {
    next(error);
  }
};

const getPendingPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ status: { $in: ['PENDING', 'PROCESSING', 'REVIEW_REQUIRED'] } }).sort({ createdAt: -1 });
    const rows = await Promise.all(payments.map(async (payment) => ({
        ...publicPayment(payment),
        cart: await Cart.findOne({ cartId: payment.cartId }),
      })));
    res.json({ success: true, count: rows.length, payments: rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPayment,
  mockCheckout,
  cancelPayment,
  simulateSuccess,
  webhook,
  getPendingPayments,
  finalizePaidPayment,
};
