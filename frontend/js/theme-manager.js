/**
 * Theme Manager Utility
 * Handles theme persistence and application with backend sync
 */
import { fetchUserSettings, updateUserSettings } from './api.js';

const THEME_KEY = 'hcms-theme';

export async function initTheme() {
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    
    // First, apply from localStorage for instant feedback
    const localTheme = localStorage.getItem(THEME_KEY) || 'system';
    applyTheme(localTheme, false); // Don't sync yet

    if (user && user.id) {
        try {
            const settings = await fetchUserSettings(user.id);
            if (settings && settings.themeMode) {
                applyTheme(settings.themeMode, false); // Apply backend theme
            }
        } catch (e) {
            console.error('Failed to sync theme with backend', e);
        }
    }
}

export function applyTheme(theme, syncBackend = true) {
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem(THEME_KEY, theme);

    if (syncBackend) {
        const user = JSON.parse(localStorage.getItem('hcmsUser'));
        if (user && user.id) {
            updateUserSettings(user.id, { themeMode: theme }).catch(console.error);
        }
    }
}

export function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'system';
}

export function toggleTheme() {
    const current = getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    return next;
}

// Watch for system theme changes if set to 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (getTheme() === 'system') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});
