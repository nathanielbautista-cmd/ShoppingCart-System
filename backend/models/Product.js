const { createSqliteModel } = require('./sqliteModel');

const required = (value, message) => {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(message);
};

module.exports = createSqliteModel({
  collection: 'products',
  uniqueFields: ['barcode'],
  defaults: {
    description: '',
    stock: 0,
    minimumStock: 5,
    unit: 'piece',
    image: '',
    expirationDate: null,
    isActive: true
  },
  validate(product) {
    required(product.barcode, 'Please provide a product barcode');
    required(product.name, 'Please provide product name');
    required(product.category, 'Please provide a category');
    if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) throw new Error('Price must be greater than or equal to 0');
    if (!Number.isFinite(Number(product.stock)) || Number(product.stock) < 0) throw new Error('Stock cannot be negative');
    if (!Number.isFinite(Number(product.weight)) || Number(product.weight) < 0) throw new Error('Weight must be greater than or equal to 0');
  }
});
