const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');

// Protect routes - Verify JWT Token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'You are not authorized to perform this action. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'college_leave_mgmt_super_secret_jwt_key_2026'
    );

    // Fetch user details
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: User account no longer exists.'
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by administration. Please contact the college office.'
      });
    }

    req.user = user;

    // Attach student or faculty profile based on role
    if (user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: user._id });
      req.student = studentProfile;
    } else if (user.role === 'faculty') {
      const facultyProfile = await Faculty.findOne({ userId: user._id });
      req.faculty = facultyProfile;
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'You are not authorized to perform this action. Token is invalid or expired.'
    });
  }
};

// Authorize specific user roles (e.g. 'student', 'faculty', 'admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
