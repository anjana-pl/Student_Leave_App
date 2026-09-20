/**
 * Leave Application and Leave Details Management
 */

const LeaveManager = {
  // ---------------- Apply Leave Page ----------------
  initApplyPage() {
    const user = Auth.checkAuth('student');
    if (!user) return;

    // Pre-fill read-only student info locked to authenticated account
    document.getElementById('display-student-id').value = `${user.profile.studentId} (Authenticated & Cryptographically Locked)`;
    document.getElementById('display-student-name').value = user.name;
    document.getElementById('display-student-dept').value = `${user.profile.department} (Year ${user.profile.year}-${user.profile.section})`;

    // Set min date to today
    const todayStr = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('leave-start-date');
    const endDateInput = document.getElementById('leave-end-date');

    startDateInput.min = todayStr;
    endDateInput.min = todayStr;

    // Attach change listeners for automatic total days calculation & deadline check
    startDateInput.addEventListener('change', () => {
      if (endDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
      endDateInput.min = startDateInput.value;
      this.calculateDaysAndCheckDeadline();
    });

    endDateInput.addEventListener('change', () => {
      this.calculateDaysAndCheckDeadline();
    });

    document.getElementById('leave-type').addEventListener('change', () => {
      this.calculateDaysAndCheckDeadline();
    });

    document.getElementById('leave-start-time').addEventListener('change', () => {
      this.calculateDaysAndCheckDeadline();
    });

    // Form submission listener
    const form = document.getElementById('apply-leave-form');
    form.addEventListener('submit', (e) => this.handleApplySubmit(e));
  },

  calculateDaysAndCheckDeadline() {
    const startVal = document.getElementById('leave-start-date').value;
    const endVal = document.getElementById('leave-end-date').value;
    const leaveType = document.getElementById('leave-type').value;
    const startTime = document.getElementById('leave-start-time').value;
    const daysOutput = document.getElementById('calculated-days');
    const deadlineAlert = document.getElementById('deadline-warning-box');

    if (!startVal || !endVal) {
      daysOutput.value = '';
      if (deadlineAlert) deadlineAlert.style.display = 'none';
      return;
    }

    const start = new Date(startVal);
    const end = new Date(endVal);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    daysOutput.value = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;

    // Advance deadline calculation
    const now = new Date();
    let startHour = 9;
    const timeMatch = startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      startHour = h;
    }

    const leaveStartDateTime = new Date(start);
    leaveStartDateTime.setHours(startHour, 0, 0, 0);

    const hoursUntil = (leaveStartDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const isEmergency = leaveType === 'Emergency Leave';
    const requiredHours = isEmergency ? 2 : 12;

    if (hoursUntil < requiredHours) {
      deadlineAlert.className = 'alert alert-danger';
      deadlineAlert.innerHTML = `
        <div>
          <strong>Submission Deadline Warning:</strong> You have selected a leave start time that is 
          <strong>${Math.max(0, Math.round(hoursUntil))} hours</strong> away. 
          ${isEmergency ? 'Emergency leave requires at least 2 hours advance notice.' : 'Normal leave requires at least 12 hours advance submission.'}
          The server will reject this submission if submitted past the deadline.
        </div>
      `;
      deadlineAlert.style.display = 'flex';
    } else {
      deadlineAlert.className = 'alert alert-info';
      deadlineAlert.innerHTML = `
        <div>
          <strong>Advance Notice Verified:</strong> This request is being submitted 
          <strong>${Math.round(hoursUntil)} hours</strong> ahead of schedule, fulfilling college leave advance notice rules.
        </div>
      `;
      deadlineAlert.style.display = 'flex';
    }
  },

  async handleApplySubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-leave-btn');
    const msgBox = document.getElementById('submit-msg-box');

    const leaveType = document.getElementById('leave-type').value;
    const startDate = document.getElementById('leave-start-date').value;
    const endDate = document.getElementById('leave-end-date').value;
    const startTime = document.getElementById('leave-start-time').value;
    const reason = document.getElementById('leave-reason').value.trim();
    const docInput = document.getElementById('leave-document');

    if (!leaveType || !startDate || !endDate || !reason) {
      this.showMessage('Please fill in all mandatory fields.', 'danger', msgBox);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting & Validating on Server...';

    // Mock document attachment name if selected
    let docUrl = null;
    if (docInput && docInput.files && docInput.files.length > 0) {
      docUrl = docInput.files[0].name;
    }

    try {
      const payload = {
        leaveType,
        startDate,
        endDate,
        startTime,
        reason,
        documentUrl: docUrl
      };

      const res = await CollegeAPI.applyLeave(payload);

      if (res.success) {
        this.showMessage(`Success! Leave request ${res.data.requestId} created. Parent acknowledgement requested. Redirecting to status...`, 'success', msgBox);
        setTimeout(() => {
          window.location.href = `leave-details.html?id=${res.data.requestId}`;
        }, 1500);
      } else {
        this.showMessage(res.message || 'Submission rejected by server.', 'danger', msgBox);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Leave Request';
      }
    } catch (err) {
      this.showMessage(`Submission failed: ${err.message}`, 'danger', msgBox);
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit Leave Request';
    }
  },

  // ---------------- Leave Details Page ----------------
  async initDetailsPage() {
    Auth.checkAuth(); // Any authenticated user or parent can view
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('id');

    if (!requestId) {
      alert('Missing Leave Request ID.');
      window.location.href = 'student.html';
      return;
    }

    try {
      const res = await CollegeAPI.getLeaveById(requestId);
      if (!res.success || !res.data) {
        document.getElementById('details-container').innerHTML = `
          <div class="alert alert-danger">
            ${res.message || 'Leave request not found or unauthorized.'}
          </div>
        `;
        return;
      }

      this.renderLeaveDetails(res.data);
    } catch (err) {
      console.error('Failed to load leave details:', err);
    }
  },

  renderLeaveDetails(leave) {
    document.getElementById('detail-request-id').innerText = leave.requestId;
    document.getElementById('detail-type').innerText = leave.leaveType;
    document.getElementById('detail-dates').innerText = `${leave.startDate} to ${leave.endDate}`;
    document.getElementById('detail-days').innerText = `${leave.totalDays} Day(s)`;
    document.getElementById('detail-time').innerText = leave.startTime || '09:00 AM';
    document.getElementById('detail-reason').innerText = leave.reason;
    document.getElementById('detail-submitted-at').innerText = new Date(leave.submittedAt).toLocaleString();

    // Supporting document
    const docElem = document.getElementById('detail-document');
    if (leave.documentUrl) {
      docElem.innerHTML = `<span style="color: var(--accent-blue);">📎 ${leave.documentUrl}</span>`;
    } else {
      docElem.innerText = 'None attached';
    }

    // Parent Status
    const parentElem = document.getElementById('detail-parent-status');
    const parentBadge = leave.parentStatus === 'Acknowledged' ? 'badge-parent-ack' : 'badge-parent-wait';
    parentElem.innerHTML = `
      <span class="badge ${parentBadge}">${leave.parentStatus}</span>
      ${leave.parentAcknowledgedAt ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Acknowledged on ${new Date(leave.parentAcknowledgedAt).toLocaleString()}</div>` : ''}
    `;

    // Parent Portal Test Link
    const parentTestBtn = document.getElementById('parent-portal-link');
    if (parentTestBtn) {
      parentTestBtn.href = `parent.html?id=${leave.requestId}`;
      if (leave.parentStatus === 'Acknowledged') {
        parentTestBtn.innerText = 'View Parent Verification Record';
      }
    }

    // Faculty Review Status
    const facultyStatusElem = document.getElementById('detail-faculty-status');
    const statusBadge = leave.status === 'Approved' ? 'badge-approved' : (leave.status === 'Rejected' ? 'badge-rejected' : 'badge-pending');
    facultyStatusElem.innerHTML = `
      <span class="badge ${statusBadge}">${leave.status}</span>
      ${leave.reviewedAt ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Reviewed on ${new Date(leave.reviewedAt).toLocaleString()}</div>` : ''}
    `;

    const remarkElem = document.getElementById('detail-faculty-remark');
    if (leave.facultyRemark) {
      remarkElem.innerText = leave.facultyRemark;
    } else {
      remarkElem.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">No remarks yet (Pending review)</span>`;
    }

    // Render Timeline
    this.renderTimeline(leave);
  },

  renderTimeline(leave) {
    const step1 = document.getElementById('timeline-step-1'); // Submitted
    const step2 = document.getElementById('timeline-step-2'); // Parent Ack
    const step3 = document.getElementById('timeline-step-3'); // Faculty Review
    const step4 = document.getElementById('timeline-step-4'); // Final Decision

    step1.className = 'timeline-step completed';

    if (leave.parentStatus === 'Acknowledged') {
      step2.className = 'timeline-step completed';
    } else {
      step2.className = 'timeline-step active';
    }

    if (leave.status === 'Pending') {
      step3.className = 'timeline-step';
      step4.className = 'timeline-step';
    } else if (leave.status === 'Approved') {
      step3.className = 'timeline-step completed';
      step4.className = 'timeline-step completed';
      step4.querySelector('.timeline-label').innerText = 'Approved';
    } else if (leave.status === 'Rejected') {
      step3.className = 'timeline-step completed';
      step4.className = 'timeline-step rejected';
      step4.querySelector('.timeline-label').innerText = 'Rejected';
    }
  },

  showMessage(msg, type, box) {
    if (!box) {
      alert(msg);
      return;
    }
    box.className = `alert alert-${type}`;
    box.innerText = msg;
    box.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('apply-leave.html')) {
    LeaveManager.initApplyPage();
  } else if (window.location.pathname.endsWith('leave-details.html')) {
    LeaveManager.initDetailsPage();
  }
});
