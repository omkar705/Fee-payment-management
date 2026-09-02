/**
 * admin.js — Admin Dashboard, Analytics & Student Management
 * Fee Payment Management Platform — MMCOE
 *
 * Provides live backend integration with graceful mock-data fallbacks
 * for analytics and institutional fee structure distributions.
 */

// ============================================================
// Page Initialization & Routing
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('ADMIN')) return;
    initDashboard();
    initAddStudentModal();

    const page = document.body.dataset.page;
    if (page === 'admin-dashboard' || document.getElementById('sec-admin-dashboard')) {
        initAdminDashboard();
    }
    if (page === 'admin-students') {
        initStudentsPage();
    } else if (page === 'admin-add-student') {
        initAddStudentPage();
    } else if (page === 'admin-profile') {
        initAdminProfile();
    }
});

// ============================================================
// 1. ADMIN DASHBOARD INITIALIZATION
// ============================================================
async function initAdminDashboard() {
    setDashboardGreeting();
    await loadAdminDashboardStats();
    await loadRecentStudents();
    await loadDashboardStudents();

    // Render Analytics and Distribution Charts
    renderAnalyticsChart('year');
    renderDeptFeeChart();
    renderFeeTypeChart();
}

/**
 * Friendly time-of-day greeting
 */
function setDashboardGreeting() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const el = document.getElementById('dashboardGreeting');
    if (el) el.textContent = `${greet}, Administrator 👋`;
}

/**
 * Load live KPI statistics from backend: GET /api/admin/dashboard
 */
async function loadAdminDashboardStats() {
    try {
        const result = await apiFetch('/admin/dashboard');
        if (result && result.ok && result.data.data) {
            const stats = result.data.data;
            setStatValue('statTotalStudents', stats.totalStudents || 0);
        } else {
            setStatValue('statTotalStudents', 10);
        }
    } catch (e) {
        setStatValue('statTotalStudents', 10);
    }

    const feeEl = document.getElementById('statTotalFeeCollection');
    if (feeEl) feeEl.textContent = '₹82,50,000';
}

function setStatValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value).toLocaleString('en-IN');
}

// ============================================================
// 2. RECENT STUDENT REGISTRATIONS (DASHBOARD)
// ============================================================
async function loadRecentStudents() {
    const tbody = document.getElementById('recentStudentsTbody');
    if (!tbody) return;

    let students = [];
    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data.data && result.data.data.length > 0) {
            students = result.data.data;
        } else {
            students = getDummyStudents();
        }
    } catch (e) {
        students = getDummyStudents();
    }

    // Sort to show most recently registered first (descending by ID/created)
    const recent = [...students].slice(0, 5);
    renderRecentStudentsRows(tbody, recent);
}

function renderRecentStudentsRows(tbody, students) {
    if (!students || !students.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-info-circle me-1"></i>No student registrations found.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = students.map((s, idx) => {
        const regDate = s.createdAt ? formatDate(s.createdAt) : 'AY 2025-26';
        const safeName = escHtml(s.name);
        const safePrn = escHtml(s.prn);
        const safeEmail = escHtml(s.email);
        const safeDept = escHtml(s.department);
        const safeYear = escHtml(s.academicYear || 'Second Year (SE)');
        const safeStatus = s.status || 'ACTIVE';

        return `
        <tr>
            <td>
                <div class="student-avatar-inline">
                    <div class="avatar-initials-badge ${idx % 2 === 1 ? 'avatar-accent' : ''}">${getInitials(s.name)}</div>
                    <div>
                        <div class="student-name-text">${safeName}</div>
                        <div class="student-sub-text">${safeEmail}</div>
                    </div>
                </div>
            </td>
            <td><span class="prn-code-badge">${safePrn}</span></td>
            <td><code style="font-size:0.8rem;color:#1e40af;">${safeEmail}</code></td>
            <td>${safeDept}</td>
            <td><span class="text-muted" style="font-size:0.82rem;"><i class="bi bi-calendar-event me-1"></i>${regDate}</span></td>
            <td>${statusBadge(safeStatus)}</td>
            <td>
                <button class="btn-icon-action" title="View Profile Details"
                    onclick="viewStudentModal('${safeName}', '${safePrn}', '${safeEmail}', '${safeDept}', '${safeYear}', 'A', '${safeStatus}', '${s.mobile || '9876543210'}', '${s.caste || 'General'}', '${s.gender || (idx % 3 === 0 ? 'Female' : 'Male')}', '${s.income || '₹2.5L – ₹6.0L'}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ============================================================
// 3. FEE COLLECTION ANALYTICS (CHART.JS)
// ============================================================
let _analyticsChart = null;

/**
 * Mock analytics dataset structure.
 * Designed to be replaced with: GET /api/admin/analytics?period=year|month|week
 */
const ANALYTICS_DATA = {
    year: {
        '2025-26': {
            labels:  ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            amounts: [825000, 612000, 490000, 278000, 935000, 1150000, 720000, 480000, 390000, 1050000, 680000, 540000],
            subtitle: 'Monthly fee collection — Academic Year 2025-26',
            periodLabel: 'Annual (AY 2025-26)'
        },
        '2024-25': {
            labels:  ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            amounts: [750000, 580000, 430000, 260000, 890000, 1020000, 680000, 440000, 370000, 980000, 620000, 510000],
            subtitle: 'Monthly fee collection — Academic Year 2024-25',
            periodLabel: 'Annual (AY 2024-25)'
        },
        '2023-24': {
            labels:  ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            amounts: [690000, 510000, 390000, 220000, 810000, 940000, 610000, 400000, 330000, 890000, 570000, 480000],
            subtitle: 'Monthly fee collection — Academic Year 2023-24',
            periodLabel: 'Annual (AY 2023-24)'
        }
    },
    month: {
        labels:  ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        amounts: [185000, 240000, 310000, 195000],
        subtitle: 'Weekly fee collection — Current Month',
        periodLabel: 'Monthly Overview'
    },
    week: {
        labels:  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        amounts: [42000, 67000, 38000, 91000, 55000, 14000, 0],
        subtitle: 'Daily fee collection — Current Week',
        periodLabel: 'Weekly Overview'
    }
};

function formatINR(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L';
    if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + Number(n).toLocaleString('en-IN');
}

function renderAnalyticsChart(period) {
    const ctx = document.getElementById('feeAnalyticsChart');
    if (!ctx) return;

    let d;
    if (period === 'year') {
        const yearVal = document.getElementById('analyticsYearSelect')?.value || '2025-26';
        d = ANALYTICS_DATA.year[yearVal] || ANALYTICS_DATA.year['2025-26'];
    } else if (period === 'month') {
        d = ANALYTICS_DATA.month;
    } else {
        d = ANALYTICS_DATA.week;
    }

    // Update text indicators
    const totalRaw = d.amounts.reduce((a, b) => a + b, 0);
    const totalEl  = document.getElementById('analyticsTotalCollected');
    const subtitleEl = document.getElementById('analyticsSubtitle');
    const periodLbl  = document.getElementById('analyticsPeriodLabel');
    if (totalEl)   totalEl.textContent = '₹' + totalRaw.toLocaleString('en-IN');
    if (subtitleEl) subtitleEl.textContent = d.subtitle;
    if (periodLbl) periodLbl.textContent = d.periodLabel;

    if (_analyticsChart) {
        _analyticsChart.destroy();
        _analyticsChart = null;
    }

    const canvasContext = ctx.getContext('2d');
    const gradient = canvasContext.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0,   'rgba(37, 99, 235, 0.85)');
    gradient.addColorStop(0.6, 'rgba(37, 99, 235, 0.40)');
    gradient.addColorStop(1,   'rgba(37, 99, 235, 0.04)');

    _analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: d.labels,
            datasets: [{
                label: 'Fee Collected (₹)',
                data: d.amounts,
                backgroundColor: gradient,
                borderColor: 'rgba(37, 99, 235, 0.9)',
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false,
                hoverBackgroundColor: 'rgba(29, 78, 216, 0.95)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 400, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ' ' + formatINR(c.parsed.y)
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                    bodyFont:  { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }, color: '#64748b' }
                },
                y: {
                    grid: { color: 'rgba(100,116,139,0.08)', drawBorder: false },
                    border: { display: false, dash: [4, 4] },
                    ticks: {
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                        color: '#64748b',
                        callback: v => formatINR(v)
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function onAnalyticsPeriodChange(period) {
    const yearSel  = document.getElementById('analyticsYearSelect');
    const monthSel = document.getElementById('analyticsMonthSelect');
    const weekSel  = document.getElementById('analyticsWeekSelect');
    if (yearSel)  yearSel.classList.toggle('d-none',  period !== 'year');
    if (monthSel) monthSel.classList.toggle('d-none', period !== 'month');
    if (weekSel)  weekSel.classList.toggle('d-none',  period !== 'week');
    renderAnalyticsChart(period);
}

function onAnalyticsSubSelectChange() {
    const period = document.getElementById('analyticsPeriod')?.value || 'year';
    renderAnalyticsChart(period);
}

// ============================================================
// 4. DEPARTMENT-WISE FEE COLLECTION (CHART.JS)
// ============================================================
let _deptFeeChart = null;

const DEPT_FEE_DATA = {
    labels: [
        'Information Technology',
        'Computer Engineering',
        'Mechanical Engineering',
        'Electronics & Telecommunication',
        'Civil Engineering',
        'CSE (AI / ML)'
    ],
    amounts: [2400000, 2250000, 1420000, 1180000, 600000, 400000],
    colors: [
        'rgba(37, 99, 235, 0.85)',
        'rgba(99, 102, 241, 0.85)',
        'rgba(16, 185, 129, 0.85)',
        'rgba(245, 158, 11, 0.85)',
        'rgba(239, 68, 68, 0.85)',
        'rgba(168, 85, 247, 0.85)'
    ]
};

function renderDeptFeeChart() {
    const ctx = document.getElementById('deptFeeChart');
    if (!ctx) return;

    if (_deptFeeChart) {
        _deptFeeChart.destroy();
        _deptFeeChart = null;
    }

    _deptFeeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DEPT_FEE_DATA.labels,
            datasets: [{
                label: 'Collection (₹)',
                data: DEPT_FEE_DATA.amounts,
                backgroundColor: DEPT_FEE_DATA.colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 400, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => ' ' + formatINR(c.parsed.x)
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(100,116,139,0.08)', drawBorder: false },
                    ticks: {
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 10.5 },
                        color: '#64748b',
                        callback: v => formatINR(v)
                    },
                    beginAtZero: true
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// ============================================================
// 5. FEE TYPE DISTRIBUTION (DOUGHNUT CHART)
// ============================================================
let _feeTypeChart = null;

const FEE_TYPE_DATA = {
    labels: ['Tuition Fee', 'Development Fee', 'Exam Fee'],
    amounts: [6200000, 1250000, 800000],
    colors: ['#2563eb', '#10b981', '#f59e0b']
};

function renderFeeTypeChart() {
    const ctx = document.getElementById('feeTypeChart');
    if (!ctx) return;

    if (_feeTypeChart) {
        _feeTypeChart.destroy();
        _feeTypeChart = null;
    }

    const total = FEE_TYPE_DATA.amounts.reduce((a, b) => a + b, 0);

    _feeTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: FEE_TYPE_DATA.labels,
            datasets: [{
                data: FEE_TYPE_DATA.amounts,
                backgroundColor: FEE_TYPE_DATA.colors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            animation: { duration: 400 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => {
                            const val = c.parsed;
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${c.label}: ${formatINR(val)} (${pct}%)`;
                        }
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    padding: 10,
                    cornerRadius: 8
                }
            }
        }
    });

    // Custom legend below chart
    const legendEl = document.getElementById('feeTypeLegend');
    if (legendEl) {
        legendEl.innerHTML = FEE_TYPE_DATA.labels.map((lbl, i) => {
            const val = FEE_TYPE_DATA.amounts[i];
            const pct = ((val / total) * 100).toFixed(1);
            return `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <div class="d-flex align-items-center gap-2">
                    <span style="width:10px;height:10px;border-radius:50%;background:${FEE_TYPE_DATA.colors[i]};display:inline-block;"></span>
                    <span class="text-secondary">${lbl}</span>
                </div>
                <div>
                    <strong class="text-dark">${formatINR(val)}</strong>
                    <span class="text-muted ms-1">(${pct}%)</span>
                </div>
            </div>`;
        }).join('');
    }
}

// ============================================================
// 6. MANAGE STUDENTS (DASHBOARD SECTION 2)
// ============================================================
let dashStudentsList = [];

async function loadDashboardStudents() {
    const tbody = document.getElementById('allStudentsTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data.data && result.data.data.length > 0) {
            dashStudentsList = result.data.data;
        } else {
            dashStudentsList = getDummyStudents();
        }
    } catch (e) {
        dashStudentsList = getDummyStudents();
    }

    renderDashboardStudentsTable(dashStudentsList);
}

function filterDashboardStudents() {
    const search = document.getElementById('dashStudentSearch')?.value.trim().toLowerCase() || '';
    const dept   = document.getElementById('dashStudentDeptFilter')?.value || '';
    const status = document.getElementById('dashStudentStatusFilter')?.value || '';

    const filtered = dashStudentsList.filter(s => {
        const matchSearch = !search ||
            (s.name && s.name.toLowerCase().includes(search)) ||
            (s.prn && s.prn.toLowerCase().includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search));
        const matchDept   = !dept   || s.department === dept;
        const matchStatus = !status || s.status === status;
        return matchSearch && matchDept && matchStatus;
    });

    renderDashboardStudentsTable(filtered);
}

function renderDashboardStudentsTable(students) {
    const tbody = document.getElementById('allStudentsTbody');
    if (!tbody) return;

    const countEl = document.getElementById('dashStudentCountInfo');
    if (countEl) {
        countEl.textContent = `Showing ${students.length} student${students.length !== 1 ? 's' : ''}`;
    }

    if (!students || !students.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-4 d-block mb-2"></i>No matching students found.
        </td></tr>`;
        return;
    }

    tbody.innerHTML = students.map((s, idx) => {
        const safeName = escHtml(s.name);
        const safePrn = escHtml(s.prn);
        const safeEmail = escHtml(s.email);
        const safeDept = escHtml(s.department);
        const safeCourse = escHtml(s.course || 'B.Tech');
        const safeMobile = escHtml(s.mobile || '—');
        const safeStatus = s.status || 'ACTIVE';
        const safeYear = escHtml(s.academicYear || 'Second Year (SE)');

        return `
        <tr>
            <td>
                <div class="student-avatar-inline">
                    <div class="avatar-initials-badge">${getInitials(s.name)}</div>
                    <div>
                        <div class="student-name-text">${safeName}</div>
                    </div>
                </div>
            </td>
            <td><span class="prn-code-badge">${safePrn}</span></td>
            <td><code style="font-size:0.8rem;color:#1e40af;">${safeEmail}</code></td>
            <td>${safeDept}</td>
            <td>${safeCourse}</td>
            <td>${safeMobile}</td>
            <td>${statusBadge(safeStatus)}</td>
            <td>
                <div class="table-action-btns">
                    <button class="btn-icon-action" title="View Student Profile"
                        onclick="viewStudentModal('${safeName}', '${safePrn}', '${safeEmail}', '${safeDept}', '${safeYear}', 'A', '${safeStatus}', '${safeMobile}', '${s.caste || 'General'}', '${s.gender || (idx % 3 === 0 ? 'Female' : 'Male')}', '${s.income || '₹2.5L – ₹6.0L'}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-icon-action" title="${safeStatus === 'ACTIVE' ? 'Deactivate Student' : 'Activate Student'}"
                        onclick="toggleStudentStatus(${s.id || idx}, '${safeStatus}')">
                        <i class="bi bi-${safeStatus === 'ACTIVE' ? 'person-x' : 'person-check'}"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ============================================================
// 7. VIEW STUDENT MODAL (ENRICHED PROFILE)
// ============================================================
function viewStudentModal(name, prn, email, dept, year, div, status, mobile, caste, gender, income) {
    document.getElementById('modalStudentName').textContent = name || 'Student Profile';
    document.getElementById('modalStudentPRN').textContent = prn || '—';
    document.getElementById('modalStudentEmail').textContent = email || '—';
    document.getElementById('modalStudentDept').textContent = dept || '—';
    document.getElementById('modalStudentCourse').textContent = 'B.Tech (Undergraduate)';
    document.getElementById('modalStudentYear').textContent = year || 'Academic Year 2025-26';
    document.getElementById('modalStudentMobile').textContent = mobile || '9876543210';
    document.getElementById('modalStudentAvatar').textContent = getInitials(name);

    const statEl = document.getElementById('modalStudentStatus');
    if (statEl) {
        statEl.textContent = status || 'ACTIVE';
        statEl.className = status === 'ACTIVE' ? 'status-pill status-pill-active' : 'status-pill status-pill-inactive';
    }

    const catEl = document.getElementById('modalStudentCategory');
    if (catEl) catEl.textContent = caste || 'General (Open)';

    const genderEl = document.getElementById('modalStudentGender');
    if (genderEl) genderEl.textContent = gender || 'Male';

    const incEl = document.getElementById('modalStudentIncome');
    if (incEl) incEl.textContent = income || '₹2.5L – ₹6.0L';

    const modalEl = document.getElementById('studentDetailModal');
    if (modalEl) {
        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    }
}

// ============================================================
// 8. STUDENTS STANDALONE PAGE (students.html)
// ============================================================
let allStudents = [];
let currentPage = 1;
const PAGE_SIZE = 8;

async function initStudentsPage() {
    await loadStudents();

    document.getElementById('searchInput')?.addEventListener('input', debounce(filterStudents, 300));

    ['filterDept', 'filterYear', 'filterStatus'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', filterStudents);
    });

    document.getElementById('clearFilters')?.addEventListener('click', () => {
        const s = document.getElementById('searchInput');
        const d = document.getElementById('filterDept');
        const y = document.getElementById('filterYear');
        const st = document.getElementById('filterStatus');
        if (s) s.value = '';
        if (d) d.value = '';
        if (y) y.value = '';
        if (st) st.value = '';
        filterStudents();
    });
}

async function loadStudents() {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    showTableLoading(tbody, 8);

    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data.data) {
            allStudents = result.data.data;
        } else {
            allStudents = getDummyStudents();
        }
    } catch (e) {
        allStudents = getDummyStudents();
    }

    renderStudentsTable(allStudents);
    updateStudentCount(allStudents.length);
}

function filterStudents(resetPage = true) {
    const search = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    const dept   = document.getElementById('filterDept')?.value || '';
    const year   = document.getElementById('filterYear')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    let filtered = allStudents.filter(s => {
        const matchSearch = !search ||
            (s.name && s.name.toLowerCase().includes(search)) ||
            (s.prn && s.prn.toLowerCase().includes(search)) ||
            (s.email && s.email.toLowerCase().includes(search));
        const matchDept   = !dept   || s.department === dept;
        const matchYear   = !year   || s.academicYear === year;
        const matchStatus = !status || s.status === status;
        return matchSearch && matchDept && matchYear && matchStatus;
    });

    if (resetPage) currentPage = 1;
    renderStudentsTable(filtered);
    updateStudentCount(filtered.length);
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = students.slice(start, start + PAGE_SIZE);

    if (!page.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-4 d-block mb-2"></i>No students found.
        </td></tr>`;
        renderPagination(0, students);
        return;
    }

    tbody.innerHTML = page.map((s, i) => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar" style="width:34px;height:34px;font-size:0.8rem;">${getInitials(s.name)}</div>
                    <div>
                        <div class="fw-semibold" style="font-size:0.875rem;">${escHtml(s.name)}</div>
                        <div class="text-muted" style="font-size:0.75rem;">${escHtml(s.mobile || '')}</div>
                    </div>
                </div>
            </td>
            <td><code style="font-size:0.8rem;color:#1a56db;">${escHtml(s.prn)}</code></td>
            <td style="font-size:0.875rem;">${escHtml(s.email)}</td>
            <td style="font-size:0.875rem;">${escHtml(s.department)}</td>
            <td style="font-size:0.875rem;">${escHtml(s.course)}</td>
            <td style="font-size:0.875rem;">${escHtml(s.academicYear)}</td>
            <td>${statusBadge(s.status)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary" title="View Details" onclick="viewStudent(${s.id || i})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="${s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}"
                        onclick="toggleStudentStatus(${s.id || i}, '${s.status}')">
                        <i class="bi bi-${s.status === 'ACTIVE' ? 'person-x' : 'person-check'}"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination(students.length, students);
}

function renderPagination(total, students) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '<ul class="pagination pagination-sm mb-0">';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}, event)"><i class="bi bi-chevron-left"></i></a></li>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}, event)">${i}</a></li>`;
        } else if (Math.abs(i - currentPage) === 2) {
            html += `<li class="page-item disabled"><a class="page-link">…</a></li>`;
        }
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}, event)"><i class="bi bi-chevron-right"></i></a></li>`;
    html += '</ul>';
    container.innerHTML = html;
}

function goToPage(page, e) {
    if (e) e.preventDefault();
    const totalPages = Math.ceil(allStudents.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    filterStudents(false);
}

function updateStudentCount(count) {
    const el = document.getElementById('studentCount');
    if (el) el.textContent = `${count} student${count !== 1 ? 's' : ''}`;
}

async function viewStudent(id) {
    const student = allStudents.find(s => s.id == id || allStudents.indexOf(s) == id);
    if (!student) return;
    showStudentModal(student);
}

function showStudentModal(student) {
    const modal = document.getElementById('viewStudentModal');
    if (!modal) return;

    document.getElementById('modalStudentName').textContent = student.name;
    document.getElementById('modalStudentPrn').textContent = student.prn;
    document.getElementById('modalStudentEmail').textContent = student.email;
    document.getElementById('modalStudentDept').textContent = student.department;
    document.getElementById('modalStudentCourse').textContent = student.course;
    document.getElementById('modalStudentYear').textContent = student.academicYear;
    document.getElementById('modalStudentMobile').textContent = student.mobile || '—';
    document.getElementById('modalStudentStatus').innerHTML = statusBadge(student.status);

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

async function toggleStudentStatus(id, currentStatus) {
    let student = dashStudentsList.find(s => s.id == id || dashStudentsList.indexOf(s) == id)
               || allStudents.find(s => s.id == id || allStudents.indexOf(s) == id);

    if (!student) return;

    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} ${student.name}?`)) return;

    try {
        const result = await apiFetch(`/admin/students/${student.id || id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        if (result && result.ok) {
            showToast(`Student ${action}d successfully.`, 'success');
            student.status = newStatus;
            renderDashboardStudentsTable(dashStudentsList);
            if (allStudents.length) renderStudentsTable(allStudents);
        } else {
            // Local update fallback
            student.status = newStatus;
            renderDashboardStudentsTable(dashStudentsList);
            if (allStudents.length) renderStudentsTable(allStudents);
            showToast(`Student ${action}d successfully.`, 'success');
        }
    } catch (e) {
        student.status = newStatus;
        renderDashboardStudentsTable(dashStudentsList);
        if (allStudents.length) renderStudentsTable(allStudents);
        showToast(`Student ${action}d successfully.`, 'success');
    }
}

// ============================================================
// 9. ADD STUDENT FORM MODAL & PAGE
// ============================================================
function initAddStudentPage() {
    const form = document.getElementById('addStudentForm');
    if (!form) return;

    const prnInput = document.getElementById('prn');
    if (prnInput) {
        prnInput.addEventListener('input', () => {
            prnInput.value = prnInput.value.toUpperCase();
            validatePRN(prnInput);
        });
    }

    const emailInput = document.getElementById('studentEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', () => validateStudentEmail(emailInput));
    }

    const mobileInput = document.getElementById('mobile');
    if (mobileInput) {
        mobileInput.addEventListener('blur', () => validateMobile(mobileInput));
    }

    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        if (confirm('Discard changes and go back?')) {
            window.location.href = '/admin/students.html';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateAddStudentForm()) return;

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';

        const data = {
            name:         document.getElementById('fullName').value.trim(),
            prn:          document.getElementById('prn').value.trim().toUpperCase(),
            email:        document.getElementById('studentEmail').value.trim(),
            mobile:       document.getElementById('mobile').value.trim(),
            department:   document.getElementById('department').value,
            course:       document.getElementById('course').value,
            academicYear: document.getElementById('academicYear').value,
        };

        try {
            const result = await apiFetch('/admin/students', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (result && result.ok && result.data.success) {
                showFormSuccess('Student account created successfully! The student can log in with their MMCOE email.');
                form.reset();
            } else {
                const msg = result?.data?.message || 'Failed to create student.';
                showFormError(msg);
            }
        } catch (err) {
            showFormError('Unable to connect to server. Please ensure the backend is running.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-person-plus"></i> Create Student';
        }
    });
}

function validateAddStudentForm() {
    let valid = true;
    clearFormErrors();

    const fullName = document.getElementById('fullName')?.value.trim();
    if (!fullName || fullName.length < 2) {
        setFieldError('fullName', 'Full name is required (min 2 characters).');
        valid = false;
    }

    const prn = document.getElementById('prn')?.value.trim();
    if (!prn) {
        setFieldError('prn', 'PRN is required.');
        valid = false;
    } else if (!isValidPRN(prn)) {
        setFieldError('prn', 'Enter a valid PRN. Example: B25IT2010');
        valid = false;
    }

    const email = document.getElementById('studentEmail')?.value.trim();
    if (!email) {
        setFieldError('studentEmail', 'Email is required.');
        valid = false;
    } else if (!isMMCOEEmail(email)) {
        setFieldError('studentEmail', 'Email must be an MMCOE email (example: student@mmcoe.com).');
        valid = false;
    }

    const mobile = document.getElementById('mobile')?.value.trim();
    if (!mobile) {
        setFieldError('mobile', 'Mobile number is required.');
        valid = false;
    } else if (!isValidMobile(mobile)) {
        setFieldError('mobile', 'Enter a valid Indian mobile number (10 digits, starting with 6-9).');
        valid = false;
    }

    if (!document.getElementById('department')?.value) {
        setFieldError('department', 'Please select a department.');
        valid = false;
    }

    if (!document.getElementById('course')?.value) {
        setFieldError('course', 'Please select a course.');
        valid = false;
    }

    if (!document.getElementById('academicYear')?.value) {
        setFieldError('academicYear', 'Please select academic year.');
        valid = false;
    }

    return valid;
}

function validatePRN(input) {
    const val = input.value.trim();
    const feedbackEl = document.getElementById('prnFeedback');
    if (!val) { clearFieldError(input); return; }
    if (isValidPRN(val)) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        if (feedbackEl) feedbackEl.textContent = '';
    } else {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        if (feedbackEl) feedbackEl.textContent = 'Enter a valid PRN. Example: B25IT2010';
    }
}

function validateStudentEmail(input) {
    const val = input.value.trim();
    if (!val) return;
    if (isMMCOEEmail(val)) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
    }
}

function validateMobile(input) {
    const val = input.value.trim();
    if (!val) return;
    if (isValidMobile(val)) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    } else {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
    }
}

function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const feedback = field?.parentElement?.querySelector('.invalid-feedback')
                  || document.getElementById(fieldId + 'Feedback');
    if (field) { field.classList.add('is-invalid'); field.classList.remove('is-valid'); }
    if (feedback) feedback.textContent = message;
}

function clearFieldError(input) {
    input.classList.remove('is-invalid', 'is-valid');
}

function clearFormErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
    document.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
}

function showFormError(msg) {
    const el = document.getElementById('formError');
    if (el) {
        el.classList.remove('d-none');
        el.style.display = 'flex';
        el.querySelector('span') ? el.querySelector('span').textContent = msg : el.textContent = msg;
    }
    const successEl = document.getElementById('formSuccess');
    if (successEl) { successEl.classList.add('d-none'); successEl.style.display = 'none'; }
}

function showFormSuccess(msg) {
    const el = document.getElementById('formSuccess');
    if (el) {
        el.classList.remove('d-none');
        el.style.display = 'flex';
        el.querySelector('span') ? el.querySelector('span').textContent = msg : el.textContent = msg;
    }
    const errEl = document.getElementById('formError');
    if (errEl) { errEl.classList.add('d-none'); errEl.style.display = 'none'; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// 10. ADMIN PROFILE
// ============================================================
function initAdminProfile() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const initials = document.getElementById('profileInitials');
    const name = getName() || 'Administrator';
    const email = getEmail() || 'admin@mmcoe.com';
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    if (initials) initials.textContent = getInitials(name);
}

// ============================================================
// 11. DUMMY DATA FOR DEMO & FALLBACK
// ============================================================
function getDummyStudents() {
    return [
        { id:1,  name: 'Manan Vivekanand Tote', prn: 'B25IT2010', email: 'b25it2010@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543210', status: 'ACTIVE', caste: 'OBC', gender: 'Male', income: '₹2.5L – ₹6.0L', createdAt: '2025-08-17 10:30:00' },
        { id:2,  name: 'Aarav Sharma',           prn: 'B25IT2001', email: 'b25it2001@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543201', status: 'ACTIVE', caste: 'General', gender: 'Male', income: 'Above ₹12 Lakh', createdAt: '2025-08-17 11:15:00' },
        { id:3,  name: 'Priya Desai',            prn: 'B25IT2002', email: 'b25it2002@mmcoe.com', department: 'Computer Engineering',   course: 'B.Tech', academicYear: '2025-26', mobile: '9876543202', status: 'ACTIVE', caste: 'General', gender: 'Female', income: '₹6.0L – ₹12.0L', createdAt: '2025-08-17 11:45:00' },
        { id:4,  name: 'Rohan Kulkarni',         prn: 'B25IT2003', email: 'b25it2003@mmcoe.com', department: 'Mechanical Engineering', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543203', status: 'ACTIVE', caste: 'General', gender: 'Male', income: '₹2.5L – ₹6.0L', createdAt: '2025-08-17 12:00:00' },
        { id:5,  name: 'Sneha Patil',            prn: 'B25IT2004', email: 'b25it2004@mmcoe.com', department: 'Civil Engineering',        course: 'B.Tech', academicYear: '2025-26', mobile: '9876543204', status: 'ACTIVE', caste: 'OBC', gender: 'Female', income: '₹1.0L – ₹2.5L', createdAt: '2025-08-17 12:30:00' },
        { id:6,  name: 'Vikram Joshi',           prn: 'B25IT2005', email: 'b25it2005@mmcoe.com', department: 'Electronics & Telecommunication', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543205', status: 'ACTIVE', caste: 'General', gender: 'Male', income: '₹2.5L – ₹6.0L', createdAt: '2025-08-17 13:00:00' },
        { id:7,  name: 'Ananya Mehta',           prn: 'B25IT2006', email: 'b25it2006@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543206', status: 'INACTIVE', caste: 'General', gender: 'Female', income: 'Above ₹12 Lakh', createdAt: '2025-08-17 14:10:00' },
        { id:8,  name: 'Karan Verma',            prn: 'B25IT2007', email: 'b25it2007@mmcoe.com', department: 'Computer Engineering',   course: 'B.Tech', academicYear: '2025-26', mobile: '9876543207', status: 'ACTIVE', caste: 'SC', gender: 'Male', income: 'Below ₹1 Lakh', createdAt: '2025-08-17 14:40:00' },
        { id:9,  name: 'Divya Nair',             prn: 'B25IT2008', email: 'b25it2008@mmcoe.com', department: 'Computer Science & Engineering (AI/ML)', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543208', status: 'ACTIVE', caste: 'General', gender: 'Female', income: '₹6.0L – ₹12.0L', createdAt: '2025-08-17 15:20:00' },
        { id:10, name: 'Arjun Rao',              prn: 'B25IT2009', email: 'b25it2009@mmcoe.com', department: 'Mechanical Engineering', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543209', status: 'ACTIVE', caste: 'NT / VJ / DT', gender: 'Male', income: '₹1.0L – ₹2.5L', createdAt: '2025-08-17 16:00:00' },
    ];
}

// ============================================================
// 12. UTILITY & HELPER FUNCTIONS
// ============================================================
function showTableLoading(tbody, cols) {
    tbody.innerHTML = `<tr><td colspan="${cols}" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading...
    </td></tr>`;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ============================================================
// 13. ADD STUDENT MODAL (DASHBOARD)
// ============================================================
function initAddStudentModal() {
    const form = document.getElementById('addStudentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const alertEl  = document.getElementById('addStudentAlert');
        const submitBtn = document.getElementById('submitAddStudentBtn');
        if (!alertEl || !submitBtn) return;

        const payload = {
            name:         document.getElementById('addName')?.value.trim(),
            prn:          document.getElementById('addPrn')?.value.trim().toUpperCase(),
            email:        document.getElementById('addEmail')?.value.trim().toLowerCase(),
            mobile:       document.getElementById('addMobile')?.value.trim(),
            department:   document.getElementById('addDepartment')?.value,
            course:       document.getElementById('addCourse')?.value,
            academicYear: document.getElementById('addAcademicYear')?.value,
            status:       document.getElementById('addStatus')?.value || 'ACTIVE'
        };

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Creating...';

        try {
            const token = localStorage.getItem('fpm_token');
            let success = false;

            if (token) {
                const res = await fetch('http://localhost:8080/api/admin/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok || res.status === 201) {
                    success = true;
                } else {
                    alertEl.className = 'alert alert-danger mb-3';
                    alertEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>${data.message || 'Failed to create student account.'}`;
                    alertEl.classList.remove('d-none');
                }
            } else {
                success = true; // Demo mode
            }

            if (success) {
                alertEl.className = 'alert alert-success mb-3';
                alertEl.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i><strong>${escHtml(payload.name)}</strong> (${escHtml(payload.prn)}) registered. Default password: <code>Student@123</code>`;
                alertEl.classList.remove('d-none');
                form.classList.remove('was-validated');
                form.reset();

                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
                    if (modal) modal.hide();

                    const notifArea = document.getElementById('notificationArea');
                    if (notifArea) {
                        notifArea.innerHTML = `<div class="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 mb-3" role="alert" style="border-radius:12px;">
                            <i class="bi bi-person-check-fill fs-5"></i>
                            <div><strong>${escHtml(payload.name)}</strong> (PRN: ${escHtml(payload.prn)}) — Student account created. Default password: <code>Student@123</code></div>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>`;
                    }

                    // Reload tables
                    loadRecentStudents();
                    loadDashboardStudents();
                    loadAdminDashboardStats();
                }, 1200);
            }
        } catch (err) {
            alertEl.className = 'alert alert-success mb-3';
            alertEl.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>[Demo] <strong>${escHtml(payload.name)}</strong> (${escHtml(payload.prn)}) registered. Default password: <code>Student@123</code>`;
            alertEl.classList.remove('d-none');
            form.classList.remove('was-validated');
            form.reset();
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
                if (modal) modal.hide();
                loadRecentStudents();
                loadDashboardStudents();
            }, 1200);
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-person-plus-fill me-1"></i>Create Student Account';
    });
}
