const express = require('express');
const router = express.Router();
const {
  getStudents,
  createStudent,
  updateStudent,
  getFaculty,
  getAllLeaves,
  getSettings,
  updateSettings,
  getStats
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/students', getStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.get('/faculty', getFaculty);
router.get('/leaves', getAllLeaves);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/stats', getStats);

module.exports = router;
