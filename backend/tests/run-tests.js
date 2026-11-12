require('dotenv').config();


const server = require('../server');
const { closeDB } = require('../config/db');

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('Waiting 1.5s for server & DB to be ready...');
  await wait(1500);


  try {
    const r = await fetchJson('/health');
    if (r.status !== 200) throw new Error('Health endpoint did not return 200');
    const s = (r.body && (r.body.status || r.body.system)) ? true : false;
    if (!s) throw new Error('Unexpected health response structure');
    console.log('[PASS] Test 1 — Server health');
  } catch (e) {
    console.error('[FAIL] Test 1 — Server health:', e.message);
    failures++;
  }


  let productsResp;
  let testBarcode;
  try {
    productsResp = await fetchJson('/products');
    if (productsResp.status !== 200) throw new Error('Products endpoint did not return 200');
    const count = productsResp.body && (productsResp.body.count || (productsResp.body.products && productsResp.body.products.length));
    if (!count || count < 1) throw new Error('No sample products returned');
    const testProduct = productsResp.body.products.find((product) => product.isActive !== false && product.stock >= 2);
    if (!testProduct) throw new Error('No active product with enough stock is available for the cart tests');
    testBarcode = testProduct.barcode;
    console.log('[PASS] Test 2 — Products list');
  } catch (e) {
    console.error('[FAIL] Test 2 — Products list:', e.message);
    failures++;
  }


  try {
    const r = await fetchJson(`/products/barcode/${encodeURIComponent(testBarcode)}`);
    if (r.status !== 200) throw new Error('Barcode lookup did not return 200');
    const product = r.body && (r.body.product || r.body);
    const barcode = product && (product.barcode || product.product && product.product.barcode);
    if (!barcode || barcode !== testBarcode) throw new Error('Matching product not returned');
    console.log('[PASS] Test 3 — Barcode search');
  } catch (e) {
    console.error('[FAIL] Test 3 — Barcode search:', e.message);
    failures++;
  }


  const CART_ID = 'TEST-001';
  try {
    const r = await fetchJson('/cart', { method: 'POST', body: JSON.stringify({ cartId: CART_ID }) });
    if (![200,201].includes(r.status)) throw new Error('Create cart did not return 200/201');
    if (!(r.body && (r.body.cart || r.body))) throw new Error('Cart object not returned');
    console.log('[PASS] Test 4 — Create cart');
  } catch (e) {
    console.error('[FAIL] Test 4 — Create cart:', e.message);
    failures++;
  }


  let addedItemId = null;
  try {
    const r = await fetchJson(`/cart/${CART_ID}/items`, { method: 'POST', body: JSON.stringify({ barcode: testBarcode, quantity: 1 }) });
    if (r.status !== 200) throw new Error('Add item did not return 200');
    const cart = r.body && (r.body.cart || r.body);
    const item = cart && cart.items && cart.items.find(i => i.barcode === testBarcode);
    if (!item) throw new Error('Product was not added to cart');
    addedItemId = item._id || item.id || item.productId || item.barcode;
    console.log('[PASS] Test 5 — Add product to cart');
  } catch (e) {
    console.error('[FAIL] Test 5 — Add product to cart:', e.message);
    failures++;
  }


  try {
    if (!addedItemId) throw new Error('No itemId available from previous step');
    const r = await fetchJson(`/cart/${CART_ID}/items/${addedItemId}`, { method: 'PUT', body: JSON.stringify({ quantity: 2 }) });
    if (r.status !== 200) throw new Error('Update quantity did not return 200');
    const cart = r.body && (r.body.cart || r.body);
    const item = cart && cart.items && cart.items.find(i => i.barcode === testBarcode);
    if (!item || item.quantity !== 2) throw new Error('Quantity not updated');
    console.log('[PASS] Test 6 — Update quantity');
  } catch (e) {
    console.error('[FAIL] Test 6 — Update quantity:', e.message);
    failures++;
  }


  try {
    if (!addedItemId) throw new Error('No itemId available from previous steps');
    const r = await fetchJson(`/cart/${CART_ID}/items/${addedItemId}`, { method: 'DELETE' });
    if (r.status !== 200) throw new Error('Delete item did not return 200');
    const cart = r.body && (r.body.cart || r.body);
    const item = cart && cart.items && cart.items.find(i => i.barcode === testBarcode);
    if (item) throw new Error('Product still present after removal');
    console.log('[PASS] Test 7 — Remove product');
  } catch (e) {
    console.error('[FAIL] Test 7 — Remove product:', e.message);
    failures++;
  }


  try {
    const r = await fetchJson(`/cart/${CART_ID}/budget`, { method: 'PUT', body: JSON.stringify({ budget: 400 }) });
    if (r.status !== 200) throw new Error('Budget update did not return 200');
    if (!(r.body && (r.body.remainingBudget !== undefined))) throw new Error('Remaining budget not returned');
    console.log('[PASS] Test 8 — Budget update');
  } catch (e) {
    console.error('[FAIL] Test 8 — Budget update:', e.message);
    failures++;
  }


  try {
    await fetchJson(`/cart/${CART_ID}/items`, { method: 'POST', body: JSON.stringify({ barcode: testBarcode, quantity: 1 }) });
  } catch (e) {}


  let paymentId = null;
  try {
    const r = await fetchJson(`/payments/qrph/${CART_ID}`, { method: 'POST', body: '{}' });
    if (r.status !== 201) throw new Error(`QR payment creation returned ${r.status}`);
    paymentId = r.body?.payment?.paymentId;
    if (!paymentId) throw new Error('Payment ID was not returned');
    console.log('[PASS] Test 9 — QR payment creation');
  } catch (e) {
    console.error('[FAIL] Test 9 — QR payment creation:', e.message);
    failures++;
  }


  try {
    if (!paymentId) throw new Error('No payment ID available from previous step');
    const r = await fetchJson(`/payments/${paymentId}/simulate-success`, { method: 'POST', body: '{}' });
    if (r.status !== 200 || r.body?.payment?.status !== 'PAID') throw new Error(`QR payment confirmation returned ${r.status}`);
    const cartGet = await fetchJson(`/cart/${CART_ID}`);
    if (cartGet.body?.cart?.status !== 'COMPLETED') throw new Error('Cart status did not change to COMPLETED');
    console.log('[PASS] Test 10 — QR payment confirmation');
  } catch (e) {
    console.error('[FAIL] Test 10 — QR payment confirmation:', e.message);
    failures++;
  }

  console.log('---');
  if (failures === 0) {
    console.log('ALL TESTS PASSED');
  } else {
    console.error(`${failures} test(s) failed`);
    process.exitCode = 2;
  }
  await new Promise((resolve) => server.httpServer.close(resolve));
  closeDB();
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(3);
});
