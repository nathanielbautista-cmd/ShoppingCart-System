const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

const products = [
  { _id: 'p1', name: 'Fast Rice', barcode: '1001', category: 'Grains', stock: 4, minimumStock: 5, createdAt: new Date('2026-01-01T00:00:00Z') },
  { _id: 'p2', name: 'Slow Milk', barcode: '1002', category: 'Dairy', stock: 8, minimumStock: 5, createdAt: new Date('2026-01-01T00:00:00Z') },
  { _id: 'p3', name: 'No Sale Bread', barcode: '1003', category: 'Bakery', stock: 9, minimumStock: 5, createdAt: new Date('2026-01-01T00:00:00Z') },
  { _id: 'p4', name: 'New Product', barcode: '1004', category: 'Snacks', stock: 6, minimumStock: 5, createdAt: new Date('2026-10-08T00:00:00Z') },
  { _id: 'p5', name: 'Moderate Juice', barcode: '1005', category: 'Drinks', stock: 7, minimumStock: 5, createdAt: new Date('2026-01-01T00:00:00Z') }
];

Product.find = () => ({
  sort: () => ({
    select: () => ({ lean: async () => products })
  })
});

let aggregateCall = 0;
Transaction.aggregate = async () => {
  aggregateCall += 1;
  if (aggregateCall === 1) {
    return [
      { _id: 'p1', unitsSold: 20, salesRevenue: 1000 },
      { _id: 'p2', unitsSold: 1, salesRevenue: 50 },
      { _id: 'p5', unitsSold: 5, salesRevenue: 250 }
    ];
  }
  return [{ firstCompletedAt: new Date('2026-01-01T00:00:00Z') }];
};

const { getProductPerformance } = require('../controllers/reportController');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const callController = async (query) => {
  let body;
  let statusCode = 200;
  aggregateCall = 0;
  await getProductPerformance(
    { query },
    {
      status(code) { statusCode = code; return this; },
      json(value) { body = value; }
    },
    (error) => { throw error; }
  );
  return { body, statusCode };
};

const run = async () => {
  const { body, statusCode } = await callController({
    from: '2026-10-01',
    to: '2026-10-10',
    fastThreshold: '1',
    slowThreshold: '0.25',
    minimumHistoryDays: '14'
  });

  assert(statusCode === 200, `Expected HTTP 200, received ${statusCode}`);
  assert(body.period.days === 10, 'Inclusive date range should contain 10 days');
  assert(body.summary.fastMoving === 1, 'Fast-moving count is incorrect');
  assert(body.summary.slowMoving === 1, 'Slow-moving count is incorrect');
  assert(body.summary.noSales === 1, 'No-sales count is incorrect');
  assert(body.summary.moderate === 1, 'Moderate count is incorrect');
  assert(body.summary.insufficientHistory === 1, 'Insufficient-history count is incorrect');
  assert(body.products.find((product) => product.productId === 'p1').classification === 'FAST_MOVING', 'Fast product was misclassified');
  assert(body.products.find((product) => product.productId === 'p2').classification === 'SLOW_MOVING', 'Slow product was misclassified');
  assert(body.products.find((product) => product.productId === 'p3').classification === 'NO_SALES', 'No-sales product was misclassified');
  assert(body.products.find((product) => product.productId === 'p4').classification === 'INSUFFICIENT_HISTORY', 'New product should have insufficient history');

  const invalid = await callController({
    from: '2026-10-01', to: '2026-10-10', fastThreshold: '0.2', slowThreshold: '0.25', minimumHistoryDays: '14'
  });
  assert(invalid.statusCode === 400, 'Invalid threshold ordering should return HTTP 400');

  console.log('Product performance controller contract: PASS');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
