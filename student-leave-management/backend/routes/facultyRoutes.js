const express = require('express');
const router = express.Router();
const {
  getAssignedLeaves,
  getLeaveDetails,
  approveLeave,
  rejectLeave
} = require('../controllers/facultyController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require faculty role
router.use(protect);
router.use(authorize('faculty'));

router.get('/leaves', getAssignedLeaves);
router.get('/leaves/:id', getLeaveDetails);
router.put('/leaves/:id/approve', approveLeave);
router.put('/leaves/:id/reject', rejectLeave);

module.exports = router;
