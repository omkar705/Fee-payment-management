/**
 * auth.js — Authentication & Session Management
 * Fee Payment Management Platform — Milestone 1
 */

// Relative API base automatically connects to the same host & port without CORS issues
const API_BASE = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
    ? (window.location.port === '3000' ? 'http://localhost:8080/api' : '/api')
    : 'http://localhost:8080/api';

// ============================================================
// Token & Session Helpers
// ============================================================

function saveSession(data) {
    localStorage.setItem('fpm_token', data.token);
    localStorage.setItem('fpm_email', data.email);
    localStorage.setItem('fpm_role',  data.role);
    localStorage.setItem('fpm_name',  data.name);
    localStorage.setItem('fpm_userId', data.userId);
}

function getToken()  { return localStorage.getItem('fpm_token'); }
function getRole()   { return localStorage.getItem('fpm_role'); }
function getName()   { return localStorage.getItem('fpm_name'); }
function getEmail()  { return localStorage.getItem('fpm_email'); }
function getUserId() { return localStorage.getItem('fpm_userId'); }

function clearSession() {
    localStorage.removeItem('fpm_token');
    localStorage.removeItem('fpm_email');
    localStorage.removeItem('fpm_role');
    localStorage.removeItem('fpm_name');
    localStorage.removeItem('fpm_userId');
    localStorage.removeItem('fpm_payment_history');
    sessionStorage.removeItem('fpm_payment_history');
    sessionStorage.removeItem('fpm_payment_done');
}

function isLoggedIn() {
    return !!getToken();
}

// ============================================================
// Auth Guard — Redirect to login if not authenticated
// ============================================================
function requireAuth(expectedRole) {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    if (expectedRole && getRole() !== expectedRole) {
        alert('Access denied. You do not have permission to view this page.');
        redirectToDashboard();
        return false;
    }
    return true;
}

function redirectToDashboard() {
    const role = getRole();
    if (role === 'ADMIN')    window.location.href = '/admin/dashboard.html';
    else if (role === 'ACCOUNTS') window.location.href = '/accounts/dashboard.html';
    else if (role === 'STUDENT')  window.location.href = '/student/dashboard.html';
    else window.location.href = '/login.html';
}

// ============================================================
// Logout
// ============================================================
function logout() {
    clearSession();
    sessionStorage.clear();
    window.location.href = '/login.html';
}

// ============================================================
// Fetch Wrapper with Auth Headers
// ============================================================
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (response.status === 401) {
        clearSession();
        window.location.href = '/login.html';
        return null;
    }

    return { status: response.status, ok: response.ok, data };
}

// ============================================================
// Login Form Handler
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Auto-fill email icon feedback
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const passwordToggle = document.getElementById('passwordToggle');

    // Password show/hide
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordToggle.innerHTML = `<i class="bi bi-eye${isPassword ? '-slash' : ''}"></i>`;
        });
    }

    // Clear error on input change
    [emailInput, passwordInput, roleSelect].forEach(el => {
        if (el) el.addEventListener('input', () => hideError());
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email    = emailInput?.value.trim();
        const password = passwordInput?.value;
        const role     = roleSelect?.value;

        // Client-side validation
        if (!email) return showError('Please enter your email.');
        if (!isValidEmail(email)) return showError('Please enter a valid email address.');
        if (!password) return showError('Please enter your password.');
        if (!role) return showError('Please select your role.');

        // MMCOE email validation for students
        if (role === 'STUDENT' && !email.endsWith('@mmcoe.com')) {
            return showError('Student accounts must use an MMCOE email (@mmcoe.com).');
        }

        // Show loading
        setLoginLoading(true);

        try {
            const result = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, role })
            });

            if (result && result.ok && result.data.success) {
                saveSession(result.data.data);

                // Redirect based on role
                const userRole = result.data.data.role;
                if (userRole === 'ADMIN')    window.location.href = '/admin/dashboard.html';
                else if (userRole === 'ACCOUNTS') window.location.href = '/accounts/dashboard.html';
                else if (userRole === 'STUDENT')  window.location.href = '/student/dashboard.html';
            } else {
                const msg = (result && result.data && result.data.message)
                    ? result.data.message
                    : 'Invalid credentials. Please try again.';
                showError(msg);
            }
        } catch (err) {
            console.error('Login error:', err);
            showError('Unable to connect to server. Please ensure the backend is running on port 8080.');
        } finally {
            setLoginLoading(false);
        }
    });

    function showError(msg) {
        if (!loginError) return;
        loginError.querySelector('span').textContent = msg;
        loginError.classList.add('show');
    }

    function hideError() {
        if (!loginError) return;
        loginError.classList.remove('show');
    }

    function setLoginLoading(loading) {
        if (!loginBtn) return;
        if (loading) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Signing In...';
        } else {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In';
        }
    }
});

// ============================================================
// Forgot Password Handler
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (!forgotForm) return;

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('forgotEmail')?.value.trim();
        const role  = document.getElementById('forgotRole')?.value;
        const btn   = document.getElementById('forgotBtn');
        const msgEl = document.getElementById('forgotMessage');

        if (!email) return showForgotMsg('Please enter your email.', 'danger');
        if (!isValidEmail(email)) return showForgotMsg('Please enter a valid email.', 'danger');
        if (!role) return showForgotMsg('Please select your role.', 'danger');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

        try {
            const result = await apiFetch('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email, role })
            });

            const msg = (result && result.data && result.data.message)
                ? result.data.message
                : 'If the account exists, a password reset link has been sent.';
            showForgotMsg(msg, 'success');
            forgotForm.reset();
        } catch (err) {
            showForgotMsg('Unable to connect. Please try again.', 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-send"></i> Send Reset Link';
        }
    });

    function showForgotMsg(msg, type) {
        const el = document.getElementById('forgotMessage');
        if (!el) return;
        el.className = `alert alert-${type} mt-3`;
        el.textContent = msg;
        el.style.display = 'block';
    }
});

// ============================================================
// Reset Password Handler
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetPasswordForm');
    if (!resetForm) return;

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (!token) {
        document.getElementById('resetTokenInput').value = 'DEMO_TOKEN_123';
    } else {
        document.getElementById('resetTokenInput').value = token;
    }

    // Password strength indicator
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            updatePasswordStrength(newPasswordInput.value);
        });
    }

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = document.getElementById('resetTokenInput')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const btn = document.getElementById('resetBtn');

        if (!newPassword || newPassword.length < 8) {
            return showResetMsg('Password must be at least 8 characters.', 'danger');
        }
        if (newPassword !== confirmPassword) {
            return showResetMsg('Passwords do not match.', 'danger');
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Resetting...';

        try {
            const result = await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ token, newPassword, confirmPassword })
            });

            if (result && result.ok && result.data.success) {
                showResetMsg(result.data.message + ' Redirecting to login...', 'success');
                setTimeout(() => { window.location.href = '/login.html'; }, 3000);
            } else {
                const msg = result?.data?.message || 'Failed to reset password.';
                showResetMsg(msg, 'danger');
            }
        } catch (err) {
            showResetMsg('Unable to connect. Please try again.', 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lock"></i> Reset Password';
        }
    });

    function showResetMsg(msg, type) {
        const el = document.getElementById('resetMessage');
        if (!el) return;
        el.className = `alert alert-${type} mt-3`;
        el.textContent = msg;
        el.style.display = 'block';
    }
});

// ============================================================
// Password Strength Checker
// ============================================================
function updatePasswordStrength(password) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { label: '',       class: '', color: '' },
        { label: 'Weak',   class: 'weak',   color: '#e02424' },
        { label: 'Fair',   class: 'fair',   color: '#d97706' },
        { label: 'Good',   class: 'good',   color: '#0e9f6e' },
        { label: 'Strong', class: 'strong', color: '#0e9f6e' },
    ];

    const level = levels[score] || levels[0];
    fill.className = `strength-fill ${level.class}`;
    text.textContent = level.label;
    text.style.color = level.color;
}

// ============================================================
// Dashboard Sidebar & Topbar Initializer
// ============================================================
function initDashboard() {
    // Set user info in sidebar/topbar
    const name = getName() || 'User';
    const role = getRole() || '';
    const email = getEmail() || '';

    // Update sidebar user info
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarUserName) sidebarUserName.textContent = name;
    if (sidebarUserRole) sidebarUserRole.textContent = formatRole(role);
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = getInitials(name);

    // Update topbar
    const topbarUserName = document.getElementById('topbarUserName');
    const topbarUserRole = document.getElementById('topbarUserRole');
    const topbarAvatar = document.getElementById('topbarAvatar');
    if (topbarUserName) topbarUserName.textContent = name;
    if (topbarUserRole) topbarUserRole.textContent = formatRole(role);
    if (topbarAvatar) topbarAvatar.textContent = getInitials(name);

    // Logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to sign out?')) logout();
        });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            if (overlay) overlay.classList.toggle('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar?.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
}

// ============================================================
// Utility Functions
// ============================================================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isMMCOEEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@mmcoe\.com$/.test(email);
}

function isValidPRN(prn) {
    return /^B\d{2}[A-Z]{2,4}\d{4}$/.test(prn.toUpperCase());
}

function isValidMobile(mobile) {
    return /^[6-9]\d{9}$/.test(mobile);
}

function formatRole(role) {
    const map = { ADMIN: 'Administrator', ACCOUNTS: 'Accounts Officer', STUDENT: 'Student' };
    return map[role] || role;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
    const map = {
        'ACTIVE':   'badge-active',
        'INACTIVE': 'badge-inactive',
        'PENDING':  'badge-pending',
        'SUCCESS':  'badge-success',
        'FAILED':   'badge-failed',
        'PARTIALLY PAID': 'badge-pending',
    };
    const cls = map[status?.toUpperCase()] || 'badge-pending';
    return `<span class="badge ${cls}">${status}</span>`;
}

// Toast notification
function showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const id = 'toast-' + Date.now();
    const icon = type === 'success' ? 'check-circle' : type === 'danger' ? 'x-circle' : 'info-circle';
    const bg = type === 'success' ? '#def7ec' : type === 'danger' ? '#fde8e8' : '#e0f2fe';
    const color = type === 'success' ? '#03543f' : type === 'danger' ? '#9b1c1c' : '#075985';

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = `
        background: ${bg}; color: ${color}; border-radius: 8px;
        padding: 0.85rem 1.1rem; margin-bottom: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.875rem; font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 320px;
    `;
    el.innerHTML = `<i class="bi bi-${icon}"></i> <span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => { el.remove(); }, 4000);
}
