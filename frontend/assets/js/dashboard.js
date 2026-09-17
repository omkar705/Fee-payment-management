/**
 * MMCOE Fee Payment Management Platform — Dashboard Engine
 * Handles session authentication guard, sidebar navigation, mobile toggling, and dynamic updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Session Authentication
    const session = checkAuth();
    if (!session) return;

    // 2. Populate Profile Information
    populateUserProfile(session);

    // 3. Set Dynamic Date Display
    initLiveDate();

    // 4. Bind Mobile Sidebar Toggle
    initMobileSidebar();

    // 5. Bind Sidebar Tab Navigation
    initSidebarNav();

    // 6. Bind Sign Out
    initLogout();
});

/**
 * Authentication Guard
 */
function checkAuth() {
    const token = localStorage.getItem('fpm_token');
    const role = localStorage.getItem('fpm_role');
    const userStr = localStorage.getItem('fpm_user');

    if (!token || !role) {
        window.location.href = '../login.html';
        return null;
    }

    try {
        const user = JSON.parse(userStr || '{}');
        return { token, role, user };
    } catch (e) {
        return { token, role, user: { name: 'User', role: role } };
    }
}

/**
 * Initialize Dynamic Date
 */
function initLiveDate() {
    const dateEl = document.getElementById('liveDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        dateEl.textContent = today.toLocaleDateString('en-IN', options);
    }
}

/**
 * Mobile Sidebar Offcanvas Toggle
 */
function initMobileSidebar() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('erpSidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('show-mobile');
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('show-mobile');
            }
        });
    }
}

/**
 * Tab Navigation for Single-Page ERP Dashboards
 */
function initSidebarNav() {
    const navLinks = document.querySelectorAll('.erp-sidebar-nav .erp-nav-link[data-section]');
    if (!navLinks.length) return;

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = link.getAttribute('data-section');
            if (!targetSectionId) return;

            // 1. Update Active State
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 2. Update Topbar Breadcrumb
            const crumbEl = document.getElementById('topbarCrumb');
            const linkText = link.querySelector('span')?.textContent || 'Overview';
            if (crumbEl) {
                crumbEl.textContent = linkText;
            }

            // 3. Switch Canvas Section
            document.querySelectorAll('.dashboard-section').forEach(sec => {
                sec.classList.add('d-none');
            });
            const activeSec = document.getElementById(targetSectionId);
            if (activeSec) {
                activeSec.classList.remove('d-none');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // 4. Close mobile sidebar if open
            const sidebar = document.getElementById('erpSidebar');
            if (sidebar) sidebar.classList.remove('show-mobile');
        });
    });
}

/**
 * Populate Profile Elements
 */
function populateUserProfile(session) {
    const user = session.user || {};
    let name = user.name;
    let email = user.email;

    if (!name) {
        if (session.role === 'ADMIN') name = 'Administrator';
        else if (session.role === 'ACCOUNTS') name = 'Accounts Officer';
        else name = 'Manan Vivekanand Tote';
    }

    if (!email) {
        if (session.role === 'ADMIN') email = 'admin@mmcoe.com';
        else if (session.role === 'ACCOUNTS') email = 'accounts@mmcoe.com';
        else email = 'b25it2010@mmcoe.com';
    }

    document.querySelectorAll('.user-name-display').forEach(el => el.textContent = name);
    document.querySelectorAll('.user-email-display').forEach(el => el.textContent = email);
    document.querySelectorAll('.user-avatar-display').forEach(el => el.textContent = getInitials(name));
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

/**
 * Handle Sign Out
 */
function initLogout() {
    const logoutBtns = document.querySelectorAll('.logout-btn, #logoutBtn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('fpm_token');
            localStorage.removeItem('fpm_role');
            localStorage.removeItem('fpm_user');
            localStorage.removeItem('fpm_payment_history');
            sessionStorage.clear();
            window.location.href = '../login.html';
        });
    });
}
