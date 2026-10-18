const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const originalFetch = global.fetch;
const emailEnvironmentKeys = [
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'EMAIL_TIMEOUT_MS',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS'
];
const originalEnvironment = Object.fromEntries(
  emailEnvironmentKeys.map((key) => [key, process.env[key]])
);

afterEach(() => {
  global.fetch = originalFetch;
  for (const key of emailEnvironmentKeys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
});

test('sends verification emails through the Resend HTTPS API and escapes names', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'iCart <onboarding@resend.dev>';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  await sendVerificationEmail({
    email: 'owner@example.com',
    name: '<script>alert(1)</script>',
    code: '123456'
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_key');
  const body = JSON.parse(request.options.body);
  assert.equal(body.from, 'iCart <onboarding@resend.dev>');
  assert.deepEqual(body.to, ['owner@example.com']);
  assert.match(body.text, /123456/);
  assert.doesNotMatch(body.html, /<script>/);
  assert.match(body.html, /&lt;script&gt;/);
});

test('includes the safe Resend error message when delivery is rejected', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: 'The testing sender can only email the account owner.' })
  });

  await assert.rejects(
    sendPasswordResetEmail({
      email: 'other@example.com',
      name: 'Test User',
      code: '654321',
      role: 'admin'
    }),
    /testing sender can only email the account owner/i
  );
});

test('fails immediately when neither Resend nor SMTP is configured', async () => {
  for (const key of emailEnvironmentKeys) delete process.env[key];

  await assert.rejects(
    sendVerificationEmail({ email: 'owner@example.com', name: 'Test User', code: '123456' }),
    /RESEND_API_KEY or valid SMTP settings/
  );
});
