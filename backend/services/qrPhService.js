const crypto = require('crypto');
const os = require('os');
const QRCode = require('qrcode');

const providerMode = () => String(process.env.QRPH_PROVIDER || 'mock').trim().toLowerCase();

const createQrImage = (payload) => QRCode.toDataURL(payload, {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 360,
  color: { dark: '#071426', light: '#ffffff' },
});

const getMockCheckoutBaseUrl = () => {
  const configured = String(process.env.QRPH_MOCK_CHECKOUT_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  const addresses = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/(virtualbox|vmware|vethernet|hyper-v|docker|wsl|loopback)/i.test(name))
    .flatMap(([, entries]) => entries || [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
  const privateAddress = addresses.find((address) => (
    address.startsWith('192.168.') ||
    address.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  ));
  const host = privateAddress || addresses[0] || '127.0.0.1';
  const port = Number(process.env.PORT) || 5000;
  return `http://${host}:${port}/api/payments/mock`;
};

const pick = (source, paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const createQrPhPayment = async ({ paymentId, reference, amount, cartId }) => {
  const mode = providerMode();

  if (mode === 'mock') {
    const qrPayload = `${getMockCheckoutBaseUrl()}/${encodeURIComponent(paymentId)}`;
    return {
      provider: 'QRPH-DEMO',
      providerMode: 'mock',
      providerPaymentId: `DEMO-${paymentId}`,
      reference,
      qrPayload,
      qrImage: await createQrImage(qrPayload),
    };
  }

  const endpoint = process.env.QRPH_CREATE_PAYMENT_URL;
  const apiKey = process.env.QRPH_API_KEY;
  if (!endpoint || !apiKey) {
    throw Object.assign(new Error('QR Ph provider is not configured. Add the provider endpoint and API key.'), { status: 503 });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Idempotency-Key': paymentId,
    },
    body: JSON.stringify({
      amount: Number(amount.toFixed(2)),
      currency: 'PHP',
      reference,
      description: `iCart payment for ${cartId}`,
      callbackUrl: process.env.QRPH_WEBHOOK_URL,
      metadata: { paymentId, cartId },
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = pick(body, ['message', 'error.message', 'error']) || `QR Ph provider returned ${response.status}`;
    throw Object.assign(new Error(String(message)), { status: 502 });
  }

  const qrPayload = pick(body, ['qrPayload', 'qrCode', 'qr_code', 'data.qrPayload', 'data.qrCode']);
  const providerPaymentId = pick(body, ['id', 'paymentId', 'data.id', 'data.paymentId']);
  if (!qrPayload || !providerPaymentId) {
    throw Object.assign(new Error('QR Ph provider response is missing the payment ID or QR payload.'), { status: 502 });
  }

  return {
    provider: String(process.env.QRPH_PROVIDER || 'QRPH').toUpperCase(),
    providerMode: 'live',
    providerPaymentId: String(providerPaymentId),
    reference: String(pick(body, ['reference', 'data.reference']) || reference),
    qrPayload: String(qrPayload),
    qrImage: await createQrImage(String(qrPayload)),
  };
};

const verifyWebhookSignature = (rawBody, receivedSignature) => {
  const secret = process.env.QRPH_WEBHOOK_SECRET;
  if (providerMode() === 'mock' && !secret) return true;
  if (!secret || !receivedSignature || !rawBody) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = String(receivedSignature).replace(/^sha256=/i, '').trim();
  if (expected.length !== normalized.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
};

module.exports = { createQrPhPayment, verifyWebhookSignature, providerMode };
