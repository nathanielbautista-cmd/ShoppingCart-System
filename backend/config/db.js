const mongoose = require('mongoose');




const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/icart';
    
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error('Make sure your MongoDB server or MongoDB Atlas cluster is running and accessible.');
    process.exit(1);
  }
};

module.exports = connectDB;
