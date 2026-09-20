const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_leave_db');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // In production or development without local MongoDB running, do not crash immediately
    console.warn('[MongoDB] Running with simulated/in-memory fallback if database server is unavailable');
  }
};

module.exports = connectDB;
