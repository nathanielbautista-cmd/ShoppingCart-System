const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createVoidCartItem } = require('../controllers/cashierController');

const ITEM_ID = '507f1f77bcf86cd799439011';
const PRODUCT_ID = '507f191e810c19729de860ea';
const CART_ID = 'TEST-VOID-1';

const makeCart = (overrides = {}) => {
  const item = {
    _id: ITEM_ID,
    productId: PRODUCT_ID,
    barcode: '4800012345678',
    name: 'Test Product',
    price: 25.5,
    quantity: 3,
    subtotal: 76.5,
    expectedWeight: 300,
  };
  const items = [item];
  items.id = (id) => items.find((entry) => String(entry._id) === String(id));
  return {
    _id: '507f1f77bcf86cd799439012',
    cartId: CART_ID,
    status: 'WAITING_FOR_CASHIER',
    pendingTransactionId: 'TXN-TEST-VOID',
    subtotal: 76.5,
    total: 76.5,
    items,
    voidHistory: [],
    ...overrides,
  };
};

const invoke = async ({ cart = makeCart(), body = {}, updatedCart = { ok: true } } = {}) => {
  let updateCall;
  const CartModel = {
    findOne: async () => cart,
    findOneAndUpdate: async (...args) => {
      updateCall = args;
      return updatedCart;
    },
    findById: async () => cart,
  };
  const req = {
    params: { cartId: CART_ID, itemId: ITEM_ID },
    body: {
      requestId: 'request-1',
      quantity: 1,
      reason: 'DUPLICATE_SCAN',
      ...body,
    },
    user: {
      _id: '507f1f77bcf86cd799439013',
      name: 'Test Cashier',
      email: 'cashier@example.com',
    },
  };
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(payload) { response.body = payload; return this; },
  };
  let nextError;
  await createVoidCartItem(CartModel)(req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return { response, updateCall };
};

test('partially voids the selected quantity, recalculates totals, and writes audit data atomically', async () => {
  const { response, updateCall } = await invoke({ body: { quantity: 2 } });
  assert.equal(response.statusCode, 200);
  assert.equal(updateCall[0].status, 'WAITING_FOR_CASHIER');
  assert.equal(updateCall[0].items.$elemMatch.quantity, 3);
  assert.equal(updateCall[1].$set['items.$[line].quantity'], 1);
  assert.equal(updateCall[1].$set['items.$[line].subtotal'], 25.5);
  assert.equal(updateCall[1].$set.subtotal, 25.5);
  assert.equal(updateCall[1].$set.total, 25.5);
  assert.equal(updateCall[1].$push.voidHistory.quantity, 2);
  assert.equal(updateCall[1].$push.voidHistory.cartId, CART_ID);
  assert.equal(updateCall[1].$push.voidHistory.subtotal, 51);
  assert.equal(updateCall[1].$push.voidHistory.cashierUsername, 'Test Cashier');
  assert.equal(updateCall[2].arrayFilters[0]['line._id'], ITEM_ID);
});

test('fully voids only the selected line and never performs an inventory update', async () => {
  const { response, updateCall } = await invoke({ body: { quantity: 3 } });
  assert.equal(response.statusCode, 200);
  assert.equal(String(updateCall[1].$pull.items._id), ITEM_ID);
  assert.equal(updateCall[1].$set.total, 0);
  assert.equal(updateCall[1].$set.subtotal, 0);
  assert.equal(Object.hasOwn(updateCall[1], '$inc'), false);
});

test('rejects voids on a completed cart before attempting an update', async () => {
  const { response, updateCall } = await invoke({ cart: makeCart({ status: 'COMPLETED' }) });
  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /pending and unpaid/i);
  assert.equal(updateCall, undefined);
});

test('rejects a duplicate idempotency request', async () => {
  const cart = makeCart({ voidHistory: [{ requestId: 'request-1' }] });
  const { response, updateCall } = await invoke({ cart });
  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /already been processed/i);
  assert.equal(updateCall, undefined);
});

test('requires a short explanation when Other is selected', async () => {
  const { response, updateCall } = await invoke({ body: { reason: 'OTHER', explanation: '   ' } });
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /requires an explanation/i);
  assert.equal(updateCall, undefined);
});

test('rejects a stale concurrent update without returning a successful void', async () => {
  const { response } = await invoke({ updatedCart: null });
  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /changed while the void/i);
});
