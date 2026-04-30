/**
 * Poll notifications every 20s. Show toast when new unread appear. Update badge.
 */
import { getUnreadNotificationCount } from './api.js';
import { showToast } from './ui.js';
import { updateNotificationBadge } from './dashboard-common.js';

const POLL_INTERVAL_MS = 20000;
let lastUnreadCount = 0;
let pollTimer = null;

export function startNotificationPolling(userId) {
    if (!userId) return;
    stopNotificationPolling();
    lastUnreadCount = -1;
    function poll() {
        getUnreadNotificationCount(userId)
            .then(count => {
                if (lastUnreadCount >= 0 && count > lastUnreadCount) {
                    showToast('You have new notifications', 'info');
                }
                lastUnreadCount = count;
                updateNotificationBadge(userId);
            })
            .catch(() => {});
    }
    poll();
    pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

export function stopNotificationPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}
