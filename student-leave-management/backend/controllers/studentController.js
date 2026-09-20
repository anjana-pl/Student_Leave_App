const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const Parent = require('../models/Parent');
const Faculty = require('../models/Faculty');
const LeaveSettings = require('../models/LeaveSettings');
const { generateRequestId } = require('../utils/helpers');

// @desc    Get student profile and dashboard statistics
// @route   GET /api/student/profile
// @access  Private (Student)
const getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate('parentId');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.'
      });
    }

    // Compute student's leave statistics
    const allRequests = await LeaveRequest.find({ studentId: student.studentId });

    let totalApprovedDays = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let parentPendingCount = 0;

    allRequests.forEach(req => {
      if (req.status === 'Approved') {
        approvedCount++;
        totalApprovedDays += req.totalDays;
      } else if (req.status === 'Pending') {
        pendingCount++;
        if (req.parentStatus === 'Waiting for Acknowledgement') {
          parentPendingCount++;
        }
      } else if (req.status === 'Rejected') {
        rejectedCount++;
      }
    });

    const settings = await LeaveSettings.findOne() || {
      minimumAdvanceHours: 12,
      emergencyMinimumHours: 2,
      maximumLeaveDays: 14
    };

    res.json({
      success: true,
      data: {
        student,
        stats: {
          totalApprovedDays,
          pendingCount,
          approvedCount,
          rejectedCount,
          parentPendingCount
        },
        settings: {
          minimumAdvanceHours: settings.minimumAdvanceHours,
          emergencyMinimumHours: settings.emergencyMinimumHours,
          maximumLeaveDays: settings.maximumLeaveDays
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to load student profile: ${error.message}`
    });
  }
};

// @desc    Apply for student leave
// @route   POST /api/student/leaves
// @access  Private (Student)
const applyLeave = async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      startTime = '09:00 AM',
      endTime = '05:00 PM',
      calculatedTotalDays,
      reason,
      documentUrl
    } = req.body;

    const student = req.student;
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to perform this action. Student profile missing.'
      });
    }

    // Generate unique Request ID
    let requestId = generateRequestId();
    let exists = await LeaveRequest.findOne({ requestId });
    while (exists) {
      requestId = generateRequestId();
      exists = await LeaveRequest.findOne({ requestId });
    }

    // Create Leave Request in MongoDB
    const leaveRequest = await LeaveRequest.create({
      requestId,
      studentUserId: req.user._id,
      studentId: student.studentId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      totalDays: calculatedTotalDays,
      reason,
      documentUrl: documentUrl || null,
      status: 'Pending',
      parentStatus: 'Waiting for Acknowledgement',
      submittedAt: new Date()
    });

    // Create Notification for Student
    await Notification.create({
      userId: req.user._id,
      title: 'Leave Submitted',
      message: `Your leave request ${requestId} (${leaveType}, ${calculatedTotalDays} days) was submitted successfully. Waiting for parent acknowledgement.`,
      type: 'leave_status'
    });

    // Notify Faculty assigned to this student's class
    const assignedFaculty = await Faculty.find({
      'assignedClasses.department': student.department,
      'assignedClasses.year': student.year,
      'assignedClasses.section': student.section
    });

    for (const fac of assignedFaculty) {
      await Notification.create({
        userId: fac.userId,
        title: 'New Leave Request',
        message: `Student ${student.name} (${student.studentId}, ${student.department} Year ${student.year}-${student.section}) submitted leave request ${requestId}.`,
        type: 'leave_status'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully. Parent acknowledgement has been requested.',
      data: leaveRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Submission failed: ${error.message}`
    });
  }
};

// @desc    Get all leave requests of the authenticated student
// @route   GET /api/student/leaves
// @access  Private (Student)
const getMyLeaves = async (req, res) => {
  try {
    const student = req.student;
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'Student profile not found.'
      });
    }

    // Security: Only find requests where studentId is strictly req.student.studentId
    const leaves = await LeaveRequest.find({ studentId: student.studentId })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to retrieve leave requests: ${error.message}`
    });
  }
};

// @desc    Get leave request details by ID
// @route   GET /api/student/leaves/:id
// @access  Private (Student)
const getLeaveById = async (req, res) => {
  try {
    const student = req.student;
    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { requestId: req.params.id.toUpperCase() }
      ]
    }).populate('reviewedBy', 'name email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    // Security check: Must belong to current student
    if (leave.studentId !== student.studentId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view another student\'s leave record.'
      });
    }

    res.json({
      success: true,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch leave details: ${error.message}`
    });
  }
};

// @desc    Get notifications for authenticated student
// @route   GET /api/student/notifications
// @access  Private (Student)
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      read: false
    });

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch notifications: ${error.message}`
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/student/notifications/:id/read
// @access  Private (Student)
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update notification: ${error.message}`
    });
  }
};

module.exports = {
  getProfile,
  applyLeave,
  getMyLeaves,
  getLeaveById,
  getNotifications,
  markNotificationRead
};
