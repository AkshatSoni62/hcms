import { initDashboard } from './dashboard-common.js';
import { loadComplaintsInto, handleCreateComplaint } from './complaints.js';
import { loadNotifications } from './notifications.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = initDashboard(['PATIENT']);
    if (!user) {
        return;
    }

    const newBtn = document.getElementById('patient-new-complaint-btn');
    const cancelBtn = document.getElementById('patient-cancel-complaint-btn');
    const formContainer = document.getElementById('patient-complaint-form-container');

    if (newBtn) {
        newBtn.addEventListener('click', () => {
            formContainer.style.display = 'block';
        });
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            formContainer.style.display = 'none';
        });
    }

    await loadComplaintsInto('patient-complaints-list', user, { onlyMine: true });
    await loadComplaintsInto('all-complaints-list', user, { onlyMine: false });
    await handleCreateComplaint('patient-complaint-form', 'patient-complaints-list', user);

    await loadNotifications('notifications-list', user);
});

