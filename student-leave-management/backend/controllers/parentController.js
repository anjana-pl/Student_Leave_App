const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Notification = require('../models/Notification');

// @desc    Get leave request for parent view
// @route   GET /api/parent/leave/:id
// @access  Public (Requires phone verification or OTP)
const getLeaveForParent = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, otp } = req.query;

    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { requestId: id.toUpperCase() }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    const student = await Student.findOne({ studentId: leave.studentId });
    const parent = student ? await Parent.findOne({ studentId: student.studentId }) : null;

    // Mask sensitive parent phone for privacy if not verified yet
    let maskedPhone = parent && parent.phone
      ? parent.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      : 'Registered Parent Number';

    res.json({
      success: true,
      data: {
        requestId: leave.requestId,
        studentName: student ? student.name : 'Unknown',
        studentId: leave.studentId,
        department: student ? student.department : '',
        year: student ? student.year : '',
        section: student ? student.section : '',
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        startTime: leave.startTime,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        parentStatus: leave.parentStatus,
        parentAcknowledgedAt: leave.parentAcknowledgedAt,
        parentName: parent ? parent.name : 'Parent / Guardian',
        parentPhoneMasked: maskedPhone,
        submittedAt: leave.submittedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to load parent view: ${error.message}`
    });
  }
};

// @desc    Generate and send Parent OTP for verification
// @route   POST /api/parent/leave/:id/otp
// @access  Public
const sendParentOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { requestId: id.toUpperCase() }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    const parent = await Parent.findOne({ studentId: leave.studentId });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'No registered parent details found for this student.'
      });
    }

    // Generate 6-digit secure OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    parent.otp = generatedOtp;
    parent.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
    await parent.save();

    console.log(`[SMS Gateway Simulator] OTP sent to parent ${parent.name} (${parent.phone}): ${generatedOtp}`);

    res.json({
      success: true,
      message: `Verification OTP has been dispatched to parent's registered mobile number (${parent.phone}).`,
      // Return simulated OTP in response for testing/demo ease
      demoOtp: generatedOtp,
      parentPhone: parent.phone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to send OTP: ${error.message}`
    });
  }
};

// @desc    Parent acknowledges leave request with OTP verification
// @route   POST /api/parent/leave/:id/acknowledge
// @access  Public (Protected via OTP or verification code)
const acknowledgeLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, remark, parentName } = req.body;

    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { requestId: id.toUpperCase() }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    if (leave.parentStatus === 'Acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'This leave request has already been acknowledged by the parent.'
      });
    }

    const parent = await Parent.findOne({ studentId: leave.studentId });
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'No registered parent record found.'
      });
    }

    // Verify OTP (allow pre-seeded demo OTP "123456" or current valid OTP)
    const validOtp = parent.otp || '123456';
    if (!otp || (otp !== validOtp && otp !== '123456')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP. Please enter the correct verification code sent to your phone.'
      });
    }

    // Clear used OTP
    parent.otp = null;
    parent.otpExpires = null;
    await parent.save();

    // Update leave request parent status
    leave.parentStatus = 'Acknowledged';
    leave.parentAcknowledgedAt = new Date();
    leave.parentRemark = remark || 'Acknowledged by parent.';
    await leave.save();

    // Notify student that parent acknowledged
    await Notification.create({
      userId: leave.studentUserId,
      title: 'Parent Acknowledged Leave',
      message: `Your parent (${parent.name}) has confirmed and acknowledged leave request ${leave.requestId}. The request is now awaiting faculty review.`,
      type: 'parent_alert'
    });

    res.json({
      success: true,
      message: `Leave request ${leave.requestId} has been successfully acknowledged. The faculty advisor has been notified.`,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Acknowledgement failed: ${error.message}`
    });
  }
};

module.exports = {
  getLeaveForParent,
  sendParentOtp,
  acknowledgeLeave
};
