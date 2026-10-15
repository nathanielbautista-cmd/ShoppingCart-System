const nodemailer = require('nodemailer');

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendVerificationEmail = async ({ email, name, code }) => {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error('Email service is not configured. Add valid SMTP settings to backend/.env');
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify your iCart admin account',
    text: `Hi ${name}, your iCart verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your iCart admin verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes.</p>`
  });

};

const sendPasswordResetEmail = async ({ email, name, code, role }) => {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error('Email service is not configured. Add valid SMTP settings to backend/.env');
  }

  const accountType = role === 'cashier' ? 'cashier' : 'admin';
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Reset your iCart password',
    text: `Hi ${name}, your iCart ${accountType} password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your iCart ${accountType} password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>`
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
