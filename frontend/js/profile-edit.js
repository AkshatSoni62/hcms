import { getLoggedInUser, clearLoggedInUser } from './storage.js';
import { getUserById, updateUserProfile, uploadProfileImage } from './api.js';
import { API_BASE } from './config.js';

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
        const setValue = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setValue('edit-fullName', profile.fullName);
        setValue('edit-phone', profile.phoneNumber);
        setValue('edit-address', profile.address);
        setValue('edit-city', profile.city);
        setValue('edit-state', profile.state);
        setValue('edit-dob', profile.dateOfBirth);
        setValue('edit-gender', profile.gender);
        setValue('edit-emergency', profile.emergencyContact);
        setValue('edit-blood', profile.bloodGroup);
        setValue('edit-medical', profile.medicalHistory);

        const previewEl = document.getElementById('profile-image-preview');
        if (profile.profileImageUrl) {
            const base = API_BASE.replace('/api', '');
            const src = profile.profileImageUrl.startsWith('http') ? profile.profileImageUrl : base + profile.profileImageUrl;
            previewEl.innerHTML = '<img src="' + src + '" alt="Profile" style="max-width:120px;max-height:120px;border-radius:8px;">';
        } else {
            previewEl.textContent = 'No image';
        }
    } catch (err) {
        console.error(err);
    }

    const imgInput = document.getElementById('profile-image-input');
    if (imgInput) {
        imgInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function() {
                const preview = document.getElementById('profile-image-preview');
                if (preview) {
                    preview.innerHTML = '<img src="' + reader.result + '" alt="Preview" style="max-width:120px;max-height:120px;border-radius:8px;">';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const uploadBtn = document.getElementById('upload-image-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const input = document.getElementById('profile-image-input');
            if (!input || !input.files || !input.files[0]) {
                alert('Please select an image first.');
                return;
            }
            try {
                const url = await uploadProfileImage(user.id, input.files[0]);
                if (url) {
                    const preview = document.getElementById('profile-image-preview');
                    if (preview) {
                        const base = API_BASE.replace('/api', '');
                        const src = url.startsWith('http') ? url : base + url;
                        preview.innerHTML = '<img src="' + src + '" alt="Profile" style="max-width:120px;max-height:120px;border-radius:8px;">';
                    }
                    alert('Profile image updated.');
                } else {
                    alert('Upload failed.');
                }
            } catch (err) {
                console.error(err);
                alert('Upload failed.');
            }
        });
    }

    const editForm = document.getElementById('profile-edit-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() || null : null;
        };
        const payload = {
            fullName: getValue('edit-fullName'),
            phoneNumber: getValue('edit-phone'),
            address: getValue('edit-address'),
            city: getValue('edit-city'),
            state: getValue('edit-state'),
            dateOfBirth: getValue('edit-dob'),
            gender: getValue('edit-gender'),
            emergencyContact: getValue('edit-emergency'),
            bloodGroup: getValue('edit-blood'),
            medicalHistory: getValue('edit-medical')
        };
        try {
            const updated = await updateUserProfile(user.id, payload);
            // Sync local storage so other pages reflect the change immediately
            const newUser = { ...user, ...updated };
            localStorage.setItem('hcmsUser', JSON.stringify(newUser));
            window.location.href = 'profile.html';
        } catch (err) {
            console.error(err);
            alert('Failed to update profile.');
        }
        });
    }
});
