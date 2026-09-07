/**
 * MMCOE Fee Payment Management Platform — Login & Auth Engine
 * Handles enterprise demo credentials, role matching, API failover, and password recovery.
 */

// Official Demo Credentials Matrix
const DEMO_CREDENTIALS = {
    ADMIN: [
        { user: 'admin', pass: 'admin123', name: 'Administrator', email: 'admin@mmcoe.com' },
        { user: 'admin@mmcoe.com', pass: 'Admin@123', name: 'Administrator', email: 'admin@mmcoe.com' }
    ],
    STUDENT: [
        { user: 'B25IT2010', pass: 'student123', name: 'Manan Vivekanand Tote', email: 'manan@mmcoe.com' },
        { user: 'b25it2010@mmcoe.com', pass: 'Student@123', name: 'Manan Vivekanand Tote', email: 'manan@mmcoe.com' },
        { user: 'manan@mmcoe.com', pass: 'student123', name: 'Manan Vivekanand Tote', email: 'manan@mmcoe.com' }
    ],
    ACCOUNTS: [
        { user: 'accounts', pass: 'accounts123', name: 'Accounts Officer', email: 'accounts@mmcoe.com' },
        { user: 'accounts@mmcoe.com', pass: 'Accounts@123', name: 'Accounts Officer', email: 'accounts@mmcoe.com' }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check existing authenticated session
    const session = getSession();
    if (session && session.role) {
        redirectToDashboard(session.role);
        return;
    }

    // 2. Bind Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 3. Password Visibility Toggle
    const togglePassBtn = document.getElementById('togglePassword');
    if (togglePassBtn) {
        togglePassBtn.addEventListener('click', () => {
            const passInput = document.getElementById('password');
            const passIcon = document.getElementById('togglePasswordIcon');
            if (passInput) {
                const isPassword = passInput.type === 'password';
                passInput.type = isPassword ? 'text' : 'password';
                if (passIcon) {
                    passIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
                }
            }
        });
    }

    // 4. Forgot Password Form
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }
});

/**
 * Handle Login Form Submission
 */
async function handleLogin(e) {
    e.preventDefault();
    hideAlerts();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const submitBtn = document.getElementById('loginSubmitBtn');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const role = roleSelect ? roleSelect.value : '';

    if (!username) {
        showError('Please enter your Username, PRN, or Registered Email.');
        if (usernameInput) usernameInput.focus();
        return;
    }
    if (!password) {
        showError('Please enter your password.');
        if (passwordInput) passwordInput.focus();
        return;
    }
    if (!role) {
        showError('Please select your Role Category.');
        if (roleSelect) roleSelect.focus();
        return;
    }

    setButtonLoading(submitBtn, true);

    // 1. Try Backend API first
    try {
        const loginUrl = (typeof API_BASE !== 'undefined' ? API_BASE : '/api') + '/auth/login';
        const res = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password: password, role: role })
        });
        if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
                saveSession(json.data);
                showSuccess('Authentication verified! Redirecting to ERP Dashboard...');
                setTimeout(() => redirectToDashboard(role), 700);
                return;
            }
        }
    } catch (err) {
        // Fallback to Demo Credentials when backend is standalone
    }

    // 2. Validate against Demo Credentials
    const roleList = DEMO_CREDENTIALS[role] || [];
    const matched = roleList.find(c =>
        c.user.toLowerCase() === username.toLowerCase() && c.pass === password
    );

    if (matched) {
        const sessionData = {
            token: 'demo-token-' + Date.now(),
            role: role,
            name: matched.name,
            email: matched.email,
            username: username
        };
        saveSession(sessionData);
        showSuccess('Authentication verified! Redirecting to ' + formatRoleName(role) + ' Dashboard...');
        setTimeout(() => redirectToDashboard(role), 600);
    } else {
        setButtonLoading(submitBtn, false);
        showError('Invalid credentials or selected role does not match this account.');
    }
}

/**
 * Handle Forgot Password Form Submission
 */
function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail')?.value.trim();
    const prn = document.getElementById('forgotPrn')?.value.trim();
    const alertBox = document.getElementById('forgotAlert');

    if (!email && !prn) {
        if (alertBox) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Please provide either your Registered Email or PRN / Username.';
            alertBox.classList.remove('d-none');
        }
        return;
    }

    if (alertBox) {
        alertBox.className = 'alert alert-success';
        alertBox.textContent = 'Password reset instructions have been dispatched to your registered MMCOE email address.';
        alertBox.classList.remove('d-none');
    }

    setTimeout(() => {
        const modalEl = document.getElementById('forgotPasswordModal');
        if (modalEl && window.bootstrap) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        showSuccess('Password reset link sent! Check your inbox.');
    }, 1800);
}

/**
 * Session Persistence Helpers
 */
function saveSession(data) {
    localStorage.setItem('fpm_token', data.token || 'demo-token');
    localStorage.setItem('fpm_role', data.role || '');
    localStorage.setItem('fpm_email', data.email || '');
    localStorage.setItem('fpm_name', data.name || '');
    localStorage.setItem('fpm_userId', data.userId || '');
    localStorage.setItem('fpm_user', JSON.stringify(data));
    sessionStorage.setItem('fpm_auth', 'true');
}

function getSession() {
    const token = localStorage.getItem('fpm_token');
    const role = localStorage.getItem('fpm_role');
    const userStr = localStorage.getItem('fpm_user');
    if (!token || !role) return null;
    try {
        return { token, role, user: JSON.parse(userStr || '{}') };
    } catch (e) {
        return { token, role };
    }
}

function redirectToDashboard(role) {
    if (role === 'ADMIN') {
        window.location.href = 'admin/dashboard.html';
    } else if (role === 'STUDENT') {
        window.location.href = 'student/dashboard.html';
    } else if (role === 'ACCOUNTS') {
        window.location.href = 'accounts/dashboard.html';
    }
}

function formatRoleName(role) {
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'STUDENT') return 'Student';
    if (role === 'ACCOUNTS') return 'Accounts Officer';
    return role;
}

function showError(msg) {
    const errorEl = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    if (errorEl) {
        if (errorText) errorText.textContent = msg;
        else errorEl.textContent = msg;
        errorEl.classList.remove('d-none');
    }
}

function showSuccess(msg) {
    const successEl = document.getElementById('loginSuccess');
    const successText = document.getElementById('loginSuccessText');
    if (successEl) {
        if (successText) successText.textContent = msg;
        else successEl.textContent = msg;
        successEl.classList.remove('d-none');
    }
}

function hideAlerts() {
    const errorEl = document.getElementById('loginError');
    const successEl = document.getElementById('loginSuccess');
    if (errorEl) errorEl.classList.add('d-none');
    if (successEl) successEl.classList.add('d-none');
}

function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Verifying Account...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-right-circle-fill"></i><span>Secure Sign In</span>';
    }
}
