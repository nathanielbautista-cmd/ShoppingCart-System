const nodemailer = require('nodemailer');

const DEFAULT_EMAIL_TIMEOUT_MS = 10000;
const GMAIL_ENV_KEYS = [
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
  'GMAIL_USER'
];

const getEmailTimeout = () => {
  const configuredTimeout = Number(process.env.EMAIL_TIMEOUT_MS);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_EMAIL_TIMEOUT_MS;
};

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  const timeout = getEmailTimeout();
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout
  });
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sanitizeHeader = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();

const getGmailConfig = () => {
  const values = Object.fromEntries(GMAIL_ENV_KEYS.map((key) => [key, process.env[key]]));
  const configuredKeys = GMAIL_ENV_KEYS.filter((key) => values[key]);

  if (configuredKeys.length === 0) return null;
  if (configuredKeys.length !== GMAIL_ENV_KEYS.length) {
    const missingKeys = GMAIL_ENV_KEYS.filter((key) => !values[key]);
    throw new Error(`Gmail API is partially configured. Missing: ${missingKeys.join(', ')}`);
  }

  return {
    clientId: values.GMAIL_CLIENT_ID,
    clientSecret: values.GMAIL_CLIENT_SECRET,
    refreshToken: values.GMAIL_REFRESH_TOKEN,
    user: values.GMAIL_USER
  };
};

const getFromAddress = () => process.env.EMAIL_FROM ||
  (process.env.RESEND_API_KEY ? 'iCart <onboarding@resend.dev>' : process.env.SMTP_USER);

const getEmailProvider = () => {
  try {
    if (getGmailConfig()) return 'gmail-api';
  } catch (_error) {
    return 'gmail-api-incomplete';
  }
  if (process.env.RESEND_API_KEY) return 'resend';
  if (getTransporter()) return 'smtp';
  return 'not-configured';
};

const readProviderError = async (response) => {
  try {
    const payload = await response.json();
    return payload.error?.message || payload.message || payload.error_description || '';
  } catch (_error) {
    return '';
  }
};

const encodeBase64Url = (value) => Buffer.from(value, 'utf8')
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const createMimeMessage = ({ from, to, subject, text, html }) => {
  const boundary = `icart_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    ''
  ].join('\r\n');
};

const sendWithGmailApi = async ({ to, subject, text, html }, gmailConfig) => {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: gmailConfig.clientId,
      client_secret: gmailConfig.clientSecret,
      refresh_token: gmailConfig.refreshToken,
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(getEmailTimeout())
  });

  if (!tokenResponse.ok) {
    const providerMessage = await readProviderError(tokenResponse);
    throw new Error(providerMessage
      ? `Gmail authorization failed: ${providerMessage}`
      : `Gmail authorization failed (HTTP ${tokenResponse.status})`);
  }

  const tokenPayload = await tokenResponse.json();
  if (!tokenPayload.access_token) {
    throw new Error('Gmail authorization failed: Google did not return an access token.');
  }

  const raw = encodeBase64Url(createMimeMessage({
    from: `iCart <${gmailConfig.user}>`,
    to,
    subject,
    text,
    html
  }));
  const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(getEmailTimeout())
  });

  if (!sendResponse.ok) {
    const providerMessage = await readProviderError(sendResponse);
    throw new Error(providerMessage
      ? `Gmail delivery failed: ${providerMessage}`
      : `Gmail delivery failed (HTTP ${sendResponse.status})`);
  }
};

const sendWithResend = async ({ to, subject, text, html }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject,
      text,
      html
    }),
    signal: AbortSignal.timeout(getEmailTimeout())
  });

  if (!response.ok) {
    const providerMessage = await readProviderError(response);

    throw new Error(
      providerMessage
        ? `Email delivery failed: ${providerMessage}`
        : `Email delivery failed (Resend HTTP ${response.status})`
    );
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  const gmailConfig = getGmailConfig();
  if (gmailConfig) {
    return sendWithGmailApi({ to, subject, text, html }, gmailConfig);
  }

  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ to, subject, text, html });
  }

  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email service is not configured. Add Gmail API, Resend API, or valid SMTP settings.');
  }

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html
  });
};

const sendVerificationEmail = async ({ email, name, code }) => {
  await sendEmail({
    to: email,
    subject: 'Verify your iCart admin account',
    text: `Hi ${name}, your iCart verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your iCart admin verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`
  });

};

const sendPasswordResetEmail = async ({ email, name, code, role }) => {
  const accountType = role === 'cashier' ? 'cashier' : 'admin';
  await sendEmail({
    to: email,
    subject: 'Reset your iCart password',
    text: `Hi ${name}, your iCart ${accountType} password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your iCart ${accountType} password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>`
  });
};

module.exports = { getEmailProvider, sendVerificationEmail, sendPasswordResetEmail };
