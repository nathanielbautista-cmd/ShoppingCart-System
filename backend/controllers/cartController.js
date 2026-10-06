const Cart = require('../models/Cart');
const Product = require('../models/Product');
const {
  CART_STATUS,
  WEIGHT_STATUS,
  calculateBudgetStatus,
  verifyWeight,
  WEIGHT_TOLERANCE_GRAMS
} = require('../config/constants');

/**
 * Helper to generate cart summary response
 */
const formatCartResponse = (cart) => {
  const budgetInfo = calculateBudgetStatus(cart.budget, cart.total);
  const totalItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalExpectedWeight = cart.items.reduce((sum, item) => sum + item.expectedWeight, 0);
  const totalVerifiedWeight = cart.items.reduce((sum, item) => sum + (item.verifiedWeight || 0), 0);

  return {
    _id: cart._id,
    cartId: cart.cartId,
    status: cart.status,
    items: cart.items,
    itemCount: totalItemCount,
    budget: cart.budget,
    subtotal: cart.subtotal,
    total: cart.total,
    remainingBudget: budgetInfo.remainingBudget,
    budgetStatus: budgetInfo.budgetStatus,
    totalExpectedWeight,
    totalVerifiedWeight,
    hasWeightAnomaly: cart.hasWeightAnomaly,
    anomalyNote: cart.anomalyNote,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt
  };
};

/**
 * @desc    Create a new active shopping cart
 * @route   POST /api/cart
 * @access  Public
 */
const createCart = async (req, res, next) => {
  try {
    const { cartId, budget } = req.body;

    // Use provided cartId or auto-generate
    const finalCartId = cartId && cartId.trim()
      ? cartId.trim().toUpperCase()
      : `ICART-${Date.now().toString().slice(-4)}`;

    // Check if cartId already exists
    const existing = await Cart.findOne({ cartId: finalCartId });
    if (existing) {
      if (existing.status === CART_STATUS.ACTIVE) {
        return res.status(200).json({
          success: true,
          message: `Active cart ${finalCartId} found`,
          cart: formatCartResponse(existing)
        });
      }
      // If previous cart with this ID was completed/cancelled, reset it
      existing.status = CART_STATUS.ACTIVE;
      existing.items = [];
      existing.subtotal = 0;
      existing.total = 0;
      existing.budget = Number(budget) || 0;
      existing.hasWeightAnomaly = false;
      existing.anomalyNote = '';
      await existing.save();

      return res.status(200).json({
        success: true,
        message: `Cart ${finalCartId} reset and activated`,
        cart: formatCartResponse(existing)
      });
    }

    const newCart = await Cart.create({
      cartId: finalCartId,
      status: CART_STATUS.ACTIVE,
      items: [],
      budget: Number(budget) || 0,
      subtotal: 0,
      total: 0
    });

    res.status(201).json({
      success: true,
      message: 'New shopping cart created',
      cart: formatCartResponse(newCart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get shopping cart by cartId
 * @route   GET /api/cart/:cartId
 * @access  Public
 */
const getCart = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    res.status(200).json({
      success: true,
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to cart via barcode
 * @route   POST /api/cart/:cartId/items
 * @access  Public (Used by Touchscreen / Logicowl OJ-MP6300 scanner)
 */
const addItemToCart = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const { barcode, quantity = 1 } = req.body;

    const requestedQty = Number(quantity);
    if (!barcode || requestedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid barcode and positive quantity'
      });
    }

    // 1. Find Cart
    let cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      // Auto-create active cart if not yet created
      cart = await Cart.create({
        cartId: cartId.trim().toUpperCase(),
        status: CART_STATUS.ACTIVE,
        items: [],
        budget: 0,
        subtotal: 0,
        total: 0
      });
    }

    if (cart.status !== CART_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: `Cart is not active (current status: ${cart.status})`
      });
    }

    // 2. Find Product by barcode
    const product = await Product.findOne({ barcode: barcode.trim() });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with barcode "${barcode}" not found in inventory`
      });
    }

    // 3. Check if active
    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is currently inactive`
      });
    }

    // 4. Check available stock
    const existingItemIndex = cart.items.findIndex(
      (item) => item.barcode === product.barcode
    );

    const currentQtyInCart = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
    const totalRequiredQty = currentQtyInCart + requestedQty;

    if (totalRequiredQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock}, in cart: ${currentQtyInCart}, requested: +${requestedQty}`
      });
    }

    // 5. Add or update item in cart
    if (existingItemIndex > -1) {
      const item = cart.items[existingItemIndex];
      item.quantity += requestedQty;
      item.subtotal = Number((item.price * item.quantity).toFixed(2));
      item.expectedWeight = Number((product.weight * item.quantity).toFixed(2));
      item.weightStatus = WEIGHT_STATUS.PENDING; // Needs weight verification after new item placed
    } else {
      cart.items.push({
        productId: product._id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        quantity: requestedQty,
        expectedWeight: Number((product.weight * requestedQty).toFixed(2)),
        verifiedWeight: 0,
        weightStatus: WEIGHT_STATUS.PENDING,
        subtotal: Number((product.price * requestedQty).toFixed(2))
      });
    }

    // 6. Recalculate cart subtotal & total
    cart.recalculateTotals();
    await cart.save();

    res.status(200).json({
      success: true,
      message: `"${product.name}" added to cart`,
      addedItem: {
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        unit: product.unit,
        expectedWeight: product.weight * requestedQty,
        quantity: requestedQty
      },
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/:cartId/items/:itemId
 * @access  Public
 */
const removeItemFromCart = async (req, res, next) => {
  try {
    const { cartId, itemId } = req.params;

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    // Match by item._id or by item.barcode
    const initialItemCount = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item._id.toString() !== itemId && item.barcode !== itemId
    );

    if (cart.items.length === initialItemCount) {
      return res.status(404).json({
        success: false,
        message: `Item "${itemId}" not found in cart`
      });
    }

    cart.recalculateTotals();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update item quantity in cart
 * @route   PUT /api/cart/:cartId/items/:itemId
 * @access  Public
 */
const updateItemQuantity = async (req, res, next) => {
  try {
    const { cartId, itemId } = req.params;
    const { quantity } = req.body;

    const newQty = Number(quantity);
    if (!newQty || newQty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1. To remove an item, use the DELETE endpoint.'
      });
    }

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    const item = cart.items.find(
      (i) => i._id.toString() === itemId || i.barcode === itemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item "${itemId}" not found in cart`
      });
    }

    // Check product stock limit
    const product = await Product.findById(item.productId);
    if (product && newQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Quantity ${newQty} exceeds available stock of ${product.stock}`
      });
    }

    const singleWeight = product ? product.weight : (item.expectedWeight / item.quantity);
    item.quantity = newQty;
    item.subtotal = Number((item.price * newQty).toFixed(2));
    item.expectedWeight = Number((singleWeight * newQty).toFixed(2));
    item.weightStatus = WEIGHT_STATUS.PENDING; // Mark pending re-verification

    cart.recalculateTotals();
    await cart.save();

    res.status(200).json({
      success: true,
      message: `Updated "${item.name}" quantity to ${newQty}`,
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set/Update cart budget and get budget status
 * @route   PUT /api/cart/:cartId/budget
 * @access  Public
 */
const updateBudget = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const { budget } = req.body;

    if (budget === undefined || Number(budget) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid non-negative budget amount'
      });
    }

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    cart.budget = Number(budget);
    await cart.save();

    const formatted = formatCartResponse(cart);

    res.status(200).json({
      success: true,
      message: `Budget updated to ₱${cart.budget}`,
      budget: cart.budget,
      remainingBudget: formatted.remainingBudget,
      budgetStatus: formatted.budgetStatus,
      cart: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update verified weight for a cart item (HX711 Load Cell verification)
 * @route   POST /api/cart/:cartId/items/:itemId/weight
 * @access  Public (Hardware / Raspberry Pi)
 */
const verifyItemWeight = async (req, res, next) => {
  try {
    const { cartId, itemId } = req.params;
    const { verifiedWeight } = req.body;

    if (verifiedWeight === undefined || Number(verifiedWeight) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid verifiedWeight in grams'
      });
    }

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    const item = cart.items.find(
      (i) => i._id.toString() === itemId || i.barcode === itemId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item "${itemId}" not found in cart`
      });
    }

    const measured = Number(verifiedWeight);
    const verification = verifyWeight(item.expectedWeight, measured);

    item.verifiedWeight = measured;
    item.weightStatus = verification.status;

    await cart.save();

    res.status(200).json({
      success: true,
      message: verification.isVerified
        ? `Weight verified successfully for "${item.name}"`
        : `Weight mismatch detected for "${item.name}". Expected: ${item.expectedWeight}g, Measured: ${measured}g (diff: ${verification.difference}g, tolerance: ±${WEIGHT_TOLERANCE_GRAMS}g)`,
      verification: {
        barcode: item.barcode,
        name: item.name,
        expectedWeight: item.expectedWeight,
        verifiedWeight: measured,
        toleranceGrams: WEIGHT_TOLERANCE_GRAMS,
        difference: verification.difference,
        status: verification.status,
        isVerified: verification.isVerified
      },
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Report weight anomaly (Situation B: item placed in cart without scanning)
 * @route   POST /api/cart/:cartId/weight-anomaly
 * @access  Public (Raspberry Pi HX711 background monitor)
 */
const reportWeightAnomaly = async (req, res, next) => {
  try {
    const { cartId } = req.params;
    const { anomalyWeight, note } = req.body;

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    cart.hasWeightAnomaly = true;
    cart.anomalyNote = note || `Unscanned object detected on scale (+${anomalyWeight || 0}g)`;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Weight anomaly recorded. Cart flagged for verification.',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear weight anomaly flag (e.g. after cashier verification)
 * @route   POST /api/cart/:cartId/clear-anomaly
 * @access  Public
 */
const clearWeightAnomaly = async (req, res, next) => {
  try {
    const { cartId } = req.params;

    const cart = await Cart.findOne({ cartId: cartId.trim().toUpperCase() });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: `Cart with ID "${cartId}" not found`
      });
    }

    cart.hasWeightAnomaly = false;
    cart.anomalyNote = '';
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Weight anomaly cleared',
      cart: formatCartResponse(cart)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCart,
  getCart,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  updateBudget,
  verifyItemWeight,
  reportWeightAnomaly,
  clearWeightAnomaly
};
