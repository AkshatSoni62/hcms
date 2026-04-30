import { fetchNotifications, markNotificationRead, getUnreadNotificationCount, markAllNotificationsRead } from './api.js';
import { formatDateTime } from './ui.js';

export async function loadNotifications(containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    container.innerHTML = 'Loading notifications...';
    try {
        const list = await fetchNotifications(currentUser.id);
        container.innerHTML = '';
        const markAllBtn = document.createElement('button');
        markAllBtn.className = 'btn secondary-btn';
        markAllBtn.textContent = 'Mark all as read';
        markAllBtn.style.marginBottom = '0.75rem';
        markAllBtn.addEventListener('click', async () => {
            try {
                await markAllNotificationsRead(currentUser.id);
                await loadNotifications(containerId, currentUser);
                if (typeof updateNotificationBadge === 'function') {
                    updateNotificationBadge(currentUser.id);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to mark all as read.');
            }
        });
        container.appendChild(markAllBtn);
        list.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            if (!notification.read) {
                item.classList.add('notification-unread');
            }
            const left = document.createElement('div');
            left.innerHTML = `<div class="notification-message">${notification.message}</div>
                              <div class="notification-meta">${formatDateTime(notification.createdAt)}</div>`;
            const right = document.createElement('div');
            if (!notification.read) {
                const btn = document.createElement('button');
                btn.className = 'btn secondary-btn';
                btn.textContent = 'Mark as read';
                btn.addEventListener('click', async () => {
                    try {
                        await markNotificationRead(notification.id);
                        await loadNotifications(containerId, currentUser);
                        if (typeof updateNotificationBadge === 'function') {
                            updateNotificationBadge(currentUser.id);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Failed to mark notification as read.');
                    }
                });
                right.appendChild(btn);
            } else {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = 'Read';
                right.appendChild(badge);
            }
            item.appendChild(left);
            item.appendChild(right);
            container.appendChild(item);
        });
        if (container.innerHTML === '') {
            container.innerHTML = '<p>No notifications.</p>';
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Failed to load notifications.</p>';
    }
}

