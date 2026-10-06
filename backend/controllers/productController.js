const Product = require('../models/Product');

/**
 * @desc    Get all products (with optional search, category filter, active filter)
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const { keyword, category, active } = req.query;
    const query = {};

    // Search keyword in name, description, or barcode
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { barcode: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const products = await Product.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by MongoDB ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product by Barcode (Used by Logicowl OJ-MP6300 scanner)
 * @route   GET /api/products/barcode/:barcode
 * @access  Public
 * @note    Example: Scanner reads 4800012345678 -> Backend searches Product.barcode
 */
const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a barcode parameter'
      });
    }

    const product = await Product.findOne({ barcode: barcode.trim() });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with barcode ${barcode} was not found in the inventory database`
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is currently inactive/unavailable for purchase`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product barcode recognized',
      product: {
        id: product._id,
        barcode: product.barcode,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        stock: product.stock,
        unit: product.unit,
        weight: product.weight, // expected weight in grams for HX711 verification
        image: product.image,
        isActive: product.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const { barcode, name, description, category, price, stock, unit, weight, image, isActive } = req.body;

    // Check if barcode already exists
    const existing = await Product.findOne({ barcode: barcode.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A product with barcode "${barcode}" already exists: ${existing.name}`
      });
    }

    const product = await Product.create({
      barcode: barcode.trim(),
      name: name.trim(),
      description: description || '',
      category: category.trim(),
      price: Number(price),
      stock: Number(stock) || 0,
      unit: unit || 'piece',
      weight: Number(weight),
      image: image || '',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    // If barcode is being updated, check uniqueness
    if (req.body.barcode && req.body.barcode !== product.barcode) {
      const barcodeExists = await Product.findOne({ barcode: req.body.barcode });
      if (barcodeExists) {
        return res.status(400).json({
          success: false,
          message: `Barcode "${req.body.barcode}" is already assigned to another product`
        });
      }
    }

    // Ensure stock cannot be negative
    if (req.body.stock !== undefined && req.body.stock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock cannot be set to a negative number'
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct
};
