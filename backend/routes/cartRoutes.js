const express = require('express');
const router = express.Router();
const {
  createCart,
  getCart,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  updateBudget,
  verifyItemWeight,
  reportWeightAnomaly,
  clearWeightAnomaly
} = require('../controllers/cartController');


router.post('/', createCart);
router.get('/:cartId', getCart);


router.put('/:cartId/budget', updateBudget);


router.post('/:cartId/items', addItemToCart);
router.delete('/:cartId/items/:itemId', removeItemFromCart);
router.put('/:cartId/items/:itemId', updateItemQuantity);


router.post('/:cartId/items/:itemId/weight', verifyItemWeight);
router.post('/:cartId/weight-anomaly', reportWeightAnomaly);
router.post('/:cartId/clear-anomaly', clearWeightAnomaly);

module.exports = router;
