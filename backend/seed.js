const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { closeDB } = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Transaction = require('./models/Transaction');

dotenv.config();

const sampleProducts = [
  {
    barcode: '4800012345678',
    name: 'Del Monte Pineapple Juice',
    description: '100% pure pineapple juice with vitamin C (220ml can)',
    category: 'Beverages',
    price: 45.00,
    stock: 25,
    unit: 'can',
    weight: 240,
    image: '',
    isActive: true
  },
  {
    barcode: '4807770270014',
    name: 'Lucky Me Instant Pancit Canton Original',
    description: 'Instant stir-fried savory noodles 80g',
    category: 'Instant Noodles & Pasta',
    price: 16.50,
    stock: 60,
    unit: 'pack',
    weight: 85,
    image: '',
    isActive: true
  },
  {
    barcode: '4807770270021',
    name: 'Lucky Me Pancit Canton Chilimansi',
    description: 'Instant noodles with spicy chili & calamansi flavor 80g',
    category: 'Instant Noodles & Pasta',
    price: 16.50,
    stock: 45,
    unit: 'pack',
    weight: 85,
    image: '',
    isActive: true
  },
  {
    barcode: '4800361376822',
    name: 'Bear Brand Fortified Powdered Milk Drink',
    description: 'Nutritious milk powder with Tibay Resistensya nutrients 300g',
    category: 'Dairy & Milk',
    price: 110.00,
    stock: 18,
    unit: 'pack',
    weight: 315,
    image: '',
    isActive: true
  },
  {
    barcode: '8996001304123',
    name: 'Kopiko Brown Coffee Sachet',
    description: 'Rich brown coffee mix with caramel hints 30g',
    category: 'Beverages',
    price: 12.00,
    stock: 80,
    unit: 'sachet',
    weight: 32,
    image: '',
    isActive: true
  },
  {
    barcode: '4800110022334',
    name: "Nature's Spring Purified Water 500ml",
    description: 'Purified bottled drinking water',
    category: 'Beverages',
    price: 18.00,
    stock: 50,
    unit: 'bottle',
    weight: 520,
    image: '',
    isActive: true
  },
  {
    barcode: '4800016644221',
    name: 'Century Tuna Flakes in Oil 155g',
    description: 'Delicious tuna flakes rich in Omega 3 DHA',
    category: 'Canned Goods',
    price: 38.50,
    stock: 35,
    unit: 'can',
    weight: 185,
    image: '',
    isActive: true
  },
  {
    barcode: '4800119223344',
    name: 'Datu Puti Soy Sauce 385ml',
    description: 'Naturally fermented premium soy sauce',
    category: 'Condiments & Sauces',
    price: 28.00,
    stock: 22,
    unit: 'bottle',
    weight: 430,
    image: '',
    isActive: true
  },
  {
    barcode: '4800166112233',
    name: 'Silver Swan Cane Vinegar 385ml',
    description: 'Distinct sour cane vinegar perfect for dipping and adobo',
    category: 'Condiments & Sauces',
    price: 26.00,
    stock: 20,
    unit: 'bottle',
    weight: 425,
    image: '',
    isActive: true
  },
  {
    barcode: '4800016050510',
    name: 'Jack n Jill Piattos Cheese 85g',
    description: 'Hexagonal potato crisps with cheese powder',
    category: 'Snacks & Chips',
    price: 38.00,
    stock: 30,
    unit: 'bag',
    weight: 92,
    image: '',
    isActive: true
  },
  {
    barcode: '4800194110022',
    name: 'Oishi Prawn Crackers 60g',
    description: 'Crispy savory prawn flavored crackers',
    category: 'Snacks & Chips',
    price: 22.00,
    stock: 40,
    unit: 'bag',
    weight: 68,
    image: '',
    isActive: true
  },
  {
    barcode: '4902430755432',
    name: 'Safeguard Pure White Bar Soap 130g',
    description: 'Antibacterial bar soap with germ shield protection',
    category: 'Personal Care',
    price: 52.00,
    stock: 24,
    unit: 'bar',
    weight: 135,
    image: '',
    isActive: true
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to SQLite for database seeding...');


    console.log('Clearing existing products and carts...');
    await Product.deleteMany({});

    try {
      await Product.collection.dropIndex('productId_1');
      console.log('Dropped stale index productId_1');
    } catch (idxErr) {

      if (idxErr && idxErr.codeName !== 'IndexNotFound' && !/index not found/.test(String(idxErr))) {
        console.warn('Could not drop index productId_1:', idxErr.message || idxErr);
      }
    }
    await Cart.deleteMany({});
    await Transaction.deleteMany({});


    console.log('Checking / Seeding users...');
    await User.deleteMany({});
    
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@icart.com',
      phoneNumber: '09171234567',
      password: 'Admin@12345',
      role: 'admin',
      isEmailVerified: true
    });

    const cashierUser = await User.create({
      name: 'Cashier Station 1',
      email: 'cashier@icart.com',
      phoneNumber: '09171234568',
      password: 'Cashier@12345',
      role: 'cashier',
      isEmailVerified: true
    });

    console.log(`Created admin: ${adminUser.email} / Admin@12345`);
    console.log(`Created cashier: ${cashierUser.email} / Cashier@12345`);


    console.log('Seeding products with realistic barcodes and weights...');
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`Successfully seeded ${insertedProducts.length} products.`);


    console.log('Seeding sample active cart ICART-001...');
    const firstProduct = insertedProducts[0];
    const secondProduct = insertedProducts[1];

    const sampleCart = await Cart.create({
      cartId: 'ICART-001',
      status: 'ACTIVE',
      budget: 500,
      subtotal: firstProduct.price + (secondProduct.price * 2),
      total: firstProduct.price + (secondProduct.price * 2),
      items: [
        {
          productId: firstProduct._id,
          barcode: firstProduct.barcode,
          name: firstProduct.name,
          price: firstProduct.price,
          quantity: 1,
          expectedWeight: firstProduct.weight,
          verifiedWeight: firstProduct.weight - 2,
          weightStatus: 'VERIFIED',
          subtotal: firstProduct.price
        },
        {
          productId: secondProduct._id,
          barcode: secondProduct.barcode,
          name: secondProduct.name,
          price: secondProduct.price,
          quantity: 2,
          expectedWeight: secondProduct.weight * 2,
          verifiedWeight: 170,
          weightStatus: 'VERIFIED',
          subtotal: secondProduct.price * 2
        }
      ]
    });

    console.log(`Sample cart created: ${sampleCart.cartId} (total: ₱${sampleCart.total}, budget: ₱${sampleCart.budget})`);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exitCode = 1;
  }
};

seedDatabase().finally(closeDB);
