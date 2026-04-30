/**
 * Hash-based SPA router. No full page reloads.
 * Routes: #feed | #complaints | #appointments | #profile | #notifications | #dashboard
 */
const routes = {};
let currentRoute = '';

export function initRouter(onRoute) {
    function handleHash() {
        const hash = window.location.hash.slice(1) || 'feed';
        const [path] = hash.split('?');
        currentRoute = path;
        if (onRoute) onRoute(currentRoute, hash);
        if (routes[currentRoute]) routes[currentRoute]();
    }
    window.addEventListener('hashchange', handleHash);
    handleHash();
}

export function register(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    window.location.hash = path;
}

export function getCurrentRoute() {
    return currentRoute;
}
