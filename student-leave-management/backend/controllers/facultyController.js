const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Notification = require('../models/Notification');

// @desc    Get leave requests for faculty's assigned students
// @route   GET /api/faculty/leaves
// @access  Private (Faculty)
const getAssignedLeaves = async (req, res) => {
  try {
    const faculty = req.faculty || await Faculty.findOne({ userId: req.user._id });
    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: 'Faculty profile not found.'
      });
    }

    // Build matching criteria for students assigned to this faculty
    const classConditions = faculty.assignedClasses.map(c => ({
      department: c.department,
      year: c.year,
      section: c.section
    }));

    let studentFilter = {};
    if (classConditions.length > 0) {
      studentFilter = { $or: classConditions };
    } else {
      studentFilter = { department: faculty.department };
    }

    const assignedStudents = await Student.find(studentFilter);
    const assignedStudentIds = assignedStudents.map(s => s.studentId);

    const { status, parentStatus, search } = req.query;

    const query = { studentId: { $in: assignedStudentIds } };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (parentStatus && parentStatus !== 'all') {
      query.parentStatus = parentStatus;
    }

    const leaveRequests = await LeaveRequest.find(query).sort({ submittedAt: -1 });

    // Map student details into requests
    const studentMap = {};
    assignedStudents.forEach(s => {
      studentMap[s.studentId] = s;
    });

    let results = leaveRequests.map(req => {
      const student = studentMap[req.studentId] || {};
      return {
        ...req.toObject(),
        studentName: student.name || 'Unknown',
        department: student.department || '',
        year: student.year || '',
        section: student.section || '',
        studentEmail: student.email || '',
        studentPhone: student.phone || ''
      };
    });

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q)
      );
    }

    // Compute stats
    const totalRequests = results.length;
    const pendingCount = results.filter(r => r.status === 'Pending').length;
    const parentPendingCount = results.filter(r => r.status === 'Pending' && r.parentStatus === 'Waiting for Acknowledgement').length;
    const approvedCount = results.filter(r => r.status === 'Approved').length;
    const rejectedCount = results.filter(r => r.status === 'Rejected').length;

    res.json({
      success: true,
      stats: {
        totalRequests,
        pendingCount,
        parentPendingCount,
        approvedCount,
        rejectedCount
      },
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch faculty requests: ${error.message}`
    });
  }
};

// @desc    Get single leave request details with student's past leave history
// @route   GET /api/faculty/leaves/:id
// @access  Private (Faculty)
const getLeaveDetails = async (req, res) => {
  try {
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

    // Get Student details
    const student = await Student.findOne({ studentId: leave.studentId }).populate('parentId');

    // Get previous leave history of this student (excluding current request)
    const leaveHistory = await LeaveRequest.find({
      studentId: leave.studentId,
      _id: { $ne: leave._id }
    }).sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        leave,
        student,
        leaveHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to load leave details: ${error.message}`
    });
  }
};

// @desc    Approve student leave request
// @route   PUT /api/faculty/leaves/:id/approve
// @access  Private (Faculty)
const approveLeave = async (req, res) => {
  try {
    const { remark } = req.body;

    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { requestId: req.params.id.toUpperCase() }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${leave.status.toLowerCase()}.`
      });
    }

    leave.status = 'Approved';
    leave.facultyRemark = remark || 'Approved as requested.';
    leave.reviewedAt = new Date();
    leave.reviewedBy = req.user._id;

    await leave.save();

    // Create Notification for the student
    await Notification.create({
      userId: leave.studentUserId,
      title: 'Leave Approved',
      message: `Your leave request ${leave.requestId} has been approved. ${leave.facultyRemark ? 'Remark: ' + leave.facultyRemark : ''}`,
      type: 'leave_status'
    });

    res.json({
      success: true,
      message: `Leave request ${leave.requestId} approved successfully.`,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Approval failed: ${error.message}`
    });
  }
};

// @desc    Reject student leave request (Remark is mandatory!)
// @route   PUT /api/faculty/leaves/:id/reject
// @access  Private (Faculty)
const rejectLeave = async (req, res) => {
  try {
    const { remark } = req.body;

    // Faculty MUST enter a reason/remark when rejecting
    if (!remark || remark.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Faculty must provide a reason/remark when rejecting a leave request.'
      });
    }

    const leave = await LeaveRequest.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { requestId: req.params.id.toUpperCase() }
      ]
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${leave.status.toLowerCase()}.`
      });
    }

    leave.status = 'Rejected';
    leave.facultyRemark = remark.trim();
    leave.reviewedAt = new Date();
    leave.reviewedBy = req.user._id;

    await leave.save();

    // Create Notification for the student
    await Notification.create({
      userId: leave.studentUserId,
      title: 'Leave Rejected',
      message: `Your leave request ${leave.requestId} has been rejected. Remark: ${leave.facultyRemark}`,
      type: 'leave_status'
    });

    res.json({
      success: true,
      message: `Leave request ${leave.requestId} rejected.`,
      data: leave
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Rejection failed: ${error.message}`
    });
  }
};

module.exports = {
  getAssignedLeaves,
  getLeaveDetails,
  approveLeave,
  rejectLeave
};
