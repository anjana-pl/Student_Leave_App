const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  studentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['Medical Leave', 'Personal Leave', 'Emergency Leave', 'On-Duty Leave', 'Other']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    default: '09:00 AM'
  },
  endTime: {
    type: String,
    default: '05:00 PM'
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0.5
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  documentUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  parentStatus: {
    type: String,
    enum: ['Waiting for Acknowledgement', 'Acknowledged', 'Not Acknowledged'],
    default: 'Waiting for Acknowledgement'
  },
  parentAcknowledgedAt: {
    type: Date,
    default: null
  },
  parentRemark: {
    type: String,
    default: ''
  },
  facultyRemark: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Index for efficient overlap query
leaveRequestSchema.index({ studentId: 1, status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
