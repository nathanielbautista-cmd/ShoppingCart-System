const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

const MANILA_TIME_ZONE = 'Asia/Manila';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getManilaDateKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getDashboardDateRange = (numberOfDays = 7) => {
  const now = new Date();
  const dayKeys = Array.from({ length: numberOfDays }, (_, index) =>
    getManilaDateKey(new Date(now.getTime() - ((numberOfDays - 1 - index) * DAY_IN_MS)))
  );
  const start = new Date(`${dayKeys[0]}T00:00:00+08:00`);
  const tomorrow = new Date(new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00+08:00`).getTime() + DAY_IN_MS);
  return { dayKeys, start, tomorrow };
};

const toDate = (value, endOfDay = false) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
    const manilaDate = new Date(`${value}T${time}+08:00`);
    return Number.isNaN(manilaDate.getTime()) ? null : manilaDate;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
};

const readPositiveNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const getDefaultProductPerformanceRange = () => {
  const { dayKeys } = getDashboardDateRange(30);
  return { fromKey: dayKeys[0], toKey: dayKeys[dayKeys.length - 1] };
};

const getInclusiveDayCount = (from, to) => Math.max(1, Math.floor((to - from) / DAY_IN_MS) + 1);






const getProductPerformance = async (req, res, next) => {
  try {
    const defaultRange = getDefaultProductPerformanceRange();
    const fromKey = req.query.from || defaultRange.fromKey;
    const toKey = req.query.to || defaultRange.toKey;
    const from = toDate(fromKey);
    const to = toDate(toKey, true);

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Dates must use YYYY-MM-DD format' });
    }
    if (from > to) {
      return res.status(400).json({ success: false, message: 'The start date cannot be after the end date' });
    }

    const fastThreshold = readPositiveNumber(
      req.query.fastThreshold,
      readPositiveNumber(process.env.REPORT_FAST_UNITS_PER_DAY, 1)
    );
    const slowThreshold = readPositiveNumber(
      req.query.slowThreshold,
      readPositiveNumber(process.env.REPORT_SLOW_UNITS_PER_DAY, 0.25)
    );
    const minimumHistoryDays = readPositiveNumber(
      req.query.minimumHistoryDays,
      readPositiveNumber(process.env.REPORT_MINIMUM_HISTORY_DAYS, 14)
    );

    if ([fastThreshold, slowThreshold, minimumHistoryDays].some((value) => value === null)) {
      return res.status(400).json({ success: false, message: 'Movement thresholds must be non-negative numbers' });
    }
    if (slowThreshold >= fastThreshold) {
      return res.status(400).json({ success: false, message: 'The fast-moving threshold must be greater than the slow-moving threshold' });
    }
    if (!Number.isInteger(minimumHistoryDays) || minimumHistoryDays < 1) {
      return res.status(400).json({ success: false, message: 'Minimum history must be a whole number of at least 1 day' });
    }

    const paidInRange = { paymentStatus: 'PAID', createdAt: { $gte: from, $lte: to } };
    const [movementRows, storeHistoryRows, products] = await Promise.all([
      Transaction.aggregate([
        { $match: paidInRange },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' },
          salesRevenue: { $sum: '$items.subtotal' }
        } }
      ]),
      Transaction.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, firstCompletedAt: { $min: '$createdAt' } } }
      ]),
      Product.find({ isActive: true })
        .sort({ name: 1 })
        .select('name barcode category stock minimumStock createdAt')
        .lean()
    ]);

    const movementByProduct = new Map(
      movementRows.map((row) => [String(row._id), row])
    );
    const firstCompletedAt = storeHistoryRows[0]?.firstCompletedAt
      ? new Date(storeHistoryRows[0].firstCompletedAt)
      : null;
    const periodDays = getInclusiveDayCount(from, to);

    const productPerformance = products.map((product) => {
      const movement = movementByProduct.get(String(product._id));
      const unitsSold = Number(movement?.unitsSold) || 0;
      const salesRevenue = Number(movement?.salesRevenue) || 0;
      const productCreatedAt = product.createdAt ? new Date(product.createdAt) : null;
      const historyStartCandidates = [firstCompletedAt, productCreatedAt]
        .filter((date) => date && !Number.isNaN(date.getTime()));
      const historyStart = historyStartCandidates.length
        ? new Date(Math.max(...historyStartCandidates.map((date) => date.getTime())))
        : null;
      const historyDays = historyStart && historyStart <= to
        ? getInclusiveDayCount(historyStart, to)
        : 0;
      const salesVelocity = unitsSold / periodDays;

      let classification = 'MODERATE';
      if (historyDays < minimumHistoryDays) classification = 'INSUFFICIENT_HISTORY';
      else if (unitsSold === 0) classification = 'NO_SALES';
      else if (salesVelocity >= fastThreshold) classification = 'FAST_MOVING';
      else if (salesVelocity <= slowThreshold) classification = 'SLOW_MOVING';

      return {
        productId: product._id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        unitsSold,
        salesRevenue,
        currentStock: Number(product.stock) || 0,
        minimumStock: Number(product.minimumStock) || 0,
        salesVelocity: Number(salesVelocity.toFixed(4)),
        historyDays,
        classification
      };
    });

    const summary = productPerformance.reduce((counts, product) => {
      if (product.classification === 'FAST_MOVING') counts.fastMoving += 1;
      else if (product.classification === 'SLOW_MOVING') counts.slowMoving += 1;
      else if (product.classification === 'NO_SALES') counts.noSales += 1;
      else if (product.classification === 'INSUFFICIENT_HISTORY') counts.insufficientHistory += 1;
      else counts.moderate += 1;
      return counts;
    }, { fastMoving: 0, slowMoving: 0, noSales: 0, moderate: 0, insufficientHistory: 0 });

    res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      period: { from: fromKey, to: toKey, days: periodDays },
      thresholds: { fastUnitsPerDay: fastThreshold, slowUnitsPerDay: slowThreshold, minimumHistoryDays },
      summary: { ...summary, totalProducts: productPerformance.length },
      products: productPerformance
    });
  } catch (error) {
    next(error);
  }
};






const getDashboardOverview = async (req, res, next) => {
  try {
    const salesPeriod = req.query?.salesPeriod === 'monthly' ? 'monthly' : 'weekly';
    const { dayKeys, start, tomorrow } = getDashboardDateRange(salesPeriod === 'monthly' ? 30 : 7);
    const todayStart = new Date(`${dayKeys[dayKeys.length - 1]}T00:00:00+08:00`);
    const paidMatch = { paymentStatus: 'PAID' };

    const [products, dailySalesRows, productMovementRows, recentTransactions, carts, todaySummaryRows, totalSalesRows] = await Promise.all([
      Product.find({}).select('name stock minimumStock isActive').lean(),
      Transaction.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: start, $lt: tomorrow } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: MANILA_TIME_ZONE } },
          sales: { $sum: '$total' },
          transactions: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ]),
      Transaction.aggregate([
        { $match: paidMatch },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          unitsSold: { $sum: '$items.quantity' },
          totalSales: { $sum: '$items.subtotal' }
        } },
        { $sort: { unitsSold: -1, totalSales: -1, name: 1 } },
        { $project: { _id: 0, productId: '$_id', name: 1, unitsSold: 1, totalSales: 1 } }
      ]),
      Transaction.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('transactionId cartId createdAt total paymentStatus')
        .lean(),
      Cart.find({}).select('status updatedAt').lean(),
      Transaction.aggregate([
        { $match: { ...paidMatch, createdAt: { $gte: todayStart, $lt: tomorrow } } },
        { $group: { _id: null, sales: { $sum: '$total' }, checkouts: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: paidMatch },
        { $group: { _id: null, sales: { $sum: '$total' } } }
      ])
    ]);

    const stockItems = products.map((product) => {
      const minimumStock = Number.isFinite(product.minimumStock) ? product.minimumStock : 5;
      const stock = Number(product.stock) || 0;
      const status = stock <= 0
        ? 'OUT_OF_STOCK'
        : stock <= minimumStock
          ? 'LOW_STOCK'
          : 'IN_STOCK';
      return {
        id: product._id,
        name: product.name,
        stock,
        minimumStock,
        status
      };
    });

    const stockStatus = stockItems.reduce((counts, product) => {
      if (product.status === 'OUT_OF_STOCK') counts.outOfStock += 1;
      else if (product.status === 'LOW_STOCK') counts.lowStock += 1;
      else counts.inStock += 1;
      return counts;
    }, { inStock: 0, lowStock: 0, outOfStock: 0 });

    const lowStockAlerts = stockItems
      .filter((product) => product.status !== 'IN_STOCK')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'OUT_OF_STOCK' ? -1 : 1;
        const aRatio = a.minimumStock > 0 ? a.stock / a.minimumStock : a.stock;
        const bRatio = b.minimumStock > 0 ? b.stock / b.minimumStock : b.stock;
        return aRatio - bRatio || a.stock - b.stock || a.name.localeCompare(b.name);
      })
      .slice(0, 8);

    const movementByProduct = new Map(
      productMovementRows.map((product) => [String(product.productId), product])
    );
    const topProducts = productMovementRows.slice(0, 5);
    const slowMovingProducts = products
      .filter((product) => product.isActive !== false)
      .map((product) => {
        const movement = movementByProduct.get(String(product._id));
        return {
          productId: product._id,
          name: product.name,
          unitsSold: movement?.unitsSold || 0,
          totalSales: movement?.totalSales || 0
        };
      })
      .sort((a, b) => a.unitsSold - b.unitsSold || a.totalSales - b.totalSales || a.name.localeCompare(b.name))
      .slice(0, 5);

    const salesByDay = new Map(dailySalesRows.map((row) => [row._id, row]));
    const salesOverview = dayKeys.map((date) => ({
      date,
      sales: salesByDay.get(date)?.sales || 0,
      transactions: salesByDay.get(date)?.transactions || 0
    }));

    const operations = carts.reduce((summary, cart) => {
      if (cart.status === 'ACTIVE' || cart.status === 'CHECKOUT') summary.activeCarts += 1;
      if (cart.status === 'WAITING_FOR_CASHIER') summary.waitingForCashier += 1;
      return summary;
    }, { activeCarts: 0, waitingForCashier: 0 });

    const todaySummary = todaySummaryRows[0] || { sales: 0, checkouts: 0 };
    const totalSalesSummary = totalSalesRows[0] || { sales: 0 };

    res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      salesPeriod,
      summary: {
        totalProducts: products.length,
        todaySales: todaySummary.sales,
        totalSales: totalSalesSummary.sales,
        lowStock: stockStatus.lowStock,
        outOfStock: stockStatus.outOfStock,
        waitingForCashier: operations.waitingForCashier
      },
      stockStatus,
      salesOverview,
      topProducts,
      slowMovingProducts,
      lowStockAlerts,
      operations: {
        ...operations,
        completedCheckoutsToday: todaySummary.checkouts,
        connectionMonitoring: {
          supported: false,
          connected: null,
          disconnected: null
        }
      },
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction.transactionId,
        cartId: transaction.cartId,
        date: transaction.createdAt,
        total: transaction.total,
        paymentStatus: transaction.paymentStatus
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductPerformance, getDashboardOverview };
