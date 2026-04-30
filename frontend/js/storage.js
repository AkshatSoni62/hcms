const STORAGE_KEY = 'hcmsUser';
const EMERGENCY_APPTS_KEY = 'hcmsEmergencyAppointments';

export function setLoggedInUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getLoggedInUser() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse stored user', e);
        return null;
    }
}

export function clearLoggedInUser() {
    localStorage.removeItem(STORAGE_KEY);
}

export function redirectBasedOnRole(user) {
    if (!user || !user.role) {
        window.location.href = 'index.html';
        return;
    }
    // After login redirect to feed. User can navigate to dashboard from there.
    window.location.href = 'feed.html';
}

export function requireAuth(allowedRoles) {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    if (allowedRoles && allowedRoles.length > 0) {
        const role = String(user.role).toUpperCase();
        const match = allowedRoles.some(r => r.toUpperCase() === role);
        if (!match) {
            window.location.href = 'index.html';
            return null;
        }
    }
    return user;
}

export function getEmergencyAppointmentIds() {
    const raw = localStorage.getItem(EMERGENCY_APPTS_KEY);
    if (!raw) {
        return [];
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse emergency appointments', e);
        return [];
    }
}

export function markAppointmentEmergency(appointmentId) {
    const list = getEmergencyAppointmentIds();
    if (!list.includes(appointmentId)) {
        list.push(appointmentId);
        localStorage.setItem(EMERGENCY_APPTS_KEY, JSON.stringify(list));
    }
}

