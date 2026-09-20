const express = require('express');
const router = express.Router();
const {
  getLeaveForParent,
  sendParentOtp,
  acknowledgeLeave
} = require('../controllers/parentController');

// Public routes protected by request ID matching & verification code
router.get('/leave/:id', getLeaveForParent);
router.post('/leave/:id/otp', sendParentOtp);
router.post('/leave/:id/acknowledge', acknowledgeLeave);

module.exports = router;
