const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const {
  getEmailProvider,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../services/emailService');

const originalFetch = global.fetch;
const emailEnvironmentKeys = [
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
  'GMAIL_USER',
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

test('uses the Gmail API before Resend and sends from the configured Gmail account', async () => {
  process.env.GMAIL_CLIENT_ID = 'client-id';
  process.env.GMAIL_CLIENT_SECRET = 'client-secret';
  process.env.GMAIL_REFRESH_TOKEN = 'refresh-token';
  process.env.GMAIL_USER = 'sender@gmail.com';
  process.env.RESEND_API_KEY = 're_fallback_key';
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'gmail-access-token', expires_in: 3600 })
      };
    }
    return { ok: true, status: 200, json: async () => ({ id: 'message-id' }) };
  };

  await sendVerificationEmail({
    email: 'cashier@example.com',
    name: '<b>Cashier</b>',
    code: '135790'
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(requests[0].options.body.get('grant_type'), 'refresh_token');
  assert.equal(requests[0].options.body.get('refresh_token'), 'refresh-token');
  assert.equal(requests[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(requests[1].options.headers.Authorization, 'Bearer gmail-access-token');
  const sendBody = JSON.parse(requests[1].options.body);
  const mime = Buffer.from(sendBody.raw, 'base64url').toString('utf8');
  assert.match(mime, /From: iCart <sender@gmail\.com>/);
  assert.match(mime, /To: cashier@example\.com/);
  assert.match(mime, /135790/);
  assert.match(mime, /&lt;b&gt;Cashier&lt;\/b&gt;/);
  assert.equal(getEmailProvider(), 'gmail-api');
});

test('rejects a partial Gmail API configuration instead of silently using a fallback', async () => {
  process.env.GMAIL_CLIENT_ID = 'client-id';
  process.env.RESEND_API_KEY = 're_fallback_key';

  await assert.rejects(
    sendVerificationEmail({ email: 'owner@example.com', name: 'Test User', code: '123456' }),
    /Gmail API is partially configured.*GMAIL_CLIENT_SECRET.*GMAIL_REFRESH_TOKEN.*GMAIL_USER/
  );
  assert.equal(getEmailProvider(), 'gmail-api-incomplete');
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
    /Gmail API, Resend API, or valid SMTP settings/
  );
});

test('reports which email provider is configured without exposing credentials', () => {
  for (const key of emailEnvironmentKeys) delete process.env[key];
  assert.equal(getEmailProvider(), 'not-configured');

  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'user@example.com';
  process.env.SMTP_PASS = 'secret';
  assert.equal(getEmailProvider(), 'smtp');

  process.env.RESEND_API_KEY = 're_secret';
  assert.equal(getEmailProvider(), 'resend');

  process.env.GMAIL_CLIENT_ID = 'client-id';
  assert.equal(getEmailProvider(), 'gmail-api-incomplete');

  process.env.GMAIL_CLIENT_SECRET = 'client-secret';
  process.env.GMAIL_REFRESH_TOKEN = 'refresh-token';
  process.env.GMAIL_USER = 'sender@gmail.com';
  assert.equal(getEmailProvider(), 'gmail-api');
});
