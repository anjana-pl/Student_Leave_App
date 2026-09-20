/**
 * Notifications Management
 */

const NotificationsManager = {
  async init() {
    Auth.checkAuth();
    await this.loadNotificationsList();
    this.startPolling();
  },

  async loadNotificationsList() {
    const listElem = document.getElementById('notifications-list');
    if (!listElem) return;

    listElem.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Checking notifications...</div>`;

    try {
      const res = await CollegeAPI.getNotifications();
      if (!res.success || !res.data || res.data.length === 0) {
        listElem.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 30px; background-color: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            No notifications yet. You will receive real-time alerts when leave requests are submitted, parent-acknowledged, or reviewed by faculty.
          </div>
        `;
        return;
      }

      listElem.innerHTML = res.data.map(n => `
        <div class="card" style="margin-bottom: 12px; border-left: 4px solid ${n.read ? 'var(--border-color)' : 'var(--accent-blue)'}; background-color: ${n.read ? 'var(--bg-card)' : 'var(--primary-light)'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: var(--primary); font-size: 14px;">${n.title}</strong>
            <span style="font-size: 11px; color: var(--text-muted);">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(n.createdAt).toLocaleDateString()}</span>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${n.message}</p>
          ${!n.read ? `<button class="btn btn-sm btn-outline" onclick="NotificationsManager.markAsRead('${n.id || n._id}')">Mark as Read</button>` : '<span style="font-size: 11px; color: var(--text-muted);">✓ Read</span>'}
        </div>
      `).join('');

      // Update badge if present
      const badge = document.getElementById('nav-notif-count');
      if (badge && res.unreadCount > 0) {
        badge.innerText = res.unreadCount;
        badge.style.display = 'inline-block';
      }
    } catch (err) {
      listElem.innerHTML = `<div style="color: var(--danger);">Failed to load notifications: ${err.message}</div>`;
    }
  },

  async markAsRead(id) {
    try {
      await CollegeAPI.markNotificationRead(id);
      await this.loadNotificationsList();
    } catch (e) {
      console.error(e);
    }
  },

  startPolling() {
    setInterval(async () => {
      try {
        const res = await CollegeAPI.getNotifications();
        const badge = document.getElementById('nav-notif-count');
        if (badge) {
          if (res.unreadCount > 0) {
            badge.innerText = res.unreadCount;
            badge.style.display = 'inline-block';
          } else {
            badge.style.display = 'none';
          }
        }
      } catch (e) {}
    }, 10000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('notifications.html')) {
    NotificationsManager.init();
  }
});
