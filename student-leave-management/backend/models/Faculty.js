const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facultyId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  assignedClasses: [{
    department: { type: String, required: true },
    year: { type: Number, required: true },
    section: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
