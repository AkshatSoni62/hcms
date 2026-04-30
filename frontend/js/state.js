/**
 * Central app state (reactive-style). Single source of truth for SPA.
 * Use get/set and subscribe for simple reactivity.
 */
const state = {
    user: null,
    notifications: [],
    unreadCount: 0,
    feedFilters: { category: '', severity: '', hospitalLocation: '', sort: 'recent', search: '' },
    sidebarCollapsed: false,
    darkMode: false,
    _listeners: {}
};

export function getState(key) {
    return key ? state[key] : { ...state };
}

export function setState(updates) {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
        if (state[key] !== value) {
            state[key] = value;
            changed = true;
        }
    }
    if (changed && state._listeners['*']) {
        state._listeners['*'].forEach(fn => fn(state));
    }
    Object.keys(updates).forEach(k => {
        if (state._listeners[k]) state._listeners[k].forEach(fn => fn(state[k]));
    });
}

export function subscribe(key, callback) {
    if (!state._listeners[key]) state._listeners[key] = [];
    state._listeners[key].push(callback);
    return () => {
        state._listeners[key] = state._listeners[key].filter(f => f !== callback);
    };
}

export function getCurrentUser() {
    return state.user;
}

export function setCurrentUser(user) {
    setState({ user });
}

export function getFeedFilters() {
    return { ...state.feedFilters };
}

export function setFeedFilters(filters) {
    setState({ feedFilters: { ...state.feedFilters, ...filters } });
}
