const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Parent = require('../models/Parent');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveSettings = require('../models/LeaveSettings');
const bcrypt = require('bcryptjs');

// @desc    Get all students with filters & pagination
// @route   GET /api/admin/students
// @access  Private (Admin)
const getStudents = async (req, res) => {
  try {
    const { department, year, section, search } = req.query;
    const query = {};

    if (department && department !== 'all') query.department = department;
    if (year && year !== 'all') query.year = parseInt(year, 10);
    if (section && section !== 'all') query.section = section;

    let students = await Student.find(query).populate('userId', 'email accountStatus createdAt').populate('parentId');

    if (search) {
      const q = search.toLowerCase();
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch students: ${error.message}`
    });
  }
};

// @desc    Create new student account
// @route   POST /api/admin/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
  try {
    const {
      name,
      studentId,
      department,
      year,
      section,
      email,
      phone,
      password = 'password123',
      parentName,
      parentPhone,
      parentEmail
    } = req.body;

    if (!name || !studentId || !department || !year || !section || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, studentId, department, year, section, email.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const existingStudent = await Student.findOne({ studentId: studentId.toUpperCase() });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'A student with this Student ID already exists.'
      });
    }

    // 1. Create User
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      accountStatus: 'active'
    });

    // 2. Create Parent record
    let parent = null;
    if (parentName && parentPhone) {
      parent = await Parent.create({
        studentId: studentId.toUpperCase(),
        name: parentName,
        phone: parentPhone,
        email: parentEmail || `parent.${email.toLowerCase()}`,
        verificationStatus: 'verified'
      });
    }

    // 3. Create Student record
    const student = await Student.create({
      userId: user._id,
      studentId: studentId.toUpperCase(),
      name,
      department,
      year: parseInt(year, 10),
      section: section.toUpperCase(),
      email: email.toLowerCase(),
      phone: phone || '',
      parentId: parent ? parent._id : null
    });

    res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to create student: ${error.message}`
    });
  }
};

// @desc    Update student or toggle account status (e.g. suspend/enable)
// @route   PUT /api/admin/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    const { name, department, year, section, phone, accountStatus } = req.body;

    if (name) student.name = name;
    if (department) student.department = department;
    if (year) student.year = parseInt(year, 10);
    if (section) student.section = section.toUpperCase();
    if (phone) student.phone = phone;
    await student.save();

    if (accountStatus) {
      await User.findByIdAndUpdate(student.userId, { accountStatus });
    }

    res.json({
      success: true,
      message: 'Student record updated successfully.',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update student: ${error.message}`
    });
  }
};

// @desc    Get all faculty members
// @route   GET /api/admin/faculty
// @access  Private (Admin)
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find().populate('userId', 'email accountStatus');
    res.json({
      success: true,
      count: faculty.length,
      data: faculty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch faculty: ${error.message}`
    });
  }
};

// @desc    Get all leave requests across the college with comprehensive filters
// @route   GET /api/admin/leaves
// @access  Private (Admin)
const getAllLeaves = async (req, res) => {
  try {
    const { department, status, leaveType, search, startDate, endDate } = req.query;

    let leaves = await LeaveRequest.find().sort({ submittedAt: -1 });

    // Populate student details
    const studentIds = [...new Set(leaves.map(l => l.studentId))];
    const students = await Student.find({ studentId: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.studentId] = s;
    });

    let results = leaves.map(l => {
      const student = studentMap[l.studentId] || {};
      return {
        ...l.toObject(),
        studentName: student.name || 'Unknown',
        department: student.department || '',
        year: student.year || '',
        section: student.section || ''
      };
    });

    // Apply filters
    if (department && department !== 'all') {
      results = results.filter(r => r.department === department);
    }
    if (status && status !== 'all') {
      results = results.filter(r => r.status === status);
    }
    if (leaveType && leaveType !== 'all') {
      results = results.filter(r => r.leaveType === leaveType);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch leave requests: ${error.message}`
    });
  }
};

// @desc    Get college leave rule settings
// @route   GET /api/admin/settings
// @access  Private (Admin)
const getSettings = async (req, res) => {
  try {
    let settings = await LeaveSettings.findOne();
    if (!settings) {
      settings = await LeaveSettings.create({
        minimumAdvanceHours: 12,
        emergencyLeaveEnabled: true,
        emergencyMinimumHours: 2,
        maximumLeaveDays: 14
      });
    }
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch leave settings: ${error.message}`
    });
  }
};

// @desc    Update college leave rule settings (e.g. 6h, 12h, 24h, custom)
// @route   PUT /api/admin/settings
// @access  Private (Admin)
const updateSettings = async (req, res) => {
  try {
    const {
      minimumAdvanceHours,
      emergencyLeaveEnabled,
      emergencyMinimumHours,
      maximumLeaveDays
    } = req.body;

    let settings = await LeaveSettings.findOne();
    if (!settings) {
      settings = new LeaveSettings();
    }

    if (minimumAdvanceHours !== undefined) settings.minimumAdvanceHours = Number(minimumAdvanceHours);
    if (emergencyLeaveEnabled !== undefined) settings.emergencyLeaveEnabled = Boolean(emergencyLeaveEnabled);
    if (emergencyMinimumHours !== undefined) settings.emergencyMinimumHours = Number(emergencyMinimumHours);
    if (maximumLeaveDays !== undefined) settings.maximumLeaveDays = Number(maximumLeaveDays);
    settings.updatedAt = new Date();

    await settings.save();

    res.json({
      success: true,
      message: 'College leave policy rules updated successfully.',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to update leave settings: ${error.message}`
    });
  }
};

// @desc    Get aggregate analytics & statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();
    const totalLeaves = await LeaveRequest.countDocuments();
    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'Pending' });
    const approvedLeaves = await LeaveRequest.countDocuments({ status: 'Approved' });
    const rejectedLeaves = await LeaveRequest.countDocuments({ status: 'Rejected' });
    const parentPending = await LeaveRequest.countDocuments({ parentStatus: 'Waiting for Acknowledgement' });
    const parentAcknowledged = await LeaveRequest.countDocuments({ parentStatus: 'Acknowledged' });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalFaculty,
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        parentPending,
        parentAcknowledged,
        parentAckRate: totalLeaves > 0 ? Math.round((parentAcknowledged / totalLeaves) * 100) : 100
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to load statistics: ${error.message}`
    });
  }
};

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  getFaculty,
  getAllLeaves,
  getSettings,
  updateSettings,
  getStats
};
