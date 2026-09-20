/**
 * Student Dashboard Logic
 */

const StudentDashboard = {
  async init() {
    const user = Auth.checkAuth('student');
    if (!user) return;

    await this.loadProfileAndStats();
    await this.loadRecentLeaves();
  },

  async loadProfileAndStats() {
    try {
      const res = await CollegeAPI.getStudentProfile();
      if (!res.success) {
        console.error('Failed to load student profile:', res.message);
        return;
      }

      const { student, stats, settings } = res.data;

      // Update student profile banner
      const nameElem = document.getElementById('student-name');
      const infoElem = document.getElementById('student-info');
      const ruleElem = document.getElementById('student-rule-notice');

      if (nameElem) nameElem.innerText = student.name;
      if (infoElem) {
        infoElem.innerText = `Roll No: ${student.studentId} | Dept: ${student.department} | Year: ${student.year} | Section: ${student.section}`;
      }
      if (ruleElem && settings) {
        ruleElem.innerHTML = `
          <strong>College Leave Policy:</strong> Normal leave must be submitted at least 
          <strong>${settings.minimumAdvanceHours} hours</strong> in advance. 
          ${settings.emergencyLeaveEnabled ? `Emergency leave requires at least <strong>${settings.emergencyMinimumHours} hours</strong> notice.` : ''}
          Maximum duration: <strong>${settings.maximumLeaveDays} days</strong>.
        `;
      }

      // Update metric cards
      document.getElementById('stat-approved-days').innerText = stats.totalApprovedDays || 0;
      document.getElementById('stat-pending').innerText = stats.pendingCount || 0;
      document.getElementById('stat-approved').innerText = stats.approvedCount || 0;
      document.getElementById('stat-rejected').innerText = stats.rejectedCount || 0;
      document.getElementById('stat-parent-pending').innerText = stats.parentPendingCount || 0;

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  },

  async loadRecentLeaves() {
    const tbody = document.getElementById('recent-leaves-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading requests...</td></tr>`;

    try {
      const res = await CollegeAPI.getMyLeaves();
      if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No leave requests recorded yet. Click "Apply Leave" to submit your first request.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(item => {
        const parentBadgeClass = item.parentStatus === 'Acknowledged' ? 'badge-parent-ack' : 'badge-parent-wait';
        const statusBadgeClass = item.status === 'Approved' ? 'badge-approved' : (item.status === 'Rejected' ? 'badge-rejected' : 'badge-pending');

        return `
          <tr>
            <td><strong style="color: var(--primary);">${item.requestId}</strong></td>
            <td>${item.leaveType}</td>
            <td>${item.startDate} to ${item.endDate}</td>
            <td><strong>${item.totalDays}</strong> day(s)</td>
            <td><span class="badge ${parentBadgeClass}">${item.parentStatus}</span></td>
            <td><span class="badge ${statusBadgeClass}">${item.status}</span></td>
            <td>
              <a href="leave-details.html?id=${item.requestId}" class="btn btn-sm btn-outline">View Details</a>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to load requests: ${err.message}</td></tr>`;
    }
  },

  // Security Case 1 Demonstration: Student tries to submit with someone else's ID
  async demoSecurityCase1() {
    const user = CollegeAPI.getCurrentUser();
    const forgedId = user.profile.studentId === 'CS202401' ? 'CS202402' : 'CS202401';
    
    alert(`[HACKATHON DEMO: CASE 1]\nAttempting to tamper request payload by sending studentId: '${forgedId}' while logged in as '${user.name}' (${user.profile.studentId}).`);

    const fakePayload = {
      studentId: forgedId, // FORGED ID
      leaveType: 'Personal Leave',
      startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
      startTime: '09:00 AM',
      reason: 'Malicious attempt to submit leave for another peer.'
    };

    const res = await CollegeAPI.applyLeave(fakePayload);
    if (!res.success) {
      alert(`[SECURITY SUCCESS: REQUEST REJECTED]\nBackend Security Validation triggered:\n\n"${res.message}"\n\nThe server rejected the forged ID and preserved data integrity!`);
    } else {
      alert(`Unexpected: Submission passed.`);
    }
  },

  // Security Case 2 Demonstration: Student tries to submit late request past deadline
  async demoSecurityCase2() {
    alert(`[HACKATHON DEMO: CASE 2]\nAttempting to submit Normal Leave starting 2 hours from now (Violating 12-hour advance notice requirement).`);

    const todayStr = new Date().toISOString().split('T')[0];
    const fakePayload = {
      leaveType: 'Personal Leave',
      startDate: todayStr,
      endDate: todayStr,
      startTime: '10:00 AM',
      reason: 'Attempting late submission after deadline.'
    };

    const res = await CollegeAPI.applyLeave(fakePayload);
    if (!res.success) {
      alert(`[DEADLINE VALIDATION SUCCESS: REJECTED]\nBackend Deadline Rule triggered:\n\n"${res.message}"\n\nLate leave requests are strictly blocked by the server!`);
    } else {
      alert(`Submission result: ${res.message}`);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('student.html')) {
    StudentDashboard.init();
  }
});
