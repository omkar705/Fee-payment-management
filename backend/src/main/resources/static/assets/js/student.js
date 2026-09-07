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
    setTxt('studentName',    student.name || (typeof getName === 'function' ? getName() : ''));
    setTxt('studentPrn',     student.prn  || '—');
    setTxt('studentDept',    student.department || '—');
    setTxt('studentCourse',  student.course || '—');
    setTxt('studentYear',    student.academicYear || '—');

    const initialsEl = document.getElementById('studentInitials');
    if (initialsEl) initialsEl.textContent = getInitials(student.name || (typeof getName === 'function' ? getName() : ''));

    // Fee amounts & dynamic balance calculation
    const total   = Number(data.totalFee || 120000);
    const paid    = Number(data.paidAmount || 0);
    const pending = Math.max(0, Number(data.pendingAmount != null ? data.pendingAmount : (total - paid)));
    const isCleared = pending <= 0 || data.isCleared === true;
    const paidPct = Math.min(100, Math.round((paid / total) * 100));

    setTxt('feeTotalAmount',   formatCurrency(total));
    setTxt('feePaidAmount',    formatCurrency(paid));
    setTxt('feePendingAmount', formatCurrency(pending));

    const pendingSubEl = document.getElementById('feePendingSubtext');
    const pendingDueEl = document.getElementById('feePendingDueDate');
    const pendingIconEl = document.getElementById('feePendingIcon');
    const pendingIconWrap = document.getElementById('feePendingIconWrapper');
    const pendingCardVal = document.getElementById('feePendingAmount');

    const heroStatusEl = document.getElementById('heroPaymentStatus');
    const heroIconEl = document.getElementById('heroStatusIcon');

    const progressSub = document.getElementById('feeProgressSubtext');
    const progressBadge = document.getElementById('feeProgressBadge');
    const progressBar = document.getElementById('feeProgressBar');
    const markerInst2 = document.getElementById('markerInst2');

    const upcomingTitle = document.getElementById('upcomingInstTitle');
    const upcomingAmount = document.getElementById('upcomingInstAmount');
    const upcomingPill = document.getElementById('upcomingActionPill');
    const upcomingPayBtnContainer = document.getElementById('upcomingPayBtnContainer');

    if (isCleared) {
        // All payments done (0 remaining)
        if (pendingCardVal) {
            pendingCardVal.className = 'stat-card-value text-success';
            pendingCardVal.textContent = '₹0';
        }
        if (pendingSubEl) {
            pendingSubEl.className = 'trend-badge trend-positive';
            pendingSubEl.textContent = 'All Fees Cleared';
        }
        if (pendingDueEl) pendingDueEl.textContent = 'No Dues Pending';
        if (pendingIconWrap) pendingIconWrap.className = 'stat-icon-wrapper stat-icon-green';
        if (pendingIconEl) pendingIconEl.className = 'bi bi-check-circle-fill';

        if (heroStatusEl) heroStatusEl.innerHTML = 'Status: <strong class="text-success">ALL FEES PAID (100% CLEARED)</strong>';
        if (heroIconEl) heroIconEl.className = 'bi bi-patch-check-fill text-success';

        if (progressSub) progressSub.textContent = `100% Cleared • ₹${paid.toLocaleString('en-IN')} Paid in Full (₹0 Balance)`;
        if (progressBadge) {
            progressBadge.className = 'badge bg-success text-white px-3 py-2 fw-bold';
            progressBadge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>All Fees Paid in Full';
        }
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.background = '#10b981';
        }
        if (markerInst2) {
            markerInst2.className = 'text-success fw-bold';
            markerInst2.textContent = '₹1,20,000 (PAID ✓)';
        }

        if (upcomingTitle) upcomingTitle.textContent = 'Academic Fee Balance';
        if (upcomingAmount) {
            upcomingAmount.className = 'fw-bold text-success mb-0';
            upcomingAmount.textContent = '₹0 (Fully Paid)';
        }
        if (upcomingPill) {
            upcomingPill.className = 'status-pill status-pill-paid';
            upcomingPill.textContent = 'CLEARED ✓';
        }
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn btn-success w-100 py-3 justify-content-center fw-bold shadow-sm" disabled style="cursor:default;">
                    <i class="bi bi-patch-check-fill me-2 fs-5"></i> All Fees Cleared (₹0 Remaining)
                </button>
            `;
        }
    } else {
        // Pending fee remaining
        if (pendingCardVal) {
            pendingCardVal.className = 'stat-card-value text-warning';
            pendingCardVal.textContent = formatCurrency(pending);
        }
        if (heroStatusEl) {
            heroStatusEl.innerHTML = `Status: <strong>${paid > 0 ? 'PARTIALLY PAID (' + paidPct + '%)' : 'UNPAID'}</strong>`;
        }
        if (progressSub) {
            progressSub.textContent = `${paidPct}% Cleared • ${formatCurrency(paid)} Paid of ${formatCurrency(total)} Total (Balance: ${formatCurrency(pending)})`;
        }
        if (progressBar) {
            progressBar.style.width = paidPct + '%';
            progressBar.style.background = '#1e56a0';
        }
        if (upcomingAmount) upcomingAmount.textContent = formatCurrency(pending);
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn-erp-primary w-100 py-2 justify-content-center" onclick="initiatePaymentModal(${pending}, 'College Fee Payment - Balance ${formatCurrency(pending)}')">
                    <i class="bi bi-lock-fill"></i> Pay ${formatCurrency(pending)} Now via Gateway
                </button>
            `;
        }
    }

    // Dynamic Payment History / Receipts table
    const historyList = data.paymentHistory || [];
    const tbody = document.getElementById('dashboardReceiptsTbody');
    if (tbody && historyList.length > 0) {
        tbody.innerHTML = historyList.map(p => `
            <tr>
                <td><span class="prn-code-badge">${escHtml(p.receiptNumber || ('REC-' + p.transactionId))}</span></td>
                <td><strong>Academic Fee Payment</strong></td>
                <td><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
                <td>${escHtml(p.date || 'Recent')}</td>
                <td><span class="status-pill status-pill-paid">PAID</span></td>
                <td>
                    <a href="${p.receiptUrl || ('/student/receipt.html?transactionId=' + p.transactionId)}" class="btn-erp-outline py-1 px-2" style="font-size:0.75rem;" target="_blank">
                        <i class="bi bi-printer-fill me-1"></i>Receipt
                    </a>
                </td>
            </tr>
        `).join('');
    }
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
