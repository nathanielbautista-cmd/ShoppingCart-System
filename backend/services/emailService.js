const nodemailer = require('nodemailer');

const DEFAULT_EMAIL_TIMEOUT_MS = 10000;

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

const getFromAddress = () => process.env.EMAIL_FROM ||
  (process.env.RESEND_API_KEY ? 'iCart <onboarding@resend.dev>' : process.env.SMTP_USER);

const getEmailProvider = () => {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (getTransporter()) return 'smtp';
  return 'not-configured';
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
    let providerMessage = '';
    try {
      const payload = await response.json();
      providerMessage = payload.message || payload.error?.message || '';
    } catch (_error) {
      // Keep a safe generic message if Resend did not return JSON.
    }

    throw new Error(
      providerMessage
        ? `Email delivery failed: ${providerMessage}`
        : `Email delivery failed (Resend HTTP ${response.status})`
    );
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend({ to, subject, text, html });
  }

  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email service is not configured. Add RESEND_API_KEY or valid SMTP settings.');
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
