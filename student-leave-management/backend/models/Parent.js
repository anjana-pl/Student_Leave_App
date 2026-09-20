const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'unverified'],
    default: 'verified'
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Parent', parentSchema);
