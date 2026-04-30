import { API_BASE } from './config.js';

// --- HELPERS ---
function sanitizeEmail(email) {
    if (!email) return '';
    // Strip everything except printable ASCII, lowercase, and trim
    return email.replace(/[^\x20-\x7E]/g, '').toLowerCase().trim();
}

async function handleJsonResponse(response) {
    if (!response.ok) {
        let message = 'Request failed';
        try {
            const text = await response.text();
            if (text) {
                message = text;
            }
        } catch (e) {
            // ignore
        }
        throw new Error(message);
    }
    if (response.status === 204) {
        return null;
    }
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (e) {
        // If it's not JSON, it might be a plain string (like an image URL)
        return text;
    }
}

// Authentication
export async function registerUser(payload) {
    const response = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    return handleJsonResponse(response);
}

export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: sanitizeEmail(email), password })
    });
    return handleJsonResponse(response);
}

export async function fetchAllUsers() {
    const response = await fetch(`${API_BASE}/users`);
    return handleJsonResponse(response);
}

export async function getUserById(id) {
    const response = await fetch(`${API_BASE}/users/${id}`);
    return handleJsonResponse(response);
}

export async function updateUserProfile(id, profileData) {
    const response = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    });
    return handleJsonResponse(response);
}

export async function uploadProfileImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/users/${id}/profile-image`, {
        method: 'POST',
        body: formData
    });
    return handleJsonResponse(response);
}

// Complaints
export async function fetchComplaints() {
    const response = await fetch(`${API_BASE}/complaints`);
    return handleJsonResponse(response);
}

/** Fetch with filters: { category, severity, hospitalLocation, sort: 'trending'|'recent'|'upvoted', search } */
export async function fetchComplaintsFiltered(params = {}) {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.severity) q.set('severity', params.severity);
    if (params.hospitalLocation) q.set('hospitalLocation', params.hospitalLocation);
    if (params.status) q.set('status', params.status);
    if (params.sort) q.set('sort', params.sort);
    if (params.search) q.set('search', params.search);
    if (params.userId) q.set('userId', params.userId);
    const url = `${API_BASE}/complaints${q.toString() ? '?' + q.toString() : ''}`;
    const response = await fetch(url);
    return handleJsonResponse(response);
}

export async function createComplaint(userId, complaint) {
    const response = await fetch(`${API_BASE}/complaints?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaint)
    });
    return handleJsonResponse(response);
}

export async function updateComplaint(id, userId, complaint) {
    const response = await fetch(`${API_BASE}/complaints/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaint)
    });
    return handleJsonResponse(response);
}

export async function deleteComplaint(id, userId) {
    const response = await fetch(`${API_BASE}/complaints/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete complaint');
    }
    return null;
}

// Note: backend mapping uses POST for upvote
export async function upvoteComplaint(id, userId) {
    const response = await fetch(`${API_BASE}/complaints/${id}/upvote?userId=${encodeURIComponent(userId)}`, {
        method: 'POST'
    });
    return handleJsonResponse(response);
}

export async function uploadComplaintImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/complaints/${id}/image`, {
        method: 'POST',
        body: formData
    });
    return handleJsonResponse(response);
}

export async function changeComplaintStatus(id, status, adminUserId) {
    const url = `${API_BASE}/complaints/${id}/status?status=${encodeURIComponent(status)}&adminUserId=${encodeURIComponent(adminUserId)}`;
    const response = await fetch(url, {
        method: 'PUT'
    });
    return handleJsonResponse(response);
}

export async function updateComplaintByAdmin(id, adminUserId, body) {
    const response = await fetch(`${API_BASE}/complaints/${id}/admin?adminUserId=${encodeURIComponent(adminUserId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return handleJsonResponse(response);
}

// Comments
export async function fetchCommentsByComplaint(complaintId, sort = 'new', userId = null) {
    const q = new URLSearchParams();
    if (sort) q.set('sort', sort);
    if (userId) q.set('userId', userId);
    const url = `${API_BASE}/comments/complaint/${complaintId}?${q.toString()}`;
    const response = await fetch(url);
    return handleJsonResponse(response);
}

export async function addComment(userId, complaintId, content, parentCommentId = null) {
    const params = new URLSearchParams({ userId, complaintId });
    if (parentCommentId != null) params.set('parentCommentId', parentCommentId);
    const response = await fetch(`${API_BASE}/comments?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    return handleJsonResponse(response);
}

export async function upvoteComment(commentId, userId) {
    const response = await fetch(`${API_BASE}/comments/${commentId}/upvote?userId=${encodeURIComponent(userId)}`, {
        method: 'POST'
    });
    return handleJsonResponse(response);
}

export async function updateComment(id, userId, content) {
    const response = await fetch(`${API_BASE}/comments/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });
    return handleJsonResponse(response);
}

export async function deleteComment(id, userId) {
    const response = await fetch(`${API_BASE}/comments/${id}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete comment');
    }
    return null;
}

// Notifications
export async function fetchNotifications(userId) {
    const response = await fetch(`${API_BASE}/notifications/user/${userId}`);
    return handleJsonResponse(response);
}

export async function getUnreadNotificationCount(userId) {
    const response = await fetch(`${API_BASE}/notifications/user/${userId}/unread-count`);
    return handleJsonResponse(response);
}

export async function markAllNotificationsRead(userId) {
    const response = await fetch(`${API_BASE}/notifications/user/${userId}/read-all`, {
        method: 'PUT'
    });
    if (!response.ok && response.status !== 204) {
        throw new Error('Failed to mark all as read');
    }
    return null;
}

export async function markNotificationRead(notificationId) {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT'
    });
    return handleJsonResponse(response);
}

export async function clearAllNotifications(userId) {
    const response = await fetch(`${API_BASE}/notifications/user/${userId}`, {
        method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) {
        throw new Error('Failed to clear notifications');
    }
    return null;
}


// Appointments
export async function bookAppointment(patientUserId, doctorUserId, date, time, extra = {}) {
    const params = new URLSearchParams({
        patientUserId,
        date,
        time
    });
    if (doctorUserId) params.set('doctorUserId', doctorUserId);
    if (extra.hospitalLocation) params.set('hospitalLocation', extra.hospitalLocation);
    if (extra.department) params.set('department', extra.department);
    if (extra.diseaseName) params.set('diseaseName', extra.diseaseName);
    if (extra.patientContactNumber) params.set('patientContactNumber', extra.patientContactNumber);
    if (extra.notes) params.set('notes', extra.notes);
    if (extra.appointmentType) params.set('appointmentType', extra.appointmentType);
    const response = await fetch(`${API_BASE}/appointments?${params.toString()}`, {
        method: 'POST'
    });
    return handleJsonResponse(response);
}

export async function fetchAppointmentsForDoctor(doctorId) {
    const response = await fetch(`${API_BASE}/appointments/doctor/${doctorId}`);
    return handleJsonResponse(response);
}

export async function fetchAppointmentsForPatient(patientId) {
    const response = await fetch(`${API_BASE}/appointments/patient/${patientId}`);
    return handleJsonResponse(response);
}

export async function updateAppointmentStatus(appointmentId, doctorId, status) {
    const url = `${API_BASE}/appointments/${appointmentId}/status?doctorId=${encodeURIComponent(doctorId)}&status=${encodeURIComponent(status)}`;
    const response = await fetch(url, {
        method: 'PUT'
    });
    return handleJsonResponse(response);
}

export async function deleteAppointment(appointmentId, requesterUserId) {
    const url = `${API_BASE}/appointments/${appointmentId}?requesterUserId=${encodeURIComponent(requesterUserId)}`;
    const response = await fetch(url, {
        method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete appointment');
    }
    return null;
}

// Doctors
export async function fetchDoctors() {
    const response = await fetch(`${API_BASE}/doctors`);
    return handleJsonResponse(response);
}


// Statistics
export async function fetchComplaintStatistics() {
    const response = await fetch(`${API_BASE}/statistics/complaints`);
    return handleJsonResponse(response);
}

export async function fetchAnalytics() {
    const response = await fetch(`${API_BASE}/statistics/analytics`);
    return handleJsonResponse(response);
}

// Hospitals
export async function fetchHospitals() {
    const response = await fetch(`${API_BASE}/hospitals`);
    return handleJsonResponse(response);
}

// User Settings
export async function fetchUserSettings(userId) {
    const response = await fetch(`${API_BASE}/settings/user?userId=${encodeURIComponent(userId)}`);
    return handleJsonResponse(response);
}

export async function updateUserSettings(userId, settingsData) {
    const response = await fetch(`${API_BASE}/settings/update?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
    });
    return handleJsonResponse(response);
}

// Geocoding (server-side wrapper)
export async function geocodeAddress(address) {
    const url = `${API_BASE}/geo/geocode?address=${encodeURIComponent(address)}`;
    const response = await fetch(url);
    return handleJsonResponse(response);
}

export async function reverseGeocodeLatLng(lat, lng) {
    const url = `${API_BASE}/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    const response = await fetch(url);
    return handleJsonResponse(response);
}

// Feedback
export async function submitFeedback(userId, subject, message) {
    const params = new URLSearchParams({ userId, subject, message });
    const response = await fetch(`${API_BASE}/feedback?${params.toString()}`, {
        method: 'POST'
    });
    return handleJsonResponse(response);
}

export async function fetchAllFeedback() {
    const response = await fetch(`${API_BASE}/feedback`);
    return handleJsonResponse(response);
}

export async function fetchUserFeedback(userId) {
    const response = await fetch(`${API_BASE}/feedback/user/${userId}`);
    return handleJsonResponse(response);
}

export async function updateFeedback(id, adminResponse, status) {
    const q = new URLSearchParams();
    if (adminResponse !== undefined && adminResponse !== null) q.set('adminResponse', adminResponse);
    if (status !== undefined && status !== null) q.set('status', status);
    const url = `${API_BASE}/feedback/${id}?${q.toString()}`;
    const response = await fetch(url, {
        method: 'PUT'
    });
    return handleJsonResponse(response);
}

// Authentication (OTP)
export async function sendOtp(email, password, isSignup = false) {
    const response = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: sanitizeEmail(email),
            password,
            isSignup: isSignup.toString()
        })
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to send verification code');
    }
    return response.text();
}

export async function verifyOtp(email, otp) {
    const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: sanitizeEmail(email),
            otp
        })
    });
    return handleJsonResponse(response);
}

export async function completeSignup(userData) {
    const payload = { ...userData };
    if (payload.email) payload.email = sanitizeEmail(payload.email);

    const response = await fetch(`${API_BASE}/auth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleJsonResponse(response);
}

export async function forgotPassword(email) {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizeEmail(email) })
    });
    if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to send reset code');
    }
    return await response.text();
}

export async function resetPassword(email, otp, newPassword) {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: sanitizeEmail(email),
            otp,
            newPassword
        })
    });
    if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to reset password');
    }
    return await response.text();
}
