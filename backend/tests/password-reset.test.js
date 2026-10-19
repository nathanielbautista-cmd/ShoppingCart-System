const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const User = require('../models/User');
const { forgotPassword, resetPassword } = require('../controllers/authController');

const originalFindOne = User.findOne;

afterEach(() => {
  User.findOne = originalFindOne;
});

const missingUserQuery = () => ({
  select: async () => null
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

test('forgot password returns User not found for an unknown cashier', async () => {
  User.findOne = missingUserQuery;
  const response = responseRecorder();

  await forgotPassword(
    { body: { email: 'missing@example.com', role: 'cashier' } },
    response,
    (error) => { throw error; }
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { success: false, message: 'User not found' });
});

test('reset password returns User not found for an unknown cashier', async () => {
  User.findOne = missingUserQuery;
  const response = responseRecorder();

  await resetPassword(
    {
      body: {
        email: 'missing@example.com',
        role: 'cashier',
        code: '123456',
        newPassword: 'StrongPassword1!'
      }
    },
    response,
    (error) => { throw error; }
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { success: false, message: 'User not found' });
});
