/**
 * Authentication and Session Management
 */

const Auth = {
  checkAuth(requiredRole = null) {
    const user = CollegeAPI.getCurrentUser();
    const token = CollegeAPI.getAuthToken();

    if (!token || !user) {
      // Redirect to login page if on a protected page
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith('index.html') && !currentPath.endsWith('parent.html') && currentPath !== '/' && !currentPath.endsWith('/frontend/')) {
        window.location.href = 'index.html';
      }
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      alert(`Access Restricted: This section requires the '${requiredRole}' role. Redirecting to your authorized dashboard.`);
      this.redirectToRoleDashboard(user.role);
      return null;
    }

    this.renderHeaderUserInfo(user);
    return user;
  },

  redirectToRoleDashboard(role) {
    switch (role) {
      case 'student':
        window.location.href = 'student.html';
        break;
      case 'faculty':
        window.location.href = 'faculty.html';
        break;
      case 'admin':
        window.location.href = 'admin.html';
        break;
      default:
        window.location.href = 'index.html';
    }
  },

  renderHeaderUserInfo(user) {
    const userElem = document.getElementById('header-user-info');
    if (!userElem) return;

    let subtext = '';
    if (user.role === 'student' && user.profile) {
      subtext = `${user.profile.studentId} • ${user.profile.department || 'CSE'} (Yr ${user.profile.year || '3'})`;
    } else if (user.role === 'faculty' && user.profile) {
      subtext = `${user.profile.facultyId || 'FAC'} • Class Advisor`;
    } else if (user.role === 'admin') {
      subtext = 'Academic Dean / Admin';
    }

    userElem.innerHTML = `
      <div class="user-badge">
        <div>
          <div style="font-weight: 700; line-height: 1.1;">${user.name}</div>
          <div style="font-size: 11px; opacity: 0.85;">${subtext}</div>
        </div>
        <span class="role-tag">${user.role}</span>
        <button class="btn btn-sm btn-secondary" onclick="Auth.handleLogout()" style="margin-left: 6px; padding: 3px 8px; font-size: 11px;">Logout</button>
      </div>
    `;
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    const identifierInput = document.getElementById('login-identifier');
    const passwordInput = document.getElementById('login-password');
    const errorBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-btn');

    if (!identifierInput || !passwordInput) return;

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      this.showError('Please enter both Email/ID and Password.', errorBox);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Verifying Credentials...';
    if (errorBox) errorBox.style.display = 'none';

    try {
      const res = await CollegeAPI.login(identifier, password);
      if (res.success) {
        this.redirectToRoleDashboard(res.user.role);
      } else {
        this.showError(res.message || 'Invalid login details.', errorBox);
      }
    } catch (err) {
      this.showError(`Login failed: ${err.message}`, errorBox);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Login to Portal';
    }
  },

  async handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      await CollegeAPI.logout();
      window.location.href = 'index.html';
    }
  },

  quickLogin(role) {
    if (role === 'student') {
      document.getElementById('login-identifier').value = 'student1@college.edu';
      document.getElementById('login-password').value = 'password123';
    } else if (role === 'faculty') {
      document.getElementById('login-identifier').value = 'faculty1@college.edu';
      document.getElementById('login-password').value = 'password123';
    } else if (role === 'admin') {
      document.getElementById('login-identifier').value = 'admin@college.edu';
      document.getElementById('login-password').value = 'admin123';
    }
    this.handleLogin();
  },

  showError(msg, errorBox) {
    if (errorBox) {
      errorBox.innerText = msg;
      errorBox.style.display = 'block';
    } else {
      alert(msg);
    }
  }
};
