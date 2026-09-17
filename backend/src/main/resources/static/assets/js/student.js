/**
 * student.js — Student Dashboard & Profile
 * Fee Payment Management Platform
 * Dynamic data from API — all amounts live from DB
 */

// Global dashboard data cache (updated after payment)
window._dashboardData = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('STUDENT')) return;
    initDashboard();

    const page = document.body.dataset.page;
    if (page === 'student-dashboard') initStudentDashboard();
    else if (page === 'student-profile') initStudentProfile();
});

// ============================================================
// Student Dashboard — Load from API
// ============================================================
async function initStudentDashboard() {
    showDashboardSkeleton(true);
    try {
        const result = await apiFetch('/student/dashboard');
        if (result && result.ok && result.data && result.data.data) {
            window._dashboardData = result.data.data;
            renderStudentDashboard(window._dashboardData);
        } else {
            console.warn('Dashboard API returned no data, using fallback.');
            renderStudentDashboard(null);
        }
    } catch (e) {
        console.error('Dashboard load error:', e);
        renderStudentDashboard(null);
    } finally {
        showDashboardSkeleton(false);
    }
}

/**
 * Refresh only the fee amounts after a payment — no full page reload.
 * Called by payment-checkout.js after successful payment.
 */
window.refreshFeeStatus = async function () {
    try {
        // Refresh fee amounts
        const result = await apiFetch('/student/fee-status');
        if (result && result.ok && result.data && result.data.data) {
            const feeData = result.data.data;
            if (window._dashboardData) {
                Object.assign(window._dashboardData, feeData);
            } else {
                window._dashboardData = feeData;
            }
            renderFeeAmounts(feeData);
            renderPaySection(feeData);
        }

        // Refresh payment history from full dashboard API
        const dashResult = await apiFetch('/student/dashboard');
        if (dashResult && dashResult.ok && dashResult.data && dashResult.data.data) {
            const history = dashResult.data.data.paymentHistory || [];
            renderPaymentHistoryTable(history);
            // Also update cached data
            if (window._dashboardData) {
                window._dashboardData.paymentHistory = history;
            }
        }
    } catch (e) {
        // On failure just reload
        window.location.reload();
    }
};

function showDashboardSkeleton(show) {
    const els = document.querySelectorAll('.stat-card-value, #studentName, #feeTotalAmount');
    els.forEach(el => {
        if (show) el.style.opacity = '0.4';
        else el.style.opacity = '1';
    });
}

// ============================================================
// Render full dashboard
// ============================================================
function renderStudentDashboard(data) {
    if (!data) data = {};
    const student = data.student || {};

    // Student identity
    setTxt('studentName',   student.name || (typeof getName === 'function' ? getName() : 'Student'));
    setTxt('studentPrn',    student.prn  || '—');
    setTxt('studentDept',   student.department || '—');
    setTxt('studentCourse', student.course || '—');
    setTxt('studentYear',   student.academicYear || '—');

    const initialsEl = document.getElementById('studentInitials');
    if (initialsEl) initialsEl.textContent = getInitials(student.name || (typeof getName === 'function' ? getName() : '?'));

    // Fee amounts
    renderFeeAmounts(data);

    // Pay section
    renderPaySection(data);

    // Payment History table
    renderPaymentHistoryTable(data.paymentHistory || []);

    // Track status
    renderTrackStatus(data);
}

// ============================================================
// Render fee amount cards
// ============================================================
function renderFeeAmounts(data) {
    const total   = Number(data.totalFee   ?? 120000);
    const paid    = Number(data.paidAmount  ?? 0);
    const pending = Number(data.pendingAmount != null ? data.pendingAmount : Math.max(0, total - paid));
    const isCleared = pending <= 0 || data.isCleared === true;
    const paidPct = Math.min(100, Math.round((paid / total) * 100));

    setTxt('feeTotalAmount',   formatCurrency(total));
    setTxt('feePaidAmount',    formatCurrency(paid));

    const pendingCardVal    = document.getElementById('feePendingAmount');
    const pendingSubEl      = document.getElementById('feePendingSubtext');
    const pendingDueEl      = document.getElementById('feePendingDueDate');
    const pendingIconEl     = document.getElementById('feePendingIcon');
    const pendingIconWrap   = document.getElementById('feePendingIconWrapper');
    const heroStatusEl      = document.getElementById('heroPaymentStatus');
    const heroIconEl        = document.getElementById('heroStatusIcon');
    const progressSub       = document.getElementById('feeProgressSubtext');
    const progressBadge     = document.getElementById('feeProgressBadge');
    const progressBar       = document.getElementById('feeProgressBar');
    const markerInst2       = document.getElementById('markerInst2');

    if (isCleared) {
        if (pendingCardVal) { pendingCardVal.className = 'stat-card-value text-success'; pendingCardVal.textContent = '₹0'; }
        if (pendingSubEl)   { pendingSubEl.className = 'trend-badge trend-positive'; pendingSubEl.textContent = 'All Fees Cleared'; }
        if (pendingDueEl)   pendingDueEl.textContent = 'No Dues Pending';
        if (pendingIconWrap) pendingIconWrap.className = 'stat-icon-wrapper stat-icon-green';
        if (pendingIconEl)  pendingIconEl.className = 'bi bi-check-circle-fill';
        if (heroStatusEl)   heroStatusEl.innerHTML = 'Status: <strong class="text-success">ALL FEES PAID (100% CLEARED) ✓</strong>';
        if (heroIconEl)     heroIconEl.className = 'bi bi-patch-check-fill text-success';
        if (progressSub)    progressSub.textContent = `100% Cleared • ₹${paid.toLocaleString('en-IN')} Paid in Full (₹0 Balance)`;
        if (progressBadge)  { progressBadge.className = 'badge bg-success text-white px-3 py-2 fw-bold'; progressBadge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>All Fees Paid in Full'; }
        if (progressBar)    { progressBar.style.width = '100%'; progressBar.style.background = '#10b981'; }
        if (markerInst2)    { markerInst2.className = 'text-success fw-bold'; markerInst2.textContent = '₹1,20,000 (PAID ✓)'; }

        // Hide "Due" badge from sidebar nav
        const dueBadge = document.querySelector('[href="#pay-fee"] .erp-nav-badge');
        if (dueBadge) dueBadge.style.display = 'none';
    } else {
        if (pendingCardVal) { pendingCardVal.className = 'stat-card-value text-warning'; pendingCardVal.textContent = formatCurrency(pending); }
        if (pendingSubEl)   { pendingSubEl.className = 'trend-badge trend-negative'; pendingSubEl.textContent = paid > 0 ? 'Partial Payment' : 'Payment Due'; }
        if (pendingDueEl)   pendingDueEl.textContent = 'Due: 30 Sept 2025';
        if (pendingIconWrap) pendingIconWrap.className = 'stat-icon-wrapper stat-icon-orange';
        if (pendingIconEl)  pendingIconEl.className = 'bi bi-exclamation-triangle-fill';
        if (heroStatusEl)   heroStatusEl.innerHTML = `Status: <strong>${paid > 0 ? 'PARTIALLY PAID (' + paidPct + '%)' : 'UNPAID — PAYMENT DUE'}</strong>`;
        if (progressSub)    progressSub.textContent = `${paidPct}% Cleared • ${formatCurrency(paid)} Paid of ${formatCurrency(total)} Total (Balance: ${formatCurrency(pending)})`;
        if (progressBar)    { progressBar.style.width = paidPct + '%'; progressBar.style.background = '#f59e0b'; }
    }
}

// ============================================================
// Render pay section with dynamic pending amount
// ============================================================
function renderPaySection(data) {
    const pending   = Number(data.pendingAmount ?? 120000);
    const isCleared = pending <= 0 || data.isCleared === true;
    const upcomingTitle         = document.getElementById('upcomingInstTitle');
    const upcomingAmount        = document.getElementById('upcomingInstAmount');
    const upcomingPill          = document.getElementById('upcomingActionPill');
    const upcomingPayBtnContainer = document.getElementById('upcomingPayBtnContainer');
    const payFeeAlertEl         = document.getElementById('payFeeOutstandingAlert');
    const payFeeBtnContainer    = document.getElementById('payFeeMainBtnContainer');

    if (isCleared) {
        if (upcomingTitle)  upcomingTitle.textContent = 'Academic Fee Balance';
        if (upcomingAmount) { upcomingAmount.className = 'fw-bold text-success mb-0'; upcomingAmount.textContent = '₹0 (Fully Paid)'; }
        if (upcomingPill)   { upcomingPill.className = 'status-pill status-pill-paid'; upcomingPill.textContent = 'CLEARED ✓'; }
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn btn-success w-100 py-3 justify-content-center fw-bold shadow-sm" disabled style="cursor:default;">
                    <i class="bi bi-patch-check-fill me-2 fs-5"></i> All Fees Cleared (₹0 Remaining)
                </button>`;
        }
        if (payFeeAlertEl)  payFeeAlertEl.innerHTML = `<i class="bi bi-check-circle-fill fs-5 text-success"></i><div><strong>All fees cleared!</strong> Your account has no outstanding dues.</div>`;
        if (payFeeBtnContainer) {
            payFeeBtnContainer.innerHTML = `
                <button class="btn btn-success py-3 w-100 fw-bold" disabled>
                    <i class="bi bi-patch-check-fill me-2"></i> Fees Fully Paid — No Balance Due
                </button>`;
        }
    } else {
        if (upcomingAmount) { upcomingAmount.className = 'fw-bold text-danger mb-0'; upcomingAmount.textContent = formatCurrency(pending); }
        if (upcomingPill)   { upcomingPill.className = 'status-pill status-pill-pending'; upcomingPill.textContent = 'DUE'; }
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn-erp-primary w-100 py-2 justify-content-center" onclick="initiatePaymentModal(${pending}, 'Balance Due — ${formatCurrency(pending)}')">
                    <i class="bi bi-lock-fill"></i> Pay ${formatCurrency(pending)} Now via Gateway
                </button>`;
        }
        if (payFeeAlertEl)  {
            payFeeAlertEl.innerHTML = `<i class="bi bi-info-circle-fill fs-5"></i><div>Outstanding Balance: <strong>${formatCurrency(pending)}</strong> — due on <strong>30 Sept 2025</strong>.</div>`;
        }
        if (payFeeBtnContainer) {
            payFeeBtnContainer.innerHTML = `
                <button class="btn-erp-primary py-3 w-100 fw-bold" onclick="initiatePaymentModal(${pending}, 'Outstanding Balance — ${formatCurrency(pending)}')">
                    <i class="bi bi-shield-lock-fill me-2"></i> Proceed to Pay ${formatCurrency(pending)} Securely
                </button>`;
        }
    }
}

// ============================================================
// Render Payment History Table — dynamic from DB
// ============================================================
function renderPaymentHistoryTable(history) {
    const tbody = document.getElementById('paymentHistoryTbody');
    const dashTbody = document.getElementById('dashboardReceiptsTbody');

    const buildRow = (p) => `
        <tr>
            <td><span class="prn-code-badge">${escHtml(p.receiptNumber || ('TXN-' + p.transactionId))}</span></td>
            <td><strong>Academic Fee Payment</strong></td>
            <td><strong>${formatCurrency(Number(p.amount))}</strong></td>
            <td>${escHtml(p.gateway || 'RAZORPAY')}</td>
            <td>${escHtml(p.date || 'Recent')}</td>
            <td><span class="status-pill status-pill-paid">SUCCESS</span></td>
            <td>
                <a href="${escHtml(p.receiptUrl || ('/student/receipt.html?transactionId=' + p.transactionId))}"
                   class="btn-erp-outline py-1 px-2" style="font-size:0.75rem;" target="_blank">
                    <i class="bi bi-printer-fill me-1"></i>Receipt
                </a>
            </td>
        </tr>`;

    const emptyRow = `<tr><td colspan="7" class="text-center text-muted py-4">
        <i class="bi bi-inbox fs-3 d-block mb-2 opacity-50"></i>No payment history yet.
    </td></tr>`;

    if (tbody) {
        tbody.innerHTML = history.length > 0 ? history.map(buildRow).join('') : emptyRow;
    }
    if (dashTbody) {
        dashTbody.innerHTML = history.length > 0 ? history.map(buildRow).join('') : emptyRow;
    }
}

// ============================================================
// Render Track Status section
// ============================================================
function renderTrackStatus(data) {
    const total   = Number(data.totalFee   ?? 120000);
    const paid    = Number(data.paidAmount  ?? 0);
    const pending = Number(data.pendingAmount ?? total);
    const paidPct = Math.min(100, Math.round((paid / total) * 100));
    const pendingPct = 100 - paidPct;
    const isCleared = pending <= 0;

    const statusText = document.getElementById('trackStatusText');
    const trackBar   = document.getElementById('trackProgressBar');

    if (statusText) {
        statusText.innerHTML = isCleared
            ? '<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>ALL FEES CLEARED — ACCOUNT FULLY SETTLED</span>'
            : `<span class="text-warning fw-bold">₹${paid.toLocaleString('en-IN')} PAID — ₹${pending.toLocaleString('en-IN')} OUTSTANDING</span>`;
    }
    if (trackBar) {
        trackBar.innerHTML = isCleared
            ? `<div class="progress-bar bg-success" style="width:100%">All Fees Paid (₹${total.toLocaleString('en-IN')})</div>`
            : `<div class="progress-bar bg-success" style="width:${paidPct}%">Paid ₹${paid.toLocaleString('en-IN')}</div>
               <div class="progress-bar bg-warning text-dark" style="width:${pendingPct}%">Pending ₹${pending.toLocaleString('en-IN')}</div>`;
    }
}

// ============================================================
// Utilities
// ============================================================
function setTxt(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// Student Profile
// ============================================================
async function initStudentProfile() {
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
            setTxt('profileName',    s.name);
            setTxt('profilePrn',     s.prn);
            setTxt('profileEmail',   s.email);
            setTxt('profileDept',    s.department);
            setTxt('profileCourse',  s.course);
            setTxt('profileYear',    s.academicYear);
            setTxt('profileMobile',  s.mobile);
            if (initials) initials.textContent = getInitials(s.name);
            const statusEl = document.getElementById('profileStatus');
            if (statusEl) statusEl.innerHTML = statusBadge(s.status);
        }
    } catch (e) {
        console.error('Profile load error:', e);
    }
}
