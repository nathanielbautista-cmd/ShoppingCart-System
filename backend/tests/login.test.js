const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const User = require('../models/User');
const { login } = require('../controllers/authController');

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
