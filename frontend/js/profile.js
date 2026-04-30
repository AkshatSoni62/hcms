import { getLoggedInUser, clearLoggedInUser } from './storage.js';
import { getUserById } from './api.js';
import { API_BASE } from './config.js';
import { initTheme } from './theme-manager.js';

initTheme();

function getDashboardLink(role) {
    const r = String(role || '').toUpperCase();
    if (r === 'ADMIN') return 'admin-dashboard.html';
    return 'patient-dashboard.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const userLabelEl = document.getElementById('current-user-label');
    if (userLabelEl) userLabelEl.textContent = user.fullName + ' (' + user.role + ')';
    
    const dashboardLinkEl = document.getElementById('dashboard-link');
    if (dashboardLinkEl) dashboardLinkEl.href = getDashboardLink(user.role);
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearLoggedInUser();
            window.location.href = 'index.html';
        });
    }

    const logoutSidebar = document.getElementById('logout-sidebar');
    if (logoutSidebar) {
        logoutSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            clearLoggedInUser();
            window.location.href = 'index.html';
        });
    }

    try {
        const profile = await getUserById(user.id);
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text || '-';
        };

        setText('profile-fullName', profile.fullName);
        setText('profile-email', profile.email);
        setText('profile-role', profile.role);
        setText('profile-phone', profile.phoneNumber);
        setText('profile-dob', profile.dateOfBirth);
        setText('profile-gender', profile.gender);
        setText('profile-emergency', profile.emergencyContact);
        setText('profile-blood', profile.bloodGroup);
        setText('profile-medical', profile.medicalHistory);

        const addressEl = document.getElementById('profile-address-full');
        if (addressEl) {
            const parts = [profile.address, profile.city, profile.state].filter(Boolean);
            addressEl.textContent = parts.length > 0 ? parts.join(', ') : '-';
        }

        const avatar = document.getElementById('profile-avatar');
        if (profile.profileImageUrl) {
            const base = API_BASE.replace('/api', '');
            const src = profile.profileImageUrl.startsWith('http') ? profile.profileImageUrl : base + profile.profileImageUrl;
            avatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = src;
            img.alt = profile.fullName;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            avatar.appendChild(img);
        } else {
            avatar.textContent = (profile.fullName || '?').charAt(0).toUpperCase();
        }
    } catch (err) {
        console.error(err);
    }
});
