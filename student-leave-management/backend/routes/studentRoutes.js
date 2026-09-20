const express = require('express');
const router = express.Router();
const {
  getProfile,
  applyLeave,
  getMyLeaves,
  getLeaveById,
  getNotifications,
  markNotificationRead
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateLeaveApplication } = require('../middleware/validateLeave');

// All routes here require student role
router.use(protect);
router.use(authorize('student'));

router.get('/profile', getProfile);
router.post('/leaves', validateLeaveApplication, applyLeave);
router.get('/leaves', getMyLeaves);
router.get('/leaves/:id', getLeaveById);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
