import { loginUser, registerUser } from './api.js';
import { setLoggedInUser, getLoggedInUser, redirectBasedOnRole } from './storage.js';
import { showMessage, clearMessage } from './ui.js';

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            const targetId = button.getAttribute('data-tab');
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.add('active');
            }
        });
    });
}

function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const messageBox = document.getElementById('auth-message');
    const yearSpan = document.getElementById('year');

    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear().toString();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage(messageBox);
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            try {
                const user = await loginUser(email, password);
                setLoggedInUser(user);
                redirectBasedOnRole(user);
            } catch (err) {
                showMessage(messageBox, 'Invalid email or password.', 'error');
                console.error(err);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearMessage(messageBox);
            const fullName = document.getElementById('reg-fullName').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            if (!role) {
                showMessage(messageBox, 'Please select a role.', 'error');
                return;
            }
            try {
                const payload = { fullName, email, password, role };
                await registerUser(payload);
                showMessage(messageBox, 'Registration successful. You can now log in.', 'success');
                document.querySelector('.tab-button[data-tab="login-tab"]').click();
            } catch (err) {
                console.error(err);
                showMessage(messageBox, 'Registration failed. Email may already be used.', 'error');
            }
        });
    }
}

function autoRedirectIfLoggedIn() {
    const user = getLoggedInUser();
    if (user) {
        redirectBasedOnRole(user);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupAuthForms();
    const user = getLoggedInUser();
    if (user) {
        import('./feed.js').then(({ initFeedView }) => initFeedView());
    }
});

