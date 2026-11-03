const assert = require('node:assert/strict');
const http = require('node:http');
const { afterEach, test } = require('node:test');
const express = require('express');
const User = require('../models/User');
const { login } = require('../controllers/authController');
const cashierRoutes = require('../routes/cashierRoutes');

const originalFindOne = User.findOne;

afterEach(() => {
  User.findOne = originalFindOne;
});

const responseRecorder = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('admin login returns User not found when the account does not exist', async () => {
  User.findOne = async () => null;
  const response = responseRecorder();

  await login(
    { body: { email: 'missing@example.com', password: 'Password1!' } },
    response,
    (error) => { throw error; }
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { success: false, message: 'User not found' });
});

test('cashier login returns User not found when the account does not exist', async () => {
  User.findOne = async () => null;
  const app = express();
  app.use(express.json());
  app.use('/cashier', cashierRoutes);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/cashier/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'Password1!' })
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { success: false, message: 'User not found' });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
