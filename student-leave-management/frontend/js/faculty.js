/**
 * Faculty / Class Advisor Dashboard Logic
 */

const FacultyDashboard = {
  currentLeaveInModal: null,

  async init() {
    const user = Auth.checkAuth('faculty');
    if (!user) return;

    // Faculty greeting
    const welcomeElem = document.getElementById('faculty-welcome');
    if (welcomeElem) {
      welcomeElem.innerText = `Welcome, ${user.name} (${user.profile ? user.profile.facultyId : 'Faculty'})`;
    }

    // Attach filters
    document.getElementById('filter-status').addEventListener('change', () => this.loadRequests());
    document.getElementById('filter-parent-status').addEventListener('change', () => this.loadRequests());
    document.getElementById('filter-search').addEventListener('input', () => this.loadRequests());

    await this.loadRequests();
  },

  async loadRequests() {
    const tbody = document.getElementById('faculty-requests-tbody');
    if (!tbody) return;

    const status = document.getElementById('filter-status').value;
    const parentStatus = document.getElementById('filter-parent-status').value;
    const search = document.getElementById('filter-search').value.trim();

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">Loading requests...</td></tr>`;

    try {
      const res = await CollegeAPI.getFacultyLeaves({ status, parentStatus, search });
      if (!res.success) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger);">Failed: ${res.message}</td></tr>`;
        return;
      }

      // Update stat cards
      const stats = res.stats;
      if (stats) {
        document.getElementById('stat-total').innerText = stats.totalRequests || 0;
        document.getElementById('stat-pending').innerText = stats.pendingCount || 0;
        document.getElementById('stat-parent-pending').innerText = stats.parentPendingCount || 0;
        document.getElementById('stat-approved').innerText = stats.approvedCount || 0;
        document.getElementById('stat-rejected').innerText = stats.rejectedCount || 0;
      }

      if (!res.data || res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No student leave requests matching criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(req => {
        const parentBadge = req.parentStatus === 'Acknowledged' ? 'badge-parent-ack' : 'badge-parent-wait';
        const statusBadge = req.status === 'Approved' ? 'badge-approved' : (req.status === 'Rejected' ? 'badge-rejected' : 'badge-pending');

        return `
          <tr>
            <td><strong style="color: var(--primary);">${req.requestId}</strong></td>
            <td>
              <strong>${req.studentName}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${req.studentId}</div>
            </td>
            <td>${req.department}<div style="font-size: 11px; color: var(--text-muted);">Yr ${req.year} - Sec ${req.section}</div></td>
            <td>${req.leaveType}</td>
            <td>${req.startDate} to ${req.endDate}</td>
            <td><strong>${req.totalDays}</strong></td>
            <td><span class="badge ${parentBadge}">${req.parentStatus}</span></td>
            <td><span class="badge ${statusBadge}">${req.status}</span></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="FacultyDashboard.openReviewModal('${req.requestId}')">
                Review Request
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger);">Error loading requests: ${err.message}</td></tr>`;
    }
  },

  async openReviewModal(requestId) {
    const modal = document.getElementById('review-modal');
    if (!modal) return;

    try {
      const res = await CollegeAPI.getFacultyLeaveDetails(requestId);
      if (!res.success || !res.data) {
        alert(res.message || 'Failed to load details.');
        return;
      }

      const { leave, student, leaveHistory } = res.data;
      this.currentLeaveInModal = leave;

      document.getElementById('modal-request-id').innerText = leave.requestId;
      document.getElementById('modal-student-name').innerText = student.name;
      document.getElementById('modal-student-id').innerText = student.studentId;
      document.getElementById('modal-student-class').innerText = `${student.department} (Year ${student.year}, Section ${student.section})`;
      document.getElementById('modal-leave-type').innerText = leave.leaveType;
      document.getElementById('modal-dates').innerText = `${leave.startDate} to ${leave.endDate} (${leave.totalDays} days)`;
      document.getElementById('modal-reason').innerText = leave.reason;

      // Document
      const docElem = document.getElementById('modal-document');
      if (leave.documentUrl) {
        docElem.innerHTML = `<span style="color: var(--accent-blue); font-weight: 600;">📎 Attached: ${leave.documentUrl}</span>`;
      } else {
        docElem.innerText = 'No document attached';
      }

      // Parent acknowledgement
      const parentStatusElem = document.getElementById('modal-parent-status');
      const parentBadge = leave.parentStatus === 'Acknowledged' ? 'badge-parent-ack' : 'badge-parent-wait';
      parentStatusElem.innerHTML = `
        <span class="badge ${parentBadge}">${leave.parentStatus}</span>
        ${leave.parentAcknowledgedAt ? `<span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">(Confirmed at ${new Date(leave.parentAcknowledgedAt).toLocaleTimeString()})</span>` : ''}
      `;

      // Render Previous Leave History
      const historyList = document.getElementById('modal-leave-history');
      if (leaveHistory && leaveHistory.length > 0) {
        historyList.innerHTML = leaveHistory.map(h => `
          <div style="padding: 8px; border-bottom: 1px solid var(--border-color); font-size: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
              <span>${h.requestId} • ${h.leaveType} (${h.totalDays} days)</span>
              <span class="badge ${h.status === 'Approved' ? 'badge-approved' : (h.status === 'Rejected' ? 'badge-rejected' : 'badge-pending')}">${h.status}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11px;">Dates: ${h.startDate} to ${h.endDate} | Remark: ${h.facultyRemark || 'None'}</div>
          </div>
        `).join('');
      } else {
        historyList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); padding: 6px;">No previous leave records on file.</div>`;
      }

      // Reset remark input and actions
      document.getElementById('modal-remark').value = leave.facultyRemark || '';
      const actionContainer = document.getElementById('modal-actions');

      if (leave.status === 'Pending') {
        actionContainer.innerHTML = `
          <button class="btn btn-secondary" onclick="FacultyDashboard.closeReviewModal()">Cancel</button>
          <button class="btn btn-danger" onclick="FacultyDashboard.handleReject()">Reject with Remark</button>
          <button class="btn btn-success" onclick="FacultyDashboard.handleApprove()">Approve Leave</button>
        `;
      } else {
        actionContainer.innerHTML = `
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted); margin-right: 12px;">Already ${leave.status} on ${new Date(leave.reviewedAt).toLocaleDateString()}</span>
          <button class="btn btn-secondary" onclick="FacultyDashboard.closeReviewModal()">Close</button>
        `;
      }

      modal.style.display = 'flex';
    } catch (err) {
      alert(`Error loading modal: ${err.message}`);
    }
  },

  closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'none';
    this.currentLeaveInModal = null;
  },

  async handleApprove() {
    if (!this.currentLeaveInModal) return;
    const remark = document.getElementById('modal-remark').value.trim();

    if (this.currentLeaveInModal.parentStatus !== 'Acknowledged') {
      const confirmApproval = confirm('Notice: Parent has not yet acknowledged this request. Are you sure you want to approve prior to parent acknowledgement?');
      if (!confirmApproval) return;
    }

    try {
      const res = await CollegeAPI.approveLeave(this.currentLeaveInModal.requestId, remark);
      if (res.success) {
        alert(`Leave request ${this.currentLeaveInModal.requestId} approved. Student notification generated.`);
        this.closeReviewModal();
        await this.loadRequests();
      } else {
        alert(`Approval error: ${res.message}`);
      }
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  },

  async handleReject() {
    if (!this.currentLeaveInModal) return;
    const remark = document.getElementById('modal-remark').value.trim();

    // Faculty MUST enter a reason/remark when rejecting
    if (!remark) {
      alert('College Rule Requirement:\nFaculty MUST provide a reason/remark when rejecting a student leave request.');
      document.getElementById('modal-remark').focus();
      return;
    }

    try {
      const res = await CollegeAPI.rejectLeave(this.currentLeaveInModal.requestId, remark);
      if (res.success) {
        alert(`Leave request ${this.currentLeaveInModal.requestId} rejected with remark: "${remark}". Student notified.`);
        this.closeReviewModal();
        await this.loadRequests();
      } else {
        alert(`Rejection error: ${res.message}`);
      }
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('faculty.html')) {
    FacultyDashboard.init();
  }
});
