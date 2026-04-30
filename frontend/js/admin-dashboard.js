import { initDashboard } from './dashboard-common.js';
import { fetchComplaintStatistics } from './api.js';
import { loadComplaintsInto } from './complaints.js';
import { loadNotifications } from './notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = initDashboard(['ADMIN']);
    if (!user) {
        return;
    }
    await loadStatistics();
    await loadComplaints();
    await loadNotifications('notifications-list', user);
});

async function loadStatistics() {
    try {
        const stats = await fetchComplaintStatistics();
        document.getElementById('stat-total-complaints').textContent = stats.totalComplaints;
        document.getElementById('stat-pending-complaints').textContent = stats.pendingComplaints;
        document.getElementById('stat-inprogress-complaints').textContent = stats.inProgressComplaints;
        document.getElementById('stat-resolved-complaints').textContent = stats.resolvedComplaints;
    } catch (err) {
        console.error(err);
    }
}

async function loadComplaints() {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    const isAdmin = user && user.role === 'ADMIN';
    const fakeUser = { id: -1 }; // admin does not own complaints by default
    await loadComplaintsInto('complaints-list', fakeUser, {
        onlyMine: false,
        showStatusControls: true,
        isAdmin: isAdmin,
        onChangeStatus: async (complaintId, status) => {
            try {
                const currentUserId = parseCurrentUserId();
                const mod = await import('./api.js');
                await mod.changeComplaintStatus(complaintId, status, currentUserId);
                await loadComplaints();
                await loadStatistics();
            } catch (err) {
                console.error(err);
                alert('Failed to update status.');
            }
        }
    });
}

function parseCurrentUserId() {
    // There is no id in label; instead we reload via storage when needed.
    const raw = localStorage.getItem('hcmsUser');
    if (!raw) {
        return null;
    }
    try {
        const obj = JSON.parse(raw);
        return obj.id;
    } catch (e) {
        return null;
    }
}



