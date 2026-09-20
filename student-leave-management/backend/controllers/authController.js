const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'college_leave_mgmt_super_secret_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login details. Please provide email or Student/Faculty ID and password.'
      });
    }

    const trimmedIdentifier = identifier.trim();

    // Check if identifier is an email or studentId/facultyId
    let user = await User.findOne({ email: trimmedIdentifier.toLowerCase() });

    if (!user) {
      // Try finding student by studentId
      const student = await Student.findOne({ studentId: trimmedIdentifier.toUpperCase() });
      if (student) {
        user = await User.findById(student.userId);
      }
    }

    if (!user) {
      // Try finding faculty by facultyId
      const faculty = await Faculty.findOne({ facultyId: trimmedIdentifier.toUpperCase() });
      if (faculty) {
        user = await User.findById(faculty.userId);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details.'
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by administration. Please contact the college office.'
      });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details.'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Fetch related profile
    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({ userId: user._id }).populate('parentId');
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Login error: ${error.message}`
    });
  }
};

// @desc    Logout user / invalidate session
// @route   POST /api/auth/logout
// @access  Public / Protected
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get currently authenticated user details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'student') {
      profile = req.student || await Student.findOne({ userId: req.user._id }).populate('parentId');
    } else if (req.user.role === 'faculty') {
      profile = req.faculty || await Faculty.findOne({ userId: req.user._id });
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        accountStatus: req.user.accountStatus,
        profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch user: ${error.message}`
    });
  }
};

module.exports = {
  login,
  logout,
  getMe
};
