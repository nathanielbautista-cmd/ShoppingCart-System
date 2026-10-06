const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

const toDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * @desc    Return sales, item, hourly, and inventory report data for the admin dashboard.
 * @route   GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * @access  Private/Admin
 */
const getReportSummary = async (req, res, next) => {
  try {
    const from = toDate(req.query.from);
    const to = toDate(req.query.to, true);
    if ((req.query.from && !from) || (req.query.to && !to)) {
      return res.status(400).json({ success: false, message: 'Dates must use YYYY-MM-DD format' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ success: false, message: 'The start date cannot be after the end date' });
    }

    const match = { paymentStatus: 'PAID' };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }

    const [summaryRows, topProducts, hourlySales, lowStockProducts] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        { $group: { _id: null, totalSales: { $sum: '$total' }, transactionCount: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        } },
        { $sort: { quantity: -1, revenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, productId: '$_id', name: 1, quantity: 1, revenue: 1 } }
      ]),
      Transaction.aggregate([
        { $match: match },
        { $group: {
          _id: { $hour: { date: '$createdAt', timezone: 'Asia/Manila' } },
          sales: { $sum: '$total' }
        } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: '$_id', sales: 1 } }
      ]),
      Product.find({ stock: { $lte: 5 } }).sort({ stock: 1, name: 1 }).limit(5)
        .select('name stock barcode category')
    ]);

    const summary = summaryRows[0] || { totalSales: 0, transactionCount: 0 };
    res.json({
      success: true,
      period: { from: from || null, to: to || null },
      summary: {
        totalSales: summary.totalSales,
        transactionCount: summary.transactionCount,
        averageBasket: summary.transactionCount ? summary.totalSales / summary.transactionCount : 0
      },
      topProducts,
      hourlySales: hourlySales.map((row) => ({ ...row, label: `${String(row.hour).padStart(2, '0')}:00` })),
      lowStockProducts: lowStockProducts.map((product) => ({
        id: product._id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        stock: product.stock
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReportSummary };
