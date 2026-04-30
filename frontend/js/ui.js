export function showMessage(container, message, type = 'success') {
    if (!container) {
        return;
    }
    container.textContent = message;
    container.style.display = 'block';
    container.classList.remove('alert-success', 'alert-error');
    container.classList.add(type === 'error' ? 'alert-error' : 'alert-success');
}

export function clearMessage(container) {
    if (!container) {
        return;
    }
    container.style.display = 'none';
}

export function createStatusBadge(status) {
    const span = document.createElement('span');
    if (!status) {
        return span;
    }
    const value = String(status).toUpperCase();
    span.textContent = value.replace('_', ' ');
    span.classList.add('badge');
    if (value === 'PENDING') {
        span.classList.add('badge-status-pending');
    } else if (value === 'IN_PROGRESS') {
        span.classList.add('badge-status-in-progress');
    } else if (value === 'RESOLVED') {
        span.classList.add('badge-status-resolved');
    } else if (value === 'BOOKED') {
        span.classList.add('badge-status-booked');
    } else if (value === 'CANCELLED') {
        span.classList.add('badge-status-cancelled');
    } else if (value === 'COMPLETED') {
        span.classList.add('badge-status-completed');
    }
    return span;
}

export function formatDateTime(isoString) {
    if (!isoString) {
        return '';
    }
    try {
        const date = new Date(isoString);
        return date.toLocaleString();
    } catch (e) {
        return isoString;
    }
}

let toastContainer = null;

export function showToast(message, type = 'success') {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function createCategoryBadge(category) {
    const span = document.createElement('span');
    span.className = 'badge badge-category';
    span.textContent = category || 'Other';
    return span;
}

export function createSeverityBadge(severity) {
    const span = document.createElement('span');
    span.className = 'badge badge-severity badge-severity-' + (severity ? severity.toLowerCase() : 'medium');
    span.textContent = severity || 'Medium';
    return span;
}

