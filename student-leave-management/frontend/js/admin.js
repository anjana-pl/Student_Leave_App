/**
 * Admin Dashboard Management Logic
 */

const AdminDashboard = {
  activeTab: 'rules',

  async init() {
    const user = Auth.checkAuth('admin');
    if (!user) return;

    await this.loadStats();
    await this.loadSettings();
    await this.loadAllLeaves();
    await this.loadStudents();
    await this.loadFaculty();

    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Leave filters
    const leaveFilter = document.getElementById('admin-leave-filter-status');
    if (leaveFilter) leaveFilter.addEventListener('change', () => this.loadAllLeaves());
    const deptFilter = document.getElementById('admin-leave-filter-dept');
    if (deptFilter) deptFilter.addEventListener('change', () => this.loadAllLeaves());
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.className = 'btn btn-primary admin-tab-btn';
      } else {
        btn.className = 'btn btn-secondary admin-tab-btn';
      }
    });

    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.style.display = content.id === `tab-${tabName}` ? 'block' : 'none';
    });
  },

  async loadStats() {
    try {
      const res = await CollegeAPI.getAdminStats();
      if (res.success && res.data) {
        const d = res.data;
        document.getElementById('admin-stat-students').innerText = d.totalStudents;
        document.getElementById('admin-stat-faculty').innerText = d.totalFaculty;
        document.getElementById('admin-stat-leaves').innerText = d.totalLeaves;
        document.getElementById('admin-stat-pending').innerText = d.pendingLeaves;
        document.getElementById('admin-stat-ack-rate').innerText = `${d.parentAckRate}%`;
      }
    } catch (err) {
      console.error('Error loading admin stats:', err);
    }
  },

  async loadSettings() {
    try {
      const res = await CollegeAPI.getAdminSettings();
      if (res.success && res.data) {
        const s = res.data;
        document.getElementById('setting-advance-hours').value = s.minimumAdvanceHours;
        document.getElementById('setting-emergency-enabled').checked = s.emergencyLeaveEnabled;
        document.getElementById('setting-emergency-hours').value = s.emergencyMinimumHours;
        document.getElementById('setting-max-days').value = s.maximumLeaveDays;
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  },

  setPresetAdvanceHours(hours) {
    document.getElementById('setting-advance-hours').value = hours;
  },

  async saveSettings(e) {
    if (e) e.preventDefault();
    const minHours = document.getElementById('setting-advance-hours').value;
    const emEnabled = document.getElementById('setting-emergency-enabled').checked;
    const emHours = document.getElementById('setting-emergency-hours').value;
    const maxDays = document.getElementById('setting-max-days').value;

    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true;
    btn.innerText = 'Updating Policy Rules...';

    try {
      const res = await CollegeAPI.updateAdminSettings({
        minimumAdvanceHours: Number(minHours),
        emergencyLeaveEnabled: emEnabled,
        emergencyMinimumHours: Number(emHours),
        maximumLeaveDays: Number(maxDays)
      });

      if (res.success) {
        alert('College Leave Submission Policy successfully updated. All future requests will be validated against this rule.');
      } else {
        alert(`Failed to update settings: ${res.message}`);
      }
    } catch (err) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerText = 'Save Leave Policy Rules';
    }
  },

  async loadAllLeaves() {
    const tbody = document.getElementById('admin-leaves-tbody');
    if (!tbody) return;

    const status = document.getElementById('admin-leave-filter-status').value;
    const dept = document.getElementById('admin-leave-filter-dept').value;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Loading requests...</td></tr>`;

    try {
      const res = await CollegeAPI.getAdminLeaves({ status, department: dept });
      if (!res.success || !res.data || res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 18px;">No leave requests found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.data.map(l => {
        const parentBadge = l.parentStatus === 'Acknowledged' ? 'badge-parent-ack' : 'badge-parent-wait';
        const statusBadge = l.status === 'Approved' ? 'badge-approved' : (l.status === 'Rejected' ? 'badge-rejected' : 'badge-pending');

        return `
          <tr>
            <td><strong style="color: var(--primary);">${l.requestId}</strong></td>
            <td><strong>${l.studentName}</strong> (${l.studentId})</td>
            <td>${l.department} (Yr ${l.year || 3})</td>
            <td>${l.leaveType}</td>
            <td>${l.startDate} to ${l.endDate}</td>
            <td><strong>${l.totalDays}</strong></td>
            <td><span class="badge ${parentBadge}">${l.parentStatus}</span></td>
            <td><span class="badge ${statusBadge}">${l.status}</span></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger);">Failed: ${err.message}</td></tr>`;
    }
  },

  async loadStudents() {
    const tbody = document.getElementById('admin-students-tbody');
    if (!tbody) return;

    try {
      const res = await CollegeAPI.getAdminStudents();
      if (!res.success || !res.data) return;

      tbody.innerHTML = res.data.map(s => `
        <tr>
          <td><strong>${s.studentId}</strong></td>
          <td>${s.name}</td>
          <td>${s.department}</td>
          <td>Year ${s.year} - Sec ${s.section}</td>
          <td>${s.email}</td>
          <td>${s.parent ? s.parent.name + ' (' + s.parent.phone + ')' : 'Parent Registered'}</td>
          <td>
            <span class="badge ${s.accountStatus === 'active' ? 'badge-approved' : 'badge-rejected'}">${s.accountStatus || 'active'}</span>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="AdminDashboard.toggleStudentStatus('${s.id || s._id}', '${s.accountStatus || 'active'}')">
              ${s.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  },

  async toggleStudentStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const confirmChange = confirm(`Are you sure you want to change student status to ${nextStatus.toUpperCase()}?`);
    if (!confirmChange) return;

    try {
      await CollegeAPI.updateAdminStudent(id, { accountStatus: nextStatus });
      await this.loadStudents();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  },

  async loadFaculty() {
    const tbody = document.getElementById('admin-faculty-tbody');
    if (!tbody) return;

    try {
      const res = await CollegeAPI.getAdminFaculty();
      if (!res.success || !res.data) return;

      tbody.innerHTML = res.data.map(f => {
        const classes = f.assignedClasses && f.assignedClasses.length > 0
          ? f.assignedClasses.map(c => `${c.department} (Yr ${c.year}-${c.section})`).join(', ')
          : 'CSE Year 3-A';

        return `
          <tr>
            <td><strong>${f.facultyId}</strong></td>
            <td>${f.name}</td>
            <td>${f.department}</td>
            <td>${f.email}</td>
            <td>${classes}</td>
            <td><span class="badge badge-approved">Active Advisor</span></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load faculty:', err);
    }
  },

  openAddStudentModal() {
    const modal = document.getElementById('add-student-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeAddStudentModal() {
    const modal = document.getElementById('add-student-modal');
    if (modal) modal.style.display = 'none';
  },

  async handleAddStudentSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-stud-name').value.trim();
    const studentId = document.getElementById('new-stud-id').value.trim().toUpperCase();
    const department = document.getElementById('new-stud-dept').value;
    const year = document.getElementById('new-stud-year').value;
    const section = document.getElementById('new-stud-section').value.toUpperCase();
    const email = document.getElementById('new-stud-email').value.trim();
    const parentName = document.getElementById('new-stud-parent-name').value.trim();
    const parentPhone = document.getElementById('new-stud-parent-phone').value.trim();

    try {
      const res = await CollegeAPI.createAdminStudent({
        name, studentId, department, year, section, email, parentName, parentPhone
      });

      if (res.success) {
        alert(`Student ${name} (${studentId}) registered successfully.`);
        this.closeAddStudentModal();
        await this.loadStudents();
        await this.loadStats();
      } else {
        alert(`Error: ${res.message}`);
      }
    } catch (err) {
      alert(`Failed to add student: ${err.message}`);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('admin.html')) {
    AdminDashboard.init();
  }
});
