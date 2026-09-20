const LeaveSettings = require('../models/LeaveSettings');
const LeaveRequest = require('../models/LeaveRequest');

/**
 * Validates leave application rules on the server side:
 * 1. Student Identity Binding (Tamper prevention)
 * 2. Past leave date rejection
 * 3. Submission advance deadline calculation using server time
 * 4. Duplicate and overlapping request prevention
 * 5. Maximum allowable days verification
 */
const validateLeaveApplication = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, startTime = '09:00 AM', reason } = req.body;

    // 1. Required fields check
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: leaveType, startDate, endDate, and reason.'
      });
    }

    // 2. Student Identity Binding (Critical Security Innovation)
    // If the frontend tries to pass a different studentId, reject immediately
    if (req.body.studentId && req.student && req.body.studentId !== req.student.studentId) {
      return res.status(403).json({
        success: false,
        securityAlert: true,
        message: 'Security Violation: You cannot apply for leave on behalf of another student. Your authenticated identity has been recorded.'
      });
    }

    // Enforce identity from authenticated student session
    if (!req.student) {
      return res.status(401).json({
        success: false,
        message: 'No active student profile linked to this authenticated account.'
      });
    }

    const boundStudentId = req.student.studentId;
    req.body.studentId = boundStudentId;

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const serverNow = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided for start or end date.'
      });
    }

    // End date must be on or after start date
    const startZero = new Date(start);
    startZero.setHours(0, 0, 0, 0);

    const endZero = new Date(end);
    endZero.setHours(0, 0, 0, 0);

    if (endZero.getTime() < startZero.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    // 3. Past Leave Prevention
    const todayZero = new Date(serverNow);
    todayZero.setHours(0, 0, 0, 0);

    if (startZero.getTime() < todayZero.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Past leave dates cannot be submitted.'
      });
    }

    // Load College Leave Settings
    let settings = await LeaveSettings.findOne();
    if (!settings) {
      settings = {
        minimumAdvanceHours: 12,
        emergencyLeaveEnabled: true,
        emergencyMinimumHours: 2,
        maximumLeaveDays: 14
      };
    }

    // 4. Advance Deadline Validation using Server Time
    // Parse start time (e.g. "09:00 AM" or "14:00")
    let startHour = 9;
    let startMin = 0;
    if (startTime) {
      const timeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const min = parseInt(timeMatch[2], 10);
        const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
        if (period === 'PM' && hour < 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        startHour = hour;
        startMin = min;
      }
    }

    const leaveStartDateTime = new Date(start);
    leaveStartDateTime.setHours(startHour, startMin, 0, 0);

    const millisecondsUntilLeave = leaveStartDateTime.getTime() - serverNow.getTime();
    const hoursUntilLeave = millisecondsUntilLeave / (1000 * 60 * 60);

    const isEmergency = leaveType === 'Emergency Leave';

    if (isEmergency) {
      if (!settings.emergencyLeaveEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Emergency leave is currently disabled by college administration.'
        });
      }

      if (hoursUntilLeave < settings.emergencyMinimumHours) {
        return res.status(400).json({
          success: false,
          message: `Emergency leave request cannot be submitted because the minimum notice period (${settings.emergencyMinimumHours} hours) has passed.`
        });
      }
    } else {
      // Normal leave
      if (hoursUntilLeave < settings.minimumAdvanceHours) {
        return res.status(400).json({
          success: false,
          message: 'Leave request cannot be submitted because the submission deadline has passed.'
        });
      }
    }

    // Calculate total days
    const diffTime = endZero.getTime() - startZero.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays > settings.maximumLeaveDays) {
      return res.status(400).json({
        success: false,
        message: `Leave duration (${totalDays} days) exceeds maximum allowable limit (${settings.maximumLeaveDays} days).`
      });
    }

    req.body.calculatedTotalDays = totalDays;

    // 5. Prevent Duplicate & Overlapping Leave Requests
    const overlappingRequests = await LeaveRequest.find({
      studentId: boundStudentId,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        {
          startDate: { $lte: endZero },
          endDate: { $gte: startZero }
        }
      ]
    });

    if (overlappingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A leave request already exists for these dates.'
      });
    }

    // All validations passed
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Internal validation error: ${error.message}`
    });
  }
};

module.exports = {
  validateLeaveApplication
};
