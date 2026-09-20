/**
 * Unified API Client for College Student Leave Management System
 * Automatically connects to Express REST API if available;
 * seamlessly uses persistent local engine if running standalone/offline.
 */

const API_BASE = window.location.origin.startsWith('http') && !window.location.origin.includes('file:')
  ? '' 
  : 'http://localhost:5000';

const CollegeAPI = {
  isLiveServer: false,

  async init() {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        this.isLiveServer = true;
        console.log('[CollegeAPI] Connected to live Express REST backend:', data);
        return;
      }
    } catch (e) {
      console.warn('[CollegeAPI] Live backend not detected. Utilizing local storage persistence engine.');
    }
    this.isLiveServer = false;
    this.initLocalStorageEngine();
  },

  getAuthToken() {
    return localStorage.getItem('college_auth_token');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('college_auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setAuthSession(token, user) {
    localStorage.setItem('college_auth_token', token);
    localStorage.setItem('college_auth_user', JSON.stringify(user));
  },

  clearAuthSession() {
    localStorage.removeItem('college_auth_token');
    localStorage.removeItem('college_auth_user');
  },

  // ---------------- Authentication ----------------
  async login(identifier, password) {
    if (this.isLiveServer) {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (res.ok) {
        this.setAuthSession(data.token, data.user);
      }
      return data;
    }
    return this.mockEngine.login(identifier, password);
  },

  async logout() {
    this.clearAuthSession();
    if (this.isLiveServer) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
      } catch (e) {}
    }
    return { success: true, message: 'Logged out successfully' };
  },

  // ---------------- Student Endpoints ----------------
  async getStudentProfile() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/student/profile');
    }
    return this.mockEngine.getStudentProfile();
  },

  async applyLeave(leaveData) {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/student/leaves', 'POST', leaveData);
    }
    return this.mockEngine.applyLeave(leaveData);
  },

  async getMyLeaves() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/student/leaves');
    }
    return this.mockEngine.getMyLeaves();
  },

  async getLeaveById(id) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/student/leaves/${id}`);
    }
    return this.mockEngine.getLeaveById(id);
  },

  async getNotifications() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/student/notifications');
    }
    return this.mockEngine.getNotifications();
  },

  async markNotificationRead(id) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/student/notifications/${id}/read`, 'PUT');
    }
    return this.mockEngine.markNotificationRead(id);
  },

  // ---------------- Faculty Endpoints ----------------
  async getFacultyLeaves(filters = {}) {
    if (this.isLiveServer) {
      const params = new URLSearchParams(filters).toString();
      return this.fetchWithAuth(`/api/faculty/leaves?${params}`);
    }
    return this.mockEngine.getFacultyLeaves(filters);
  },

  async getFacultyLeaveDetails(id) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/faculty/leaves/${id}`);
    }
    return this.mockEngine.getFacultyLeaveDetails(id);
  },

  async approveLeave(id, remark) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/faculty/leaves/${id}/approve`, 'PUT', { remark });
    }
    return this.mockEngine.approveLeave(id, remark);
  },

  async rejectLeave(id, remark) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/faculty/leaves/${id}/reject`, 'PUT', { remark });
    }
    return this.mockEngine.rejectLeave(id, remark);
  },

  // ---------------- Parent Endpoints ----------------
  async getParentLeave(id) {
    if (this.isLiveServer) {
      const res = await fetch(`${API_BASE}/api/parent/leave/${id}`);
      return await res.json();
    }
    return this.mockEngine.getParentLeave(id);
  },

  async sendParentOtp(id) {
    if (this.isLiveServer) {
      const res = await fetch(`${API_BASE}/api/parent/leave/${id}/otp`, { method: 'POST' });
      return await res.json();
    }
    return this.mockEngine.sendParentOtp(id);
  },

  async acknowledgeLeave(id, otp, remark) {
    if (this.isLiveServer) {
      const res = await fetch(`${API_BASE}/api/parent/leave/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, remark })
      });
      return await res.json();
    }
    return this.mockEngine.acknowledgeLeave(id, otp, remark);
  },

  // ---------------- Admin Endpoints ----------------
  async getAdminStats() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/admin/stats');
    }
    return this.mockEngine.getAdminStats();
  },

  async getAdminSettings() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/admin/settings');
    }
    return this.mockEngine.getAdminSettings();
  },

  async updateAdminSettings(settings) {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/admin/settings', 'PUT', settings);
    }
    return this.mockEngine.updateAdminSettings(settings);
  },

  async getAdminStudents(filters = {}) {
    if (this.isLiveServer) {
      const params = new URLSearchParams(filters).toString();
      return this.fetchWithAuth(`/api/admin/students?${params}`);
    }
    return this.mockEngine.getAdminStudents(filters);
  },

  async createAdminStudent(studentData) {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/admin/students', 'POST', studentData);
    }
    return this.mockEngine.createAdminStudent(studentData);
  },

  async updateAdminStudent(id, studentData) {
    if (this.isLiveServer) {
      return this.fetchWithAuth(`/api/admin/students/${id}`, 'PUT', studentData);
    }
    return this.mockEngine.updateAdminStudent(id, studentData);
  },

  async getAdminFaculty() {
    if (this.isLiveServer) {
      return this.fetchWithAuth('/api/admin/faculty');
    }
    return this.mockEngine.getAdminFaculty();
  },

  async getAdminLeaves(filters = {}) {
    if (this.isLiveServer) {
      const params = new URLSearchParams(filters).toString();
      return this.fetchWithAuth(`/api/admin/leaves?${params}`);
    }
    return this.mockEngine.getAdminLeaves(filters);
  },

  async fetchWithAuth(endpoint, method = 'GET', body = null) {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    return data;
  },

  // ---------------- Local Engine Setup ----------------
  initLocalStorageEngine() {
    if (!localStorage.getItem('col_engine_seeded_v1')) {
      const defaultUsers = [
        {
          id: 'u_stud1',
          name: 'Aarav Sharma',
          email: 'student1@college.edu',
          role: 'student',
          accountStatus: 'active',
          studentId: 'CS202401',
          department: 'Computer Science & Engineering',
          year: 3,
          section: 'A',
          phone: '9811223344',
          parent: {
            name: 'Suresh Sharma',
            phone: '9876543210',
            email: 'parent.sharma@example.com'
          }
        },
        {
          id: 'u_stud2',
          name: 'Priya Patel',
          email: 'student2@college.edu',
          role: 'student',
          accountStatus: 'active',
          studentId: 'CS202402',
          department: 'Computer Science & Engineering',
          year: 3,
          section: 'A',
          phone: '9822334455',
          parent: {
            name: 'Vikram Patel',
            phone: '9876501234',
            email: 'parent.patel@example.com'
          }
        },
        {
          id: 'u_fac1',
          name: 'Dr. Ramesh Kumar',
          email: 'faculty1@college.edu',
          role: 'faculty',
          accountStatus: 'active',
          facultyId: 'FAC101',
          department: 'Computer Science & Engineering',
          assignedClasses: [
            { department: 'Computer Science & Engineering', year: 3, section: 'A' },
            { department: 'Computer Science & Engineering', year: 3, section: 'B' }
          ]
        },
        {
          id: 'u_admin',
          name: 'College Academic Administration',
          email: 'admin@college.edu',
          role: 'admin',
          accountStatus: 'active'
        }
      ];

      const defaultSettings = {
        minimumAdvanceHours: 12,
        emergencyLeaveEnabled: true,
        emergencyMinimumHours: 2,
        maximumLeaveDays: 14
      };

      const now = new Date();
      const pastStart = new Date(now.getTime() - 15 * 86400000).toISOString().split('T')[0];
      const pastEnd = new Date(now.getTime() - 13 * 86400000).toISOString().split('T')[0];

      const futStart = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0];
      const futEnd = new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0];

      const defaultLeaves = [
        {
          _id: 'l_1001',
          requestId: 'LR1001',
          studentUserId: 'u_stud1',
          studentId: 'CS202401',
          studentName: 'Aarav Sharma',
          department: 'Computer Science & Engineering',
          year: 3,
          section: 'A',
          leaveType: 'Medical Leave',
          startDate: pastStart,
          endDate: pastEnd,
          startTime: '09:00 AM',
          totalDays: 3,
          reason: 'Severe viral fever with throat infection. Doctor advised bed rest.',
          documentUrl: 'medical_certificate.pdf',
          status: 'Approved',
          parentStatus: 'Acknowledged',
          parentAcknowledgedAt: new Date(now.getTime() - 16 * 86400000).toISOString(),
          facultyRemark: 'Medical certificate verified. Approved.',
          submittedAt: new Date(now.getTime() - 16 * 86400000).toISOString(),
          reviewedAt: new Date(now.getTime() - 15 * 86400000).toISOString()
        },
        {
          _id: 'l_1024',
          requestId: 'LR1024',
          studentUserId: 'u_stud1',
          studentId: 'CS202401',
          studentName: 'Aarav Sharma',
          department: 'Computer Science & Engineering',
          year: 3,
          section: 'A',
          leaveType: 'Personal Leave',
          startDate: futStart,
          endDate: futEnd,
          startTime: '09:00 AM',
          totalDays: 2,
          reason: 'Attending elder sister marriage ceremony in native hometown.',
          documentUrl: 'invitation.pdf',
          status: 'Pending',
          parentStatus: 'Waiting for Acknowledgement',
          parentAcknowledgedAt: null,
          facultyRemark: '',
          submittedAt: new Date().toISOString()
        }
      ];

      const defaultNotifications = [
        {
          id: 'notif_1',
          userId: 'u_stud1',
          title: 'Leave Request Submitted',
          message: 'Leave request LR1024 submitted. Waiting for parent acknowledgement.',
          type: 'leave_status',
          read: false,
          createdAt: new Date().toISOString()
        }
      ];

      localStorage.setItem('col_users', JSON.stringify(defaultUsers));
      localStorage.setItem('col_settings', JSON.stringify(defaultSettings));
      localStorage.setItem('col_leaves', JSON.stringify(defaultLeaves));
      localStorage.setItem('col_notifications', JSON.stringify(defaultNotifications));
      localStorage.setItem('col_engine_seeded_v1', 'true');
    }
  }
};

// ---------------- In-Browser High-Fidelity Mock Engine ----------------
CollegeAPI.mockEngine = {
  getUsers() {
    return JSON.parse(localStorage.getItem('col_users') || '[]');
  },
  getSettings() {
    return JSON.parse(localStorage.getItem('col_settings') || '{"minimumAdvanceHours":12,"emergencyLeaveEnabled":true,"emergencyMinimumHours":2,"maximumLeaveDays":14}');
  },
  getLeaves() {
    return JSON.parse(localStorage.getItem('col_leaves') || '[]');
  },
  saveLeaves(leaves) {
    localStorage.setItem('col_leaves', JSON.stringify(leaves));
  },
  getNotifications() {
    return JSON.parse(localStorage.getItem('col_notifications') || '[]');
  },
  saveNotifications(notifs) {
    localStorage.setItem('col_notifications', JSON.stringify(notifs));
  },

  login(identifier, password) {
    const users = this.getUsers();
    const id = identifier.trim().toLowerCase();
    const user = users.find(u =>
      u.email.toLowerCase() === id ||
      (u.studentId && u.studentId.toLowerCase() === id) ||
      (u.facultyId && u.facultyId.toLowerCase() === id)
    );

    if (!user || (password !== 'password123' && password !== 'admin123')) {
      return { success: false, message: 'Invalid login details.' };
    }

    if (user.accountStatus === 'suspended') {
      return { success: false, message: 'Your account has been suspended by administration. Please contact the college office.' };
    }

    const token = 'jwt_mock_token_' + Date.now();
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user
    };
    CollegeAPI.setAuthSession(token, sessionUser);
    return { success: true, token, user: sessionUser };
  },

  getStudentProfile() {
    const user = CollegeAPI.getCurrentUser();
    if (!user || user.role !== 'student') {
      return { success: false, message: 'Unauthorized' };
    }
    const leaves = this.getLeaves().filter(l => l.studentId === user.profile.studentId);
    let totalApprovedDays = 0, pendingCount = 0, approvedCount = 0, rejectedCount = 0, parentPendingCount = 0;

    leaves.forEach(l => {
      if (l.status === 'Approved') {
        approvedCount++;
        totalApprovedDays += (l.totalDays || 1);
      } else if (l.status === 'Pending') {
        pendingCount++;
        if (l.parentStatus === 'Waiting for Acknowledgement') {
          parentPendingCount++;
        }
      } else if (l.status === 'Rejected') {
        rejectedCount++;
      }
    });

    const settings = this.getSettings();
    return {
      success: true,
      data: {
        student: user.profile,
        stats: { totalApprovedDays, pendingCount, approvedCount, rejectedCount, parentPendingCount },
        settings
      }
    };
  },

  applyLeave(data) {
    const user = CollegeAPI.getCurrentUser();
    if (!user || user.role !== 'student') {
      return { success: false, message: 'Unauthorized: Student login required.' };
    }

    // SECURITY CHECK 1: Student Identity Binding (A student cannot submit using another student's ID)
    if (data.studentId && data.studentId !== user.profile.studentId) {
      return {
        success: false,
        securityAlert: true,
        message: 'Security Violation: You cannot apply for leave on behalf of another student. The system has rejected the forged Student ID.'
      };
    }

    const { leaveType, startDate, endDate, startTime = '09:00 AM', reason } = data;
    if (!leaveType || !startDate || !endDate || !reason) {
      return { success: false, message: 'Please provide all required fields.' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // SECURITY CHECK 2: Prevent Past Leave
    if (start.getTime() < today.getTime()) {
      return { success: false, message: 'Past leave dates cannot be submitted.' };
    }

    if (end.getTime() < start.getTime()) {
      return { success: false, message: 'End date cannot be earlier than start date.' };
    }

    // SECURITY CHECK 3: Advance Deadline using server/device time
    const settings = this.getSettings();
    const timeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    let startHour = 9;
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      startHour = h;
    }

    const leaveDateTime = new Date(start);
    leaveDateTime.setHours(startHour, 0, 0, 0);

    const hoursUntil = (leaveDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (leaveType === 'Emergency Leave') {
      if (!settings.emergencyLeaveEnabled) {
        return { success: false, message: 'Emergency leave is currently disabled by administration.' };
      }
      if (hoursUntil < settings.emergencyMinimumHours) {
        return {
          success: false,
          message: `Emergency leave request cannot be submitted because the minimum notice period (${settings.emergencyMinimumHours} hours) has passed.`
        };
      }
    } else {
      if (hoursUntil < settings.minimumAdvanceHours) {
        return {
          success: false,
          message: 'Leave request cannot be submitted because the submission deadline has passed.'
        };
      }
    }

    // Calculate total days
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    if (totalDays > settings.maximumLeaveDays) {
      return {
        success: false,
        message: `Leave duration (${totalDays} days) exceeds maximum allowable limit (${settings.maximumLeaveDays} days).`
      };
    }

    // SECURITY CHECK 4: Duplicate / Overlapping Leave
    const leaves = this.getLeaves();
    const studentLeaves = leaves.filter(l => l.studentId === user.profile.studentId && (l.status === 'Pending' || l.status === 'Approved'));

    for (const l of studentLeaves) {
      const existingStart = new Date(l.startDate);
      const existingEnd = new Date(l.endDate);
      existingStart.setHours(0, 0, 0, 0);
      existingEnd.setHours(0, 0, 0, 0);

      if (start.getTime() <= existingEnd.getTime() && end.getTime() >= existingStart.getTime()) {
        return {
          success: false,
          message: 'A leave request already exists for these dates.'
        };
      }
    }

    // Generate Request ID e.g. "LR1025"
    const reqId = 'LR' + Math.floor(1000 + Math.random() * 9000);
    const newLeave = {
      _id: 'l_' + Date.now(),
      requestId: reqId,
      studentUserId: user.id,
      studentId: user.profile.studentId,
      studentName: user.name,
      department: user.profile.department,
      year: user.profile.year,
      section: user.profile.section,
      leaveType,
      startDate,
      endDate,
      startTime,
      totalDays,
      reason,
      documentUrl: data.documentUrl || null,
      status: 'Pending',
      parentStatus: 'Waiting for Acknowledgement',
      parentAcknowledgedAt: null,
      facultyRemark: '',
      submittedAt: new Date().toISOString()
    };

    leaves.unshift(newLeave);
    this.saveLeaves(leaves);

    // Create Notification
    const notifs = this.getNotifications();
    notifs.unshift({
      id: 'notif_' + Date.now(),
      userId: user.id,
      title: 'Leave Submitted',
      message: `Your leave request ${reqId} was submitted successfully. Waiting for parent acknowledgement.`,
      type: 'leave_status',
      read: false,
      createdAt: new Date().toISOString()
    });
    this.saveNotifications(notifs);

    return {
      success: true,
      message: 'Leave request submitted successfully. Parent acknowledgement has been requested.',
      data: newLeave
    };
  },

  getMyLeaves() {
    const user = CollegeAPI.getCurrentUser();
    if (!user || user.role !== 'student') {
      return { success: false, message: 'Unauthorized' };
    }
    const leaves = this.getLeaves().filter(l => l.studentId === user.profile.studentId);
    return { success: true, count: leaves.length, data: leaves };
  },

  getLeaveById(id) {
    const user = CollegeAPI.getCurrentUser();
    const leave = this.getLeaves().find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) {
      return { success: false, message: 'Leave request not found.' };
    }
    if (user && user.role === 'student' && leave.studentId !== user.profile.studentId) {
      return { success: false, message: 'You are not authorized to view another student\'s leave record.' };
    }
    return { success: true, data: leave };
  },

  getNotifications() {
    const user = CollegeAPI.getCurrentUser();
    if (!user) return { success: true, data: [], unreadCount: 0 };
    const notifs = this.getNotifications().filter(n => n.userId === user.id);
    const unreadCount = notifs.filter(n => !n.read).length;
    return { success: true, data: notifs, unreadCount };
  },

  markNotificationRead(id) {
    const notifs = this.getNotifications();
    const n = notifs.find(item => item.id === id);
    if (n) n.read = true;
    this.saveNotifications(notifs);
    return { success: true };
  },

  // Faculty Mock Handlers
  getFacultyLeaves(filters = {}) {
    let leaves = this.getLeaves();
    if (filters.status && filters.status !== 'all') {
      leaves = leaves.filter(l => l.status === filters.status);
    }
    if (filters.parentStatus && filters.parentStatus !== 'all') {
      leaves = leaves.filter(l => l.parentStatus === filters.parentStatus);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      leaves = leaves.filter(l =>
        (l.studentName && l.studentName.toLowerCase().includes(q)) ||
        (l.studentId && l.studentId.toLowerCase().includes(q)) ||
        (l.requestId && l.requestId.toLowerCase().includes(q))
      );
    }

    const all = this.getLeaves();
    const stats = {
      totalRequests: all.length,
      pendingCount: all.filter(l => l.status === 'Pending').length,
      parentPendingCount: all.filter(l => l.status === 'Pending' && l.parentStatus === 'Waiting for Acknowledgement').length,
      approvedCount: all.filter(l => l.status === 'Approved').length,
      rejectedCount: all.filter(l => l.status === 'Rejected').length
    };

    return { success: true, stats, data: leaves };
  },

  getFacultyLeaveDetails(id) {
    const leave = this.getLeaves().find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave not found' };

    const users = this.getUsers();
    const studentUser = users.find(u => u.studentId === leave.studentId);
    const history = this.getLeaves().filter(l => l.studentId === leave.studentId && l.requestId !== leave.requestId);

    return {
      success: true,
      data: {
        leave,
        student: studentUser || { name: leave.studentName, studentId: leave.studentId, department: leave.department, year: leave.year, section: leave.section },
        leaveHistory: history
      }
    };
  },

  approveLeave(id, remark) {
    const leaves = this.getLeaves();
    const leave = leaves.find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave not found' };

    leave.status = 'Approved';
    leave.facultyRemark = remark || 'Approved by class advisor.';
    leave.reviewedAt = new Date().toISOString();
    this.saveLeaves(leaves);

    // Create Notification for Student
    const notifs = this.getNotifications();
    notifs.unshift({
      id: 'notif_' + Date.now(),
      userId: leave.studentUserId,
      title: 'Leave Approved',
      message: `Your leave request ${leave.requestId} has been approved. ${leave.facultyRemark ? 'Remark: ' + leave.facultyRemark : ''}`,
      type: 'leave_status',
      read: false,
      createdAt: new Date().toISOString()
    });
    this.saveNotifications(notifs);

    return { success: true, message: `Leave request ${leave.requestId} approved successfully.`, data: leave };
  },

  rejectLeave(id, remark) {
    if (!remark || remark.trim().length === 0) {
      return { success: false, message: 'Faculty must provide a reason/remark when rejecting a leave request.' };
    }
    const leaves = this.getLeaves();
    const leave = leaves.find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave not found' };

    leave.status = 'Rejected';
    leave.facultyRemark = remark.trim();
    leave.reviewedAt = new Date().toISOString();
    this.saveLeaves(leaves);

    // Create Notification for Student
    const notifs = this.getNotifications();
    notifs.unshift({
      id: 'notif_' + Date.now(),
      userId: leave.studentUserId,
      title: 'Leave Rejected',
      message: `Your leave request ${leave.requestId} has been rejected. Remark: ${leave.facultyRemark}`,
      type: 'leave_status',
      read: false,
      createdAt: new Date().toISOString()
    });
    this.saveNotifications(notifs);

    return { success: true, message: `Leave request ${leave.requestId} rejected.`, data: leave };
  },

  // Parent Mock Handlers
  getParentLeave(id) {
    const leave = this.getLeaves().find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave request not found.' };

    const users = this.getUsers();
    const studentUser = users.find(u => u.studentId === leave.studentId);
    const parent = studentUser ? studentUser.parent : { name: 'Parent / Guardian', phone: '9876543210' };

    return {
      success: true,
      data: {
        requestId: leave.requestId,
        studentName: leave.studentName,
        studentId: leave.studentId,
        department: leave.department,
        year: leave.year,
        section: leave.section,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        startTime: leave.startTime,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status,
        parentStatus: leave.parentStatus,
        parentAcknowledgedAt: leave.parentAcknowledgedAt,
        parentName: parent.name,
        parentPhoneMasked: parent.phone ? parent.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : '987****210',
        submittedAt: leave.submittedAt
      }
    };
  },

  sendParentOtp(id) {
    const leave = this.getLeaves().find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave request not found.' };
    return {
      success: true,
      message: 'Verification OTP has been dispatched to parent\'s registered mobile number.',
      demoOtp: '123456'
    };
  },

  acknowledgeLeave(id, otp, remark) {
    if (!otp || (otp !== '123456' && otp.length !== 6)) {
      return { success: false, message: 'Invalid or expired OTP. Use demo OTP 123456.' };
    }
    const leaves = this.getLeaves();
    const leave = leaves.find(l => l.requestId === id.toUpperCase() || l._id === id);
    if (!leave) return { success: false, message: 'Leave request not found.' };

    leave.parentStatus = 'Acknowledged';
    leave.parentAcknowledgedAt = new Date().toISOString();
    leave.parentRemark = remark || 'Acknowledged by parent.';
    this.saveLeaves(leaves);

    // Notify Student
    const notifs = this.getNotifications();
    notifs.unshift({
      id: 'notif_' + Date.now(),
      userId: leave.studentUserId,
      title: 'Parent Acknowledged Leave',
      message: `Your parent has acknowledged leave request ${leave.requestId}. It is now queued for faculty review.`,
      type: 'parent_alert',
      read: false,
      createdAt: new Date().toISOString()
    });
    this.saveNotifications(notifs);

    return {
      success: true,
      message: `Leave request ${leave.requestId} has been acknowledged. Faculty advisor has been alerted.`,
      data: leave
    };
  },

  // Admin Mock Handlers
  getAdminStats() {
    const users = this.getUsers();
    const leaves = this.getLeaves();
    return {
      success: true,
      data: {
        totalStudents: users.filter(u => u.role === 'student').length,
        totalFaculty: users.filter(u => u.role === 'faculty').length,
        totalLeaves: leaves.length,
        pendingLeaves: leaves.filter(l => l.status === 'Pending').length,
        approvedLeaves: leaves.filter(l => l.status === 'Approved').length,
        rejectedLeaves: leaves.filter(l => l.status === 'Rejected').length,
        parentPending: leaves.filter(l => l.parentStatus === 'Waiting for Acknowledgement').length,
        parentAcknowledged: leaves.filter(l => l.parentStatus === 'Acknowledged').length,
        parentAckRate: leaves.length > 0 ? Math.round((leaves.filter(l => l.parentStatus === 'Acknowledged').length / leaves.length) * 100) : 100
      }
    };
  },

  getAdminSettings() {
    return { success: true, data: this.getSettings() };
  },

  updateAdminSettings(settings) {
    const current = this.getSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
    localStorage.setItem('col_settings', JSON.stringify(updated));
    return { success: true, message: 'College leave policy rules updated successfully.', data: updated };
  },

  getAdminStudents(filters = {}) {
    let users = this.getUsers().filter(u => u.role === 'student');
    if (filters.department && filters.department !== 'all') {
      users = users.filter(u => u.department === filters.department);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.studentId.toLowerCase().includes(q));
    }
    return { success: true, count: users.length, data: users };
  },

  createAdminStudent(data) {
    const users = this.getUsers();
    if (users.find(u => u.studentId === data.studentId.toUpperCase())) {
      return { success: false, message: 'A student with this Student ID already exists.' };
    }
    const newStudent = {
      id: 'u_' + Date.now(),
      name: data.name,
      email: data.email,
      role: 'student',
      accountStatus: 'active',
      studentId: data.studentId.toUpperCase(),
      department: data.department,
      year: parseInt(data.year, 10),
      section: data.section.toUpperCase(),
      phone: data.phone || '',
      parent: {
        name: data.parentName || 'Parent',
        phone: data.parentPhone || '9876543210',
        email: data.parentEmail || ''
      }
    };
    users.push(newStudent);
    localStorage.setItem('col_users', JSON.stringify(users));
    return { success: true, message: 'Student created successfully.', data: newStudent };
  },

  updateAdminStudent(id, data) {
    const users = this.getUsers();
    const u = users.find(item => item.id === id || item.studentId === id);
    if (!u) return { success: false, message: 'Student not found.' };
    if (data.name) u.name = data.name;
    if (data.department) u.department = data.department;
    if (data.year) u.year = parseInt(data.year, 10);
    if (data.section) u.section = data.section.toUpperCase();
    if (data.accountStatus) u.accountStatus = data.accountStatus;
    localStorage.setItem('col_users', JSON.stringify(users));
    return { success: true, message: 'Student updated successfully.', data: u };
  },

  getAdminFaculty() {
    const faculty = this.getUsers().filter(u => u.role === 'faculty');
    return { success: true, count: faculty.length, data: faculty };
  },

  getAdminLeaves(filters = {}) {
    let leaves = this.getLeaves();
    if (filters.department && filters.department !== 'all') {
      leaves = leaves.filter(l => l.department === filters.department);
    }
    if (filters.status && filters.status !== 'all') {
      leaves = leaves.filter(l => l.status === filters.status);
    }
    if (filters.leaveType && filters.leaveType !== 'all') {
      leaves = leaves.filter(l => l.leaveType === filters.leaveType);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      leaves = leaves.filter(l =>
        l.studentName.toLowerCase().includes(q) ||
        l.studentId.toLowerCase().includes(q) ||
        l.requestId.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    }
    return { success: true, count: leaves.length, data: leaves };
  }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
  CollegeAPI.init();
});
