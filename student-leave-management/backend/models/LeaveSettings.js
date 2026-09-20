const mongoose = require('mongoose');

const leaveSettingsSchema = new mongoose.Schema({
  minimumAdvanceHours: {
    type: Number,
    default: 12,
    min: 0
  },
  emergencyLeaveEnabled: {
    type: Boolean,
    default: true
  },
  emergencyMinimumHours: {
    type: Number,
    default: 2,
    min: 0
  },
  maximumLeaveDays: {
    type: Number,
    default: 14,
    min: 1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LeaveSettings', leaveSettingsSchema);
