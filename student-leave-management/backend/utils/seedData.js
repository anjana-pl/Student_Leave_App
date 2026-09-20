const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Parent = require('../models/Parent');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveSettings = require('../models/LeaveSettings');
const Notification = require('../models/Notification');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_leave_db';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding data...');

    // Clear existing data
    await User.deleteMany({});
    await Student.deleteMany({});
    await Faculty.deleteMany({});
    await Parent.deleteMany({});
    await LeaveRequest.deleteMany({});
    await LeaveSettings.deleteMany({});
    await Notification.deleteMany({});

    console.log('[Seed] Cleared existing records.');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    // 1. Create Admin User
    const adminUser = await User.create({
      name: 'College Academic Dean (Admin)',
      email: 'admin@college.edu',
      passwordHash: adminPasswordHash,
      role: 'admin',
      accountStatus: 'active'
    });

    // 2. Create Faculty User
    const facultyUser1 = await User.create({
      name: 'Dr. Ramesh Kumar',
      email: 'faculty1@college.edu',
      passwordHash: defaultPasswordHash,
      role: 'faculty',
      accountStatus: 'active'
    });

    const faculty1 = await Faculty.create({
      userId: facultyUser1._id,
      facultyId: 'FAC101',
      name: 'Dr. Ramesh Kumar',
      department: 'Computer Science & Engineering',
      assignedClasses: [
        { department: 'Computer Science & Engineering', year: 3, section: 'A' },
        { department: 'Computer Science & Engineering', year: 3, section: 'B' }
      ]
    });

    // 3. Create Student 1 (Aarav Sharma)
    const studentUser1 = await User.create({
      name: 'Aarav Sharma',
      email: 'student1@college.edu',
      passwordHash: defaultPasswordHash,
      role: 'student',
      accountStatus: 'active'
    });

    const parent1 = await Parent.create({
      studentId: 'CS202401',
      name: 'Suresh Sharma',
      phone: '9876543210',
      email: 'parent.sharma@example.com',
      verificationStatus: 'verified',
      otp: '123456'
    });

    const student1 = await Student.create({
      userId: studentUser1._id,
      studentId: 'CS202401',
      name: 'Aarav Sharma',
      department: 'Computer Science & Engineering',
      year: 3,
      section: 'A',
      email: 'student1@college.edu',
      phone: '9811223344',
      parentId: parent1._id
    });

    // 4. Create Student 2 (Priya Patel)
    const studentUser2 = await User.create({
      name: 'Priya Patel',
      email: 'student2@college.edu',
      passwordHash: defaultPasswordHash,
      role: 'student',
      accountStatus: 'active'
    });

    const parent2 = await Parent.create({
      studentId: 'CS202402',
      name: 'Vikram Patel',
      phone: '9876501234',
      email: 'parent.patel@example.com',
      verificationStatus: 'verified',
      otp: '123456'
    });

    const student2 = await Student.create({
      userId: studentUser2._id,
      studentId: 'CS202402',
      name: 'Priya Patel',
      department: 'Computer Science & Engineering',
      year: 3,
      section: 'A',
      email: 'student2@college.edu',
      phone: '9822334455',
      parentId: parent2._id
    });

    // 5. Create Default Leave Settings
    await LeaveSettings.create({
      minimumAdvanceHours: 12,
      emergencyLeaveEnabled: true,
      emergencyMinimumHours: 2,
      maximumLeaveDays: 14
    });

    // 6. Create Sample Leave Requests for Demonstration
    // A historic approved leave for Aarav
    const pastLeave = await LeaveRequest.create({
      requestId: 'LR1001',
      studentUserId: studentUser1._id,
      studentId: 'CS202401',
      leaveType: 'Medical Leave',
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      totalDays: 3,
      reason: 'Suffering from seasonal viral fever with severe cough and fatigue.',
      documentUrl: 'medical_prescription_fever.pdf',
      status: 'Approved',
      parentStatus: 'Acknowledged',
      parentAcknowledgedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      facultyRemark: 'Medical certificate verified. Approved.',
      reviewedBy: facultyUser1._id,
      submittedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    });

    // A current pending leave waiting for parent acknowledgement
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 3);
    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 4);

    const pendingLeave = await LeaveRequest.create({
      requestId: 'LR1024',
      studentUserId: studentUser1._id,
      studentId: 'CS202401',
      leaveType: 'Personal Leave',
      startDate: futureDate1,
      endDate: futureDate2,
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      totalDays: 2,
      reason: 'Attending elder sister marriage ceremony in native hometown.',
      documentUrl: 'wedding_invitation.pdf',
      status: 'Pending',
      parentStatus: 'Waiting for Acknowledgement',
      submittedAt: new Date()
    });

    // Create Initial Notifications
    await Notification.create({
      userId: studentUser1._id,
      title: 'Leave Request LR1024 Submitted',
      message: 'Your leave request LR1024 was submitted. Waiting for parent acknowledgement.',
      type: 'leave_status'
    });

    await Notification.create({
      userId: facultyUser1._id,
      title: 'New Leave Request LR1024',
      message: 'Student Aarav Sharma (CS202401) has submitted leave request LR1024.',
      type: 'leave_status'
    });

    console.log('[Seed] Database successfully seeded with:');
    console.log(' - Admin: admin@college.edu / admin123');
    console.log(' - Faculty: faculty1@college.edu / password123 (FAC101 - Dr. Ramesh Kumar)');
    console.log(' - Student: student1@college.edu / password123 (CS202401 - Aarav Sharma)');
    console.log(' - Student 2: student2@college.edu / password123 (CS202402 - Priya Patel)');
    console.log(' - Parent OTP demo code: 123456');

    process.exit(0);
  } catch (err) {
    console.error(`[Seed] Error seeding database: ${err.message}`);
    process.exit(1);
  }
};

seedDB();
