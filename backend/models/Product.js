const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: [true, 'Please provide a product barcode'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price in PHP (₱)'],
      min: [0, 'Price must be greater than or equal to 0']
    },
    stock: {
      type: Number,
      required: [true, 'Please provide product stock'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      default: 'piece',
      trim: true
    },
    // Expected product weight in grams (used for HX711 load-cell weight verification)
    weight: {
      type: Number,
      required: [true, 'Please provide expected weight in grams'],
      min: [0, 'Weight must be greater than or equal to 0']
    },
    image: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
