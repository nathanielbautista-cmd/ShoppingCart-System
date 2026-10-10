const Product = require('../models/Product');




const getStockStatus = (stock, threshold = 5) => {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};






const getInventory = async (req, res, next) => {
  try {
    const { status, category, lowStockOnly } = req.query;

    let query = {};
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const products = await Product.find(query).sort({ stock: 1, name: 1 });

    let formattedInventory = products.map((p) => {
      const minimumStock = p.minimumStock ?? 5;
      const stockStatus = getStockStatus(p.stock, minimumStock);
      return {
        id: p._id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        minimumStock,
        unit: p.unit,
        weight: p.weight,
        stockStatus,
        isLowStock: p.stock <= minimumStock && p.stock > 0,
        isOutOfStock: p.stock === 0,
        isActive: p.isActive,
        updatedAt: p.updatedAt
      };
    });

    if (lowStockOnly === 'true') {
      formattedInventory = formattedInventory.filter((item) => item.stockStatus !== 'IN_STOCK');
    }
    if (status) {
      formattedInventory = formattedInventory.filter((item) => item.stockStatus === status.toUpperCase());
    }

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
        stockStatus: getStockStatus(product.stock, product.minimumStock ?? 5)
      }
    });
  } catch (error) {
    next(error);
  }
};






const getLowStockAlerts = async (req, res, next) => {
  try {
    const parsedThreshold = req.query.threshold === undefined ? null : Number(req.query.threshold);
    const requestedThreshold = Number.isFinite(parsedThreshold) ? parsedThreshold : null;
    const lowStockProducts = (await Product.find({}).sort({ stock: 1, name: 1 }))
      .filter((product) => product.stock <= (requestedThreshold ?? product.minimumStock ?? 5));

    res.status(200).json({
      success: true,
      threshold: requestedThreshold,
      count: lowStockProducts.length,
      alerts: lowStockProducts.map((p) => ({
        id: p._id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        stock: p.stock,
        minimumStock: requestedThreshold ?? p.minimumStock ?? 5,
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
