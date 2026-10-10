require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { getProductPerformance } = require('../controllers/reportController');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const dateKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/icart');
  const to = dateKey(new Date());
  const from = dateKey(new Date(Date.now() - 89 * DAY_IN_MS));
  let payload;
  let statusCode = 200;

  await getProductPerformance(
    { query: { from, to, fastThreshold: '1', slowThreshold: '0.25', minimumHistoryDays: '14' } },
    {
      status(code) { statusCode = code; return this; },
      json(value) { payload = value; }
    },
    (error) => { throw error; }
  );

  const start = new Date(`${from}T00:00:00+08:00`);
  const end = new Date(`${to}T23:59:59.999+08:00`);
  const [activeProducts, paidTransactionsInRange] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Transaction.countDocuments({ paymentStatus: 'PAID', createdAt: { $gte: start, $lte: end } })
  ]);
  const classifiedProducts = payload.summary.fastMoving
    + payload.summary.slowMoving
    + payload.summary.noSales
    + payload.summary.moderate
    + payload.summary.insufficientHistory;

  if (statusCode !== 200) throw new Error(`Expected HTTP 200, received ${statusCode}`);
  if (payload.period.days !== 90) throw new Error(`Expected a 90-day report, received ${payload.period.days} days`);
  if (payload.products.length !== activeProducts) throw new Error('Report does not contain every active database product');
  if (classifiedProducts !== activeProducts) throw new Error('Classification summary does not match active product total');
  if (payload.products.some((product) => product.unitsSold < 0 || product.salesRevenue < 0 || product.currentStock < 0)) {
    throw new Error('Report contains an invalid negative quantity');
  }

  console.log('Actual database product performance: PASS');
  console.log(JSON.stringify({ from, to, paidTransactionsInRange, activeProducts, summary: payload.summary }));
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
