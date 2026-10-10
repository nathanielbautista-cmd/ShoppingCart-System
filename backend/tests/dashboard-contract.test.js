const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Cart = require('../models/Cart');

Product.find = () => ({
  select: () => ({
    lean: async () => [
      { _id: 'p1', name: 'Rice', stock: 12, minimumStock: 5 },
      { _id: 'p2', name: 'Milk', stock: 3, minimumStock: 5 },
      { _id: 'p3', name: 'Bread', stock: 0, minimumStock: 4 }
    ]
  })
});

let aggregateCall = 0;
Transaction.aggregate = async () => {
  aggregateCall += 1;
  if (aggregateCall === 1) return [];
  if (aggregateCall === 2) return [{ productId: 'p1', name: 'Rice', unitsSold: 8, totalSales: 400 }];
  if (aggregateCall === 3) return [{ sales: 750, checkouts: 3 }];
  return [{ sales: 2450 }];
};

Transaction.find = () => ({
  sort: () => ({
    limit: () => ({
      select: () => ({
        lean: async () => [{
          transactionId: 'TX-1',
          cartId: 'C-1',
          createdAt: new Date(),
          total: 250,
          paymentStatus: 'PAID'
        }]
      })
    })
  })
});

Cart.find = () => ({
  select: () => ({
    lean: async () => [
      { status: 'ACTIVE' },
      { status: 'WAITING_FOR_CASHIER' },
      { status: 'COMPLETED' }
    ]
  })
});

const { getDashboardOverview } = require('../controllers/reportController');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  let body;
  aggregateCall = 0;
  await getDashboardOverview(
    { query: { salesPeriod: 'weekly' } },
    {
      status(code) {
        assert(code === 200, `Expected HTTP 200, received ${code}`);
        return this;
      },
      json(value) {
        body = value;
      }
    },
    (error) => { throw error; }
  );

  assert(body.summary.totalProducts === 3, 'Total products was not calculated correctly');
  assert(body.stockStatus.inStock === 1, 'In-stock count was not calculated correctly');
  assert(body.stockStatus.lowStock === 1, 'Low-stock count was not calculated correctly');
  assert(body.stockStatus.outOfStock === 1, 'Out-of-stock count was not calculated correctly');
  assert(body.summary.totalSales === 2450, 'Total sales were not calculated correctly');
  assert(body.operations.activeCarts === 1, 'Active carts were not calculated correctly');
  assert(body.summary.waitingForCashier === 1, 'Waiting carts were not calculated correctly');
  assert(body.summary.todaySales === 750, "Today's sales were not calculated correctly");
  assert(body.operations.completedCheckoutsToday === 3, 'Completed checkouts were not calculated correctly');
  assert(body.topProducts[0].name === 'Rice', 'Fast-moving products were not returned');
  assert(body.slowMovingProducts[0].name === 'Bread', 'Slow-moving products were not sorted correctly');
  assert(body.slowMovingProducts[0].unitsSold === 0, 'Products without sales should have zero units sold');
  assert(body.lowStockAlerts[0].status === 'OUT_OF_STOCK', 'Critical alerts were not sorted first');
  assert(body.recentTransactions.length === 1, 'Recent transactions were not returned');

  let monthlyBody;
  aggregateCall = 0;
  await getDashboardOverview(
    { query: { salesPeriod: 'monthly' } },
    {
      status() { return this; },
      json(value) { monthlyBody = value; }
    },
    (error) => { throw error; }
  );
  assert(monthlyBody.salesPeriod === 'monthly', 'Monthly sales period was not returned');
  assert(monthlyBody.salesOverview.length === 30, 'Monthly sales should contain 30 daily points');

  console.log('Dashboard controller contract: PASS');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
