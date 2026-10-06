const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const reportRoutes = require('./routes/reportRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
// Product images are stored as compressed data URLs in the product record.
// Express defaults to 100 KB, which rejects normal photo uploads before the
// product controller can receive them.
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Welcome / Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'iCart Smart Shopping Cart Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/hardware', hardwareRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`iCart backend running on port ${PORT}`);
});

module.exports = app;
