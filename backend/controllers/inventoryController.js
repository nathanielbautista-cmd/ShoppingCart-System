const Product = require('../models/Product');

/**
 * Helper to determine stock status label
 */
const getStockStatus = (stock, threshold = 5) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};

/**
 * @desc    Get inventory overview with stock indicators
 * @route   GET /api/inventory
 * @access  Public / Admin
 */
const getInventory = async (req, res, next) => {
  try {
    const { status, category, lowStockOnly } = req.query;
    const LOW_STOCK_THRESHOLD = 5;

    let query = {};
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (lowStockOnly === 'true') {
      query.stock = { $lte: LOW_STOCK_THRESHOLD };
    }

    const products = await Product.find(query).sort({ stock: 1, name: 1 });

    const formattedInventory = products.map((p) => {
      const stockStatus = getStockStatus(p.stock, LOW_STOCK_THRESHOLD);
      return {
        id: p._id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        unit: p.unit,
        weight: p.weight,
        stockStatus,
        isLowStock: p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0,
        isOutOfStock: p.stock === 0,
        isActive: p.isActive,
        updatedAt: p.updatedAt
      };
    });

    const summary = {
      totalProducts: formattedInventory.length,
      inStockCount: formattedInventory.filter((i) => i.stockStatus === 'IN_STOCK').length,
      lowStockCount: formattedInventory.filter((i) => i.stockStatus === 'LOW_STOCK').length,
      outOfStockCount: formattedInventory.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length
    };

    res.status(200).json({
      success: true,
      summary,
      inventory: formattedInventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Adjust product stock level
 * @route   PUT /api/inventory/:productId/stock
 * @access  Private / Admin
 */
const adjustStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { action = 'set', quantity, reason = 'Inventory adjustment' } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid numeric quantity'
      });
    }

    let product = await Product.findById(productId);
    if (!product) {
      // Try finding by barcode as fallback
      product = await Product.findOne({ barcode: productId });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product "${productId}" not found`
      });
    }

    const previousStock = product.stock;
    let newStock = previousStock;

    if (action === 'set') {
      if (qty < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stock level cannot be set to a negative number'
        });
      }
      newStock = qty;
    } else if (action === 'add') {
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Addition quantity must be greater than zero'
        });
      }
      newStock = previousStock + qty;
    } else if (action === 'subtract') {
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Deduction quantity must be greater than zero'
        });
      }
      if (previousStock - qty < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${qty}. Current stock is only ${previousStock}`
        });
      }
      newStock = previousStock - qty;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Allowed actions: "set", "add", "subtract"'
      });
    }

    product.stock = newStock;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Stock for "${product.name}" successfully updated from ${previousStock} to ${newStock}`,
      product: {
        id: product._id,
        barcode: product.barcode,
        name: product.name,
        previousStock,
        currentStock: product.stock,
        action,
        reason,
        stockStatus: getStockStatus(product.stock)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock items (<= 5 units)
 * @route   GET /api/inventory/low-stock
 * @access  Public / Admin
 */
const getLowStockAlerts = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold) || 5;

    const lowStockProducts = await Product.find({
      stock: { $lte: threshold }
    }).sort({ stock: 1 });

    res.status(200).json({
      success: true,
      threshold,
      count: lowStockProducts.length,
      alerts: lowStockProducts.map((p) => ({
        id: p._id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        stock: p.stock,
        status: p.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  adjustStock,
  getLowStockAlerts
};
