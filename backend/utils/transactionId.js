const { randomUUID } = require('crypto');

const generateTransactionId = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TXN-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
};

module.exports = { generateTransactionId };
