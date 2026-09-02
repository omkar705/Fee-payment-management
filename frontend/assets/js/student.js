/**
 * student.js — Student Dashboard & Profile
 * Fee Payment Management Platform — Milestone 1
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('STUDENT')) return;
    initDashboard();

    const page = document.body.dataset.page;
    if (page === 'student-dashboard') initStudentDashboard();
    else if (page === 'student-profile') initStudentProfile();
});

// ============================================================
// Student Dashboard
// ============================================================
async function initStudentDashboard() {
    try {
        const result = await apiFetch('/student/dashboard');
        if (result && result.ok && result.data.data) {
            renderStudentDashboard(result.data.data);
        } else {
            renderStudentDashboard(getDummyStudentData());
        }
    } catch (e) {
        renderStudentDashboard(getDummyStudentData());
    }
}

function renderStudentDashboard(data) {
    const student = data.student || {};

    // Student identity panel
    setTxt('studentName',    student.name || getName());
    setTxt('studentPrn',     student.prn  || '—');
    setTxt('studentDept',    student.department || '—');
    setTxt('studentCourse',  student.course || '—');
    setTxt('studentYear',    student.academicYear || '—');

    const initialsEl = document.getElementById('studentInitials');
    if (initialsEl) initialsEl.textContent = getInitials(student.name || getName());

    // Fee cards
    const total   = data.totalFee   || 120000;
    const paid    = data.paidAmount  || 80000;
    const pending = data.pendingAmount || 40000;
    const paidPct = Math.round((paid / total) * 100);

    setTxt('feeTotalAmount',   formatCurrency(total));
    setTxt('feePaidAmount',    formatCurrency(paid));
    setTxt('feePendingAmount', formatCurrency(pending));
    setTxt('feeStatus',        data.paymentStatus || 'PARTIALLY PAID');
    setTxt('feePaidPct',       paidPct + '%');

    // Progress bar
    const bar = document.getElementById('feeProgressBar');
    if (bar) { bar.style.width = paidPct + '%'; }

    // Set status badge color
    const statusEl = document.getElementById('feeStatus');
    if (statusEl) {
        statusEl.className = 'badge ' + getPaymentStatusClass(data.paymentStatus);
    }

    // Payment history table
    const tbody = document.getElementById('paymentHistoryTbody');
    if (tbody) renderPaymentHistory(tbody, getDummyPaymentHistory());
}

function setTxt(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function getPaymentStatusClass(status) {
    const map = {
        'PAID':           'badge-success',
        'PARTIALLY PAID': 'badge-pending',
        'PENDING':        'badge-inactive',
        'OVERDUE':        'badge-inactive',
    };
    return map[status] || 'badge-pending';
}

function renderPaymentHistory(tbody, history) {
    if (!history.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">No payment history found.</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(p => `
        <tr>
            <td><code style="font-size:0.8rem;color:#1a56db;">${escHtml(p.txId)}</code></td>
            <td style="font-size:0.875rem;color:#6b7280;">${escHtml(p.date)}</td>
            <td><strong>${formatCurrency(p.amount)}</strong></td>
            <td>${paymentBadge(p.status)}</td>
        </tr>
    `).join('');
}

function paymentBadge(status) {
    const map = {
        SUCCESS: ['bg-success', 'SUCCESS'],
        PENDING: ['bg-warning text-dark', 'PENDING'],
        FAILED:  ['bg-danger', 'FAILED'],
    };
    const [cls, label] = map[status] || ['bg-secondary', status];
    return `<span class="badge ${cls}" style="border-radius:30px;">${label}</span>`;
}

// ============================================================
// Student Profile
// ============================================================
async function initStudentProfile() {
    // Show name from session immediately
    const name  = getName();
    const email = getEmail();
    const initials = document.getElementById('profileInitials');
    if (initials) initials.textContent = getInitials(name);
    setTxt('profileName', name);
    setTxt('profileEmail', email);

    try {
        const result = await apiFetch('/student/profile');
        if (result && result.ok && result.data.data) {
            const s = result.data.data;
            setTxt('profileName',  s.name);
            setTxt('profilePrn',   s.prn);
            setTxt('profileEmail', s.email);
            setTxt('profileDept',  s.department);
            setTxt('profileCourse', s.course);
            setTxt('profileYear',  s.academicYear);
            setTxt('profileMobile', s.mobile);
            if (initials) initials.textContent = getInitials(s.name);

            const statusEl = document.getElementById('profileStatus');
            if (statusEl) statusEl.innerHTML = statusBadge(s.status);
        }
    } catch (e) {
        // Fallback to dummy
        setTxt('profilePrn',     'B25IT2010');
        setTxt('profileDept',    'Information Technology');
        setTxt('profileCourse',  'B.Tech');
        setTxt('profileYear',    '2025-26');
        setTxt('profileMobile',  '9876543210');
        const statusEl = document.getElementById('profileStatus');
        if (statusEl) statusEl.innerHTML = statusBadge('ACTIVE');
    }
}

// ============================================================
// Dummy Data (demo when backend unavailable)
// ============================================================
function getDummyStudentData() {
    return {
        student: {
            name: getName() || 'Manan Tote',
            prn: 'B25IT2010',
            department: 'Information Technology',
            course: 'B.Tech',
            academicYear: '2025-26',
        },
        totalFee: 120000,
        paidAmount: 80000,
        pendingAmount: 40000,
        paymentStatus: 'PARTIALLY PAID',
    };
}

function getDummyPaymentHistory() {
    return [
        { txId: 'TXN-2025-0045', date: '10-Aug-2025', amount: 30000, status: 'SUCCESS' },
        { txId: 'TXN-2025-0031', date: '15-Jul-2025', amount: 25000, status: 'SUCCESS' },
        { txId: 'TXN-2025-0018', date: '05-Jun-2025', amount: 25000, status: 'SUCCESS' },
        { txId: 'TXN-2025-0003', date: '01-Apr-2025', amount: 40000, status: 'PENDING' },
    ];
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
