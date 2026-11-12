const path = require('path');
const { spawn } = require('child_process');

const LINE_WIDTH = 32;
const activePrints = new Set();

const printerEnabled = () => ['1', 'true', 'yes', 'on'].includes(
  String(process.env.RECEIPT_PRINTER_ENABLED || '').trim().toLowerCase()
);

const printable = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const money = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const wrapText = (value, width = LINE_WIDTH) => {
  const text = printable(value);
  if (!text) return [''];
  const lines = [];
  let remainder = text;
  while (remainder.length > width) {
    let splitAt = remainder.lastIndexOf(' ', width);
    if (splitAt <= 0) splitAt = width;
    lines.push(remainder.slice(0, splitAt).trimEnd());
    remainder = remainder.slice(splitAt).trimStart();
  }
  lines.push(remainder);
  return lines;
};

const columns = (left, right, width = LINE_WIDTH) => {
  const safeLeft = printable(left);
  const safeRight = printable(right);
  const available = Math.max(1, width - safeRight.length - 1);
  return `${safeLeft.slice(0, available).padEnd(available)} ${safeRight.slice(-Math.max(0, width - available - 1))}`;
};

const buildReceipt = (transaction, { storeName = 'Metro Supermarket' } = {}) => {
  const lines = [];
  lines.push(...wrapText(storeName.toUpperCase()));
  lines.push('PAYMENT RECEIPT');
  lines.push('-'.repeat(LINE_WIDTH));
  lines.push(...wrapText(`Transaction: ${transaction.transactionId}`));
  lines.push(...wrapText(`Cart: ${transaction.cartId}`));
  lines.push(...wrapText(`Date: ${new Date(transaction.paidAt || Date.now()).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`));
  lines.push('Payment: QR PH - PAID');
  lines.push('-'.repeat(LINE_WIDTH));

  for (const item of transaction.items || []) {
    lines.push(...wrapText(item.name));
    lines.push(columns(`${item.quantity} x ${money(item.price)}`, money(Number(item.price) * Number(item.quantity))));
  }

  lines.push('-'.repeat(LINE_WIDTH));
  lines.push(columns('TOTAL PAID', money(transaction.total)));
  lines.push('-'.repeat(LINE_WIDTH));
  lines.push('Payment reference:');
  lines.push(...wrapText(transaction.paymentReference || 'Not available'));
  lines.push('');
  lines.push('Thank you for shopping!');
  lines.push('Please keep this receipt.');

  const initialize = Buffer.from([0x1b, 0x40]);
  const center = Buffer.from([0x1b, 0x61, 0x01]);
  const left = Buffer.from([0x1b, 0x61, 0x00]);
  const boldOn = Buffer.from([0x1b, 0x45, 0x01]);
  const boldOff = Buffer.from([0x1b, 0x45, 0x00]);
  const feed = Buffer.from('\n\n\n\n', 'ascii');

  const headerEnd = lines.indexOf('-'.repeat(LINE_WIDTH));
  const header = `${lines.slice(0, headerEnd).join('\n')}\n`;
  const body = `${lines.slice(headerEnd).join('\n')}\n`;
  return Buffer.concat([
    initialize,
    center,
    boldOn,
    Buffer.from(header, 'ascii'),
    boldOff,
    left,
    Buffer.from(body, 'ascii'),
    feed,
  ]);
};

const sendToPrinter = (payload) => new Promise((resolve, reject) => {
  const python = process.env.RECEIPT_PRINTER_PYTHON || 'python3';
  const script = process.env.RECEIPT_PRINTER_SCRIPT || path.join(
    __dirname,
    '..',
    '..',
    'hardware',
    'bp210_printer.py'
  );
  const transport = String(process.env.RECEIPT_PRINTER_TRANSPORT || 'usb').trim().toLowerCase();
  const printerArgs = [script, '--transport', transport];
  if (transport === 'bluetooth') {
    printerArgs.push(
      '--bluetooth-address',
      String(process.env.RECEIPT_PRINTER_BLUETOOTH_ADDRESS || '').trim(),
      '--bluetooth-channel',
      String(process.env.RECEIPT_PRINTER_BLUETOOTH_CHANNEL || '1').trim()
    );
  }
  const child = spawn(python, printerArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errorOutput = '';

  child.stderr.on('data', (chunk) => {
    errorOutput = `${errorOutput}${chunk}`.slice(-2000);
  });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(errorOutput.trim() || `BP210 print process exited with code ${code}`));
  });
  child.stdin.on('error', reject);
  child.stdin.end(payload);
});

const printPaidReceipt = async (transaction, options = {}) => {
  if (!printerEnabled()) return { printed: false, reason: 'disabled' };
  const key = String(transaction?.transactionId || '');
  if (!key) throw new Error('A transaction ID is required to print a receipt');
  if (activePrints.has(key)) return { printed: false, reason: 'in-progress' };

  activePrints.add(key);
  try {
    await sendToPrinter(buildReceipt(transaction, options));
    return { printed: true };
  } finally {
    activePrints.delete(key);
  }
};

module.exports = {
  buildReceipt,
  printPaidReceipt,
  printerEnabled,
};
