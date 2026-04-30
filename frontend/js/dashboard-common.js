import { requireAuth, clearLoggedInUser } from './storage.js';
import { getUnreadNotificationCount } from './api.js';

export function initDashboard(allowedRoles) {
    const user = requireAuth(allowedRoles);
    if (!user) {
        return null;
    }
    const label = document.getElementById('current-user-label');
    if (label) {
        label.textContent = user.fullName + ' (' + user.role + ')';
    }
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearLoggedInUser();
            window.location.href = 'index.html';
        });
    }
    setupSidebarNavigation();
    updateNotificationBadge(user.id);
    try {
        import('./notification-polling.js').then(mod => mod.startNotificationPolling(user.id));
    } catch (e) {}
    return user;
}

export async function updateNotificationBadge(userId) {
    try {
        const count = await getUnreadNotificationCount(userId);
        const link = document.querySelector('[data-notifications-link]');
        if (!link) return;
        let badge = link.querySelector('.notification-badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                link.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-flex';
        } else if (badge) {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error(e);
    }
}

function setupSidebarNavigation() {
    const buttons = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.content-section');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-section');
            buttons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            const section = document.getElementById(targetId);
            if (section) {
                section.classList.add('active');
            }
        });
    });
}

