import { initTheme, getTheme, toggleTheme } from '../theme-manager.js';
import { API_BASE } from '../config.js';

export function injectSidebar(activePage = 'feed') {
    initTheme();
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    const isNotAdmin = user && user.role !== 'ADMIN';

    const sidebarHtml = `
        <div class="fixed-sidebar">
            <div class="sidebar-logo">
                <i class="fas fa-hospital-alt"></i>
                <span>HCMS Portal</span>
            </div>
            
            <div class="sidebar-nav">
                <a href="feed.html" class="nav-item ${activePage === 'feed' ? 'active' : ''}">
                    <i class="fas fa-rss"></i>
                    <span>Feed</span>
                </a>
                <a href="${getDashboardUrl()}" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}">
                    <i class="fas fa-th-large"></i>
                    <span>Dashboard</span>
                </a>
                <a href="notifications.html" class="nav-item ${activePage === 'notifications' ? 'active' : ''}">
                    <i class="fas fa-bell"></i>
                    <span>Notifications</span>
                    <span id="nav-notif-dot" class="badge" style="display: none;"></span>
                    <span id="nav-notif-popover" class="notif-popover">No new messages</span>
                </a>
                <a href="profile.html" class="nav-item ${activePage === 'profile' ? 'active' : ''}">
                    <i class="fas fa-user-circle"></i>
                    <span>Profile</span>
                </a>
                <a href="settings.html" class="nav-item ${activePage === 'settings' ? 'active' : ''}">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </a>
                <a href="feedback.html" class="nav-item ${activePage === 'feedback' ? 'active' : ''}">
                    <i class="fas fa-comment-alt"></i>
                    <span>Feedback</span>
                </a>
                ${isNotAdmin ? `
                <a href="my-complaints.html" class="nav-item ${activePage === 'my-complaints' ? 'active' : ''}">
                    <i class="fas fa-file-alt"></i>
                    <span>My Complaints</span>
                </a>
                ` : ''}
                
                <a href="#" id="logout-btn" class="nav-item" style="margin-top: 32px; color: var(--danger); border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; border-radius: 0;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </a>
            </div>
        </div>
    `;

    const container = document.querySelector('.portal-container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', sidebarHtml);

        // Set active link based on current URL
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && window.location.pathname.includes(href)) {
                item.classList.add('active');
            }
        });

        // Setup logout listener
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            // Assuming auth.js has a logout function or we just clear storage
            localStorage.clear();
            window.location.href = 'index.html';
        });

        // Update notification dot
        updateNotificationDot();

        // Initialize real-time toast notifications
        initToastNotifications();
    }
}

export async function updateNotificationDot() {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    if (!user) return;

    try {
        const response = await fetch(`${API_BASE}/notifications/user/${user.id}/unread-count`);
        const count = await response.json();

        const dot = document.getElementById('nav-notif-dot');
        const popover = document.getElementById('nav-notif-popover');

        if (dot && count > 0) {
            dot.style.display = 'block';
        } else if (dot) {
            dot.style.display = 'none';
        }

        if (popover) {
            popover.textContent = count > 0 ? `You have ${count} unread notifications` : 'No new messages';
        }
    } catch (e) {
        console.error('Failed to update notification dot', e);
    }
}

let lastUnreadCount = -1;

function initToastNotifications() {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    if (!user) return;

    // Check every 10 seconds
    setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications/user/${user.id}/unread-count`);
            const count = await response.json();

            if (lastUnreadCount !== -1 && count > lastUnreadCount) {
                // New notification! Fetch the most recent one
                const notifsResponse = await fetch(`${API_BASE}/notifications/user/${user.id}`);
                const notifs = await notifsResponse.json();

                if (notifs.length > 0) {
                    const latest = notifs[0]; // Assuming sorted by date desc
                    showToast(latest);
                }
            }

            lastUnreadCount = count;
            updateNotificationDot();
        } catch (e) {
            console.error('Polling failed', e);
        }
    }, 10000);
}

function showToast(notif) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-bell"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">New Notification</div>
            <div class="toast-message">${notif.message}</div>
        </div>
    `;

    toast.onclick = () => {
        if (notif.referenceId) {
            if (notif.type === 'STATUS_UPDATE' || notif.type === 'NEW_COMMENT' || notif.type === 'NEW_COMPLAINT' || notif.type?.includes('UPVOTE')) {
                window.location.href = `feed.html?highlight=${notif.referenceId}`;
            } else {
                window.location.href = 'notifications.html';
            }
        } else {
            window.location.href = 'notifications.html';
        }
    };

    container.appendChild(toast);

    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}



function getDashboardUrl() {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    if (!user) return 'index.html';

    switch (user.role) {
        case 'ADMIN': return 'admin-dashboard.html';
        default: return 'patient-dashboard.html';
    }
}
