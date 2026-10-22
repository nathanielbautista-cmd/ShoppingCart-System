const path = require('path');
const dotenv = require('dotenv');

// Always load the backend environment file regardless of whether Node is
// started from /backend, the repository root, PM2, or a systemd unit.
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { getEmailProvider } = require('./services/emailService');


const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const reportRoutes = require('./routes/reportRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const adminRoutes = require('./routes/adminRoutes');


connectDB();

const app = express();


app.use(cors());



app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));


app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'iCart Smart Shopping Cart Backend API',
    version: '1.0.0',
    database: 'sqlite',
    emailProvider: getEmailProvider(),
    timestamp: new Date().toISOString()
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/admin', adminRoutes);


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = app.listen(PORT, () => {
  console.log(`iCart backend running on port ${PORT}`);
  console.log(`Email provider: ${getEmailProvider()}`);
});

module.exports = app;
module.exports.httpServer = httpServer;
