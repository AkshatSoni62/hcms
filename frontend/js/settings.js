import { getTheme, applyTheme } from './theme-manager.js';
import { fetchUserSettings, updateUserSettings } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Load current status
    const currentTheme = getTheme();
    updateThemeSelectionUI(currentTheme);

    // Default preferences
    let prefs = {
        themeMode: currentTheme,
        emailNotifications: true,
        pushNotifications: true,
        publicProfile: true
    };

    // Load from backend
    try {
        const settings = await fetchUserSettings(user.id);
        if (settings) {
            prefs = { ...prefs, ...settings };
            updateThemeSelectionUI(settings.themeMode || currentTheme);
            applyTheme(settings.themeMode || currentTheme, false); // Already synced
        }
    } catch (e) {
        console.error('Failed to load settings from backend', e);
        // Fallback to local storage if available for some reason, or keep defaults
    }

    document.getElementById('notif-email').checked = prefs.emailNotifications;
    document.getElementById('notif-push').checked = prefs.pushNotifications;
    document.getElementById('privacy-profile').checked = prefs.publicProfile;

    // Theme Selection Logic
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.getAttribute('data-value');
            updateThemeSelectionUI(val);
            applyTheme(val); // This will sync with backend
        });
    });

    // Save Logic
    document.getElementById('save-settings').addEventListener('click', async () => {
        const newSettings = {
            themeMode: getTheme(),
            emailNotifications: document.getElementById('notif-email').checked,
            pushNotifications: document.getElementById('notif-push').checked,
            publicProfile: document.getElementById('privacy-profile').checked
        };
        
        try {
            await updateUserSettings(user.id, newSettings);
            alert('Settings saved successfully to your account!');
        } catch (e) {
            console.error('Failed to save settings', e);
            alert('Failed to save settings. Please try again.');
        }
    });

    // Reset Logic
    document.getElementById('reset-settings').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
        
        const defaultSettings = {
            themeMode: 'light',
            emailNotifications: true,
            pushNotifications: true,
            publicProfile: true
        };

        try {
            await updateUserSettings(user.id, defaultSettings);
            applyTheme('light', false);
            updateThemeSelectionUI('light');
            document.getElementById('notif-email').checked = true;
            document.getElementById('notif-push').checked = true;
            document.getElementById('privacy-profile').checked = true;
            alert('Settings reset to defaults.');
        } catch (e) {
            alert('Failed to reset settings.');
        }
    });
});

function updateThemeSelectionUI(theme) {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
        if (opt.getAttribute('data-value') === theme) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}
