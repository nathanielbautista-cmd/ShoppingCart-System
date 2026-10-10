const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');


const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const cashierRoutes = require('./routes/cashierRoutes');
const reportRoutes = require('./routes/reportRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const adminRoutes = require('./routes/adminRoutes');


dotenv.config();


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

app.listen(PORT, () => {
  console.log(`iCart backend running on port ${PORT}`);
});

module.exports = app;
