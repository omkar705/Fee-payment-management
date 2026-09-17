/**
 * student.js — Student Dashboard & Profile
 * Fee Payment Management Platform — Milestone 1
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('STUDENT')) return;
    initDashboard();

    const page = document.body.dataset.page;
    // Load dashboard on student-dashboard page OR on any page that has the dashboard section
    if (page === 'student-dashboard' || document.getElementById('sec-student-dashboard')) {
        initStudentDashboard();
    }
    if (page === 'student-profile') initStudentProfile();
});

/**
 * pageshow fires on every visit — including back-navigation from bfcache.
 * If `persisted` is true the page was served from cache (browser back button).
 * If a payment was just completed (flag set by payment.js), force a live refresh.
 */
window.addEventListener('pageshow', (event) => {
    const hasDashboard = document.getElementById('sec-student-dashboard');
    if (!hasDashboard) return;

    const paymentJustDone = sessionStorage.getItem('fpm_payment_done') === '1';

    if (event.persisted || paymentJustDone) {
        sessionStorage.removeItem('fpm_payment_done');
        // Re-fetch live data from Supabase and re-render all dashboard sections
        refreshFullDashboard();
    }
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

function filterHiddenTransactionHistory(history) {
    const hiddenRefs = new Set([
        'pay_TdBuUAFZWzUB4h',
        'pay_TdBrJc2AWf16BU',
        'pay_TdBoj1wjR84moh',
        'pay_TdBoBwBJZgbFSP',
        'pay_TdBlnobB74A9kv',
        'pay_TdBjgEkXxFDwYh'
    ]);

    if (!Array.isArray(history)) return [];
    return history.filter(item => {
        const ref = String(item?.transactionReference || item?.txId || item?.receiptNumber || '').trim();
        return !hiddenRefs.has(ref);
    });
}

function renderStudentDashboard(data) {
    const student = data.student || {};
    const name = student.name || (typeof getName === 'function' ? getName() : 'Student');

    // Greeting & Hero
    const greetingEl = document.getElementById('welcomeGreeting');
    if (greetingEl) {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
        greetingEl.textContent = `${timeOfDay}, ${name.split(' ')[0]} 👋`;
    }
    const heroPrnEl = document.getElementById('heroPrn');
    if (heroPrnEl) heroPrnEl.textContent = student.prn || '—';
    const heroDeptEl = document.getElementById('heroDept');
    if (heroDeptEl) heroDeptEl.textContent = (student.department || '—') + ' (' + (student.course || 'B.Tech') + ')';

    // Update sidebar user info from live session
    setTxt('studentName',   name);
    setTxt('studentPrn',    student.prn  || '—');
    setTxt('studentDept',   student.department || '—');
    setTxt('studentCourse', student.course || '—');
    setTxt('studentYear',   student.academicYear || '—');

    const initialsEl = document.getElementById('studentInitials');
    if (initialsEl) initialsEl.textContent = getInitials(name);

    // Fee amounts & dynamic balance calculation
    const total   = Number(data.totalFee || 120000);
    const paid    = Number(data.paidAmount || 0);
    const pending = Math.max(0, Number(data.pendingAmount != null ? data.pendingAmount : (total - paid)));
    const isCleared = pending <= 0 || data.isCleared === true;
    const paidPct = Math.min(100, Math.round((paid / total) * 100));
    const fmt = v => '₹' + Number(v).toLocaleString('en-IN');

    // Stat Cards
    setTxt('feeTotalAmount', fmt(total));

    const paidEl = document.getElementById('feePaidAmount');
    if (paidEl) { paidEl.textContent = fmt(paid); paidEl.className = 'stat-card-value text-success'; }

    const pendingEl = document.getElementById('feePendingAmount');
    if (pendingEl) {
        pendingEl.textContent = isCleared ? '₹0' : fmt(pending);
        pendingEl.className = isCleared ? 'stat-card-value text-success' : 'stat-card-value text-warning';
    }

    const pendingSubEl  = document.getElementById('feePendingSubtext');
    const pendingDueEl  = document.getElementById('feePendingDueDate');
    const pendingIconEl = document.getElementById('feePendingIcon');
    const pendingIconWrap = document.getElementById('feePendingIconWrapper');
    const heroStatusEl  = document.getElementById('heroPaymentStatus');
    const heroIconEl    = document.getElementById('heroStatusIcon');

    if (isCleared) {
        if (pendingSubEl)   { pendingSubEl.className = 'trend-badge trend-positive'; pendingSubEl.textContent = 'All Fees Cleared'; }
        if (pendingDueEl)   pendingDueEl.textContent = 'No Dues Pending';
        if (pendingIconWrap) pendingIconWrap.className = 'stat-icon-wrapper stat-icon-green';
        if (pendingIconEl)  pendingIconEl.className = 'bi bi-check-circle-fill';
        if (heroStatusEl)   heroStatusEl.innerHTML = 'Status: <strong class="text-success">ALL FEES PAID (100% CLEARED)</strong>';
        if (heroIconEl)     heroIconEl.className = 'bi bi-patch-check-fill text-success';

        // Hide "Due" badge in sidebar
        const dueBadge = document.querySelector('.erp-nav-badge');
        if (dueBadge) dueBadge.style.display = 'none';
    } else {
        if (pendingSubEl)  { pendingSubEl.className = 'trend-badge trend-warning'; pendingSubEl.textContent = 'Balance Pending'; }
        if (pendingDueEl)  pendingDueEl.textContent = 'Due: 15 Nov 2025';
        if (heroStatusEl)  heroStatusEl.innerHTML = `Status: <strong>${paid > 0 ? 'PARTIALLY PAID (' + paidPct + '%)' : 'UNPAID'}</strong>`;
        if (heroIconEl)    heroIconEl.className = paid > 0 ? 'bi bi-clock-history text-warning' : 'bi bi-exclamation-circle text-danger';
    }

    // Progress Bar
    const progressSub   = document.getElementById('feeProgressSubtext');
    const progressBadge = document.getElementById('feeProgressBadge');
    const progressBar   = document.getElementById('feeProgressBar');
    const markerInst2   = document.getElementById('markerInst2');
    const markerInst1   = document.getElementById('markerInst1');

    if (progressBar) {
        progressBar.style.width      = paidPct + '%';
        progressBar.style.background = isCleared ? '#10b981' : '#1e56a0';
    }
    if (progressSub) {
        progressSub.textContent = isCleared
            ? `100% Cleared • ${fmt(paid)} Paid in Full (₹0 Balance)`
            : `${paidPct}% Cleared • ${fmt(paid)} Paid of ${fmt(total)} Total (Balance: ${fmt(pending)})`;
    }
    if (progressBadge) {
        if (isCleared) {
            progressBadge.className = 'badge bg-success text-white px-3 py-2 fw-bold';
            progressBadge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>All Fees Paid in Full';
        } else {
            progressBadge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 fw-bold';
            progressBadge.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>${paid > 0 ? 'Installment 2 Pending' : 'Payment Pending'}`;
        }
    }
    if (markerInst1) {
        markerInst1.className = paid >= 60000 ? 'text-success fw-bold' : 'text-muted';
        markerInst1.textContent = paid >= 60000 ? '₹60,000 (Inst 1 • PAID ✓)' : '₹60,000 (Inst 1)';
    }
    if (markerInst2) {
        markerInst2.className = isCleared ? 'text-success fw-bold' : 'text-danger fw-bold';
        markerInst2.textContent = isCleared ? '₹1,20,000 (PAID ✓)' : `₹1,20,000 (Inst 2 • ${pending > 0 ? fmt(pending) + ' Due' : 'Due 15 Nov'})`;
    }

    // Upcoming Installment Card
    const upcomingTitle  = document.getElementById('upcomingInstTitle');
    const upcomingAmount = document.getElementById('upcomingInstAmount');
    const upcomingPill   = document.getElementById('upcomingActionPill');
    const upcomingDueDate = document.getElementById('upcomingDueDate');
    const upcomingPayBtnContainer = document.getElementById('upcomingPayBtnContainer');

    if (isCleared) {
        if (upcomingTitle)  upcomingTitle.textContent = 'Academic Fee Clearance';
        if (upcomingAmount) { upcomingAmount.className = 'fw-bold text-success mb-0'; upcomingAmount.textContent = '₹0 (Fully Paid)'; }
        if (upcomingPill)   { upcomingPill.className = 'status-pill status-pill-paid'; upcomingPill.textContent = 'CLEARED ✓'; }
        if (upcomingDueDate) upcomingDueDate.textContent = 'No Dues';
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn btn-success w-100 py-3 justify-content-center fw-bold shadow-sm" disabled style="cursor:default;">
                    <i class="bi bi-patch-check-fill me-2 fs-5"></i> All Fees Cleared (₹0 Remaining)
                </button>
            `;
        }
    } else {
        if (upcomingTitle)  upcomingTitle.textContent = paid > 0 ? 'Installment 2 (Final)' : 'Installment 1';
        if (upcomingAmount) upcomingAmount.textContent = fmt(pending);
        if (upcomingPill)   { upcomingPill.className = 'status-pill status-pill-pending'; upcomingPill.textContent = 'ACTION REQUIRED'; }
        if (upcomingDueDate) upcomingDueDate.textContent = '15 November 2025';
        if (upcomingPayBtnContainer) {
            upcomingPayBtnContainer.innerHTML = `
                <button class="btn-erp-primary w-100 py-2 justify-content-center" onclick="initiatePaymentModal(${pending}, 'College Fee Payment')">
                    <i class="bi bi-lock-fill"></i> Pay ${fmt(pending)} Now via Gateway
                </button>
            `;
        }
    }

    // Dashboard Receipts Snippet (latest 5 payments — backend is authoritative for authenticated sessions)
    const token = localStorage.getItem('fpm_token');
    const hasValidSession = !!token && !String(token).startsWith('demo-token');
    const rawHistory = (data.paymentHistory && data.paymentHistory.length > 0)
        ? data.paymentHistory
        : (hasValidSession ? [] : ((typeof localStorage !== 'undefined') ? JSON.parse(localStorage.getItem('fpm_payment_history') || '[]') : []));
    const historyList = filterHiddenTransactionHistory(rawHistory);
    if (hasValidSession && Array.isArray(data.paymentHistory) && data.paymentHistory.length === 0) {
        localStorage.removeItem('fpm_payment_history');
    }
    const tbody = document.getElementById('dashboardReceiptsTbody');
    if (tbody) {
        if (historyList.length > 0) {
            tbody.innerHTML = historyList.slice(0, 5).map(p => {
                const instNo  = deriveInstallmentLabel(p, historyList);
                const rcptRef = p.receiptNumber || p.transactionReference || p.txId || ('TXN-' + (p.transactionId || 'local'));
                const dateStr = p.date || p.transactionDate
                    ? new Date(p.date || p.transactionDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                    : 'Recent';
                const status = p.status || p.transactionStatus || 'SUCCESS';
                const statusBadge = status === 'SUCCESS'
                    ? '<span class="status-pill status-pill-paid">PAID</span>'
                    : `<span class="status-pill status-pill-pending">${escHtml(status)}</span>`;
                return `
                <tr>
                    <td><span class="prn-code-badge">${escHtml(rcptRef)}</span></td>
                    <td><strong>${escHtml(instNo)}</strong><br><small class="text-muted">${escHtml(p.transactionReference || p.txId || '')}</small></td>
                    <td><strong>₹${Number(p.amount || 0).toLocaleString('en-IN')}</strong></td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <a href="receipt.html?transactionId=${encodeURIComponent(p.transactionId || '')}" class="btn-erp-outline py-1 px-2" style="font-size:0.75rem;" target="_blank">
                            <i class="bi bi-printer-fill me-1"></i>Receipt
                        </a>
                    </td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-3 text-muted">
                        <i class="bi bi-clock-history me-1"></i> No transactions recorded yet.
                    </td>
                </tr>`;
        }
    }

    // Installment Schedule Table (Section 6) — derive live PAID/PENDING from the latest totals
    const liveInstallments = computeInstallmentStatus(data);
    renderInstallmentSchedule(liveInstallments);

    // Section 9: Track Fee Status — live numbers from Supabase
    const trackText = document.getElementById('trackFeeStatusText');
    const trackBar  = document.getElementById('trackFeeProgressBar');
    const trackTotal   = document.getElementById('trackTotalFee');
    const trackPaid    = document.getElementById('trackPaidAmount');
    const trackPending = document.getElementById('trackPendingAmount');

    if (trackText) {
        const inst = (data.installments || []);
        const paidInsts  = inst.filter(i => i.status === 'PAID').length;
        const totalInsts = inst.length || 2;
        if (isCleared) {
            trackText.innerHTML = 'Academic Clearance Status: <strong class="text-success">ALL INSTALLMENTS CLEARED ✓</strong>';
        } else if (paid > 0) {
            trackText.innerHTML = `Academic Clearance Status: <strong>${paidInsts} of ${totalInsts} installment(s) cleared — ${totalInsts - paidInsts} PENDING</strong>`;
        } else {
            trackText.innerHTML = 'Academic Clearance Status: <strong class="text-danger">NO PAYMENT MADE YET</strong>';
        }
    }
    if (trackBar) {
        const paidPct2 = Math.min(100, Math.round((paid / total) * 100));
        if (isCleared) {
            trackBar.innerHTML = `<div class="progress-bar bg-success" style="width:100%">₹${Number(paid).toLocaleString('en-IN')} Fully Paid</div>`;
        } else if (paid > 0) {
            const pendPct = 100 - paidPct2;
            trackBar.innerHTML = `<div class="progress-bar bg-success" style="width:${paidPct2}%">Paid (₹${Number(paid).toLocaleString('en-IN')})</div><div class="progress-bar bg-warning text-dark" style="width:${pendPct}%">Pending (₹${Number(pending).toLocaleString('en-IN')})</div>`;
        } else {
            trackBar.innerHTML = `<div class="progress-bar bg-danger" style="width:100%">Unpaid (₹${Number(total).toLocaleString('en-IN')})</div>`;
        }
    }
    if (trackTotal)   trackTotal.textContent   = '₹' + Number(total).toLocaleString('en-IN');
    if (trackPaid)    trackPaid.textContent     = '₹' + Number(paid).toLocaleString('en-IN');
    if (trackPending) trackPending.textContent  = '₹' + Number(pending).toLocaleString('en-IN');
}

/**
 * Derive a human-readable installment label from position in payment history
 */
function deriveInstallmentLabel(payment, allHistory) {
    const sorted = [...allHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const idx = sorted.findIndex(p => p.transactionId === payment.transactionId);
    if (idx === 0) return 'Installment 1 — AY 2025-26';
    if (idx === 1) return 'Installment 2 — AY 2025-26';
    return 'Fee Payment — AY 2025-26';
}

/**
 * Render the Installment Schedule table (Section 6) from live API data
 */
function computeInstallmentStatus(data) {
    const payments = Array.isArray(data.paymentHistory) ? data.paymentHistory : [];
    const totalPaid = Number(data.paidAmount || 0);
    const installments = Array.isArray(data.installments) && data.installments.length
        ? data.installments
        : [
            { label: 'Installment 1 (50%)', amount: 60000, dueDate: '15 Jun 2025', status: totalPaid >= 60000 ? 'PAID' : 'PENDING', paidDate: totalPaid >= 60000 ? new Date().toISOString() : null, receiptNumber: null, transactionId: null },
            { label: 'Installment 2 (50%)', amount: 60000, dueDate: '15 Nov 2025', status: totalPaid >= 120000 ? 'PAID' : 'PENDING', paidDate: totalPaid >= 120000 ? new Date().toISOString() : null, receiptNumber: null, transactionId: null }
        ];

    if (payments.length > 0) {
        const latestReceipt = payments[0];
        if (totalPaid >= 60000 && installments[0].status !== 'PAID') {
            installments[0].status = 'PAID';
            installments[0].paidDate = latestReceipt.date || new Date().toISOString();
            installments[0].receiptNumber = latestReceipt.receiptNumber || latestReceipt.transactionReference || 'AUTO-REC';
            installments[0].transactionId = latestReceipt.transactionId;
        }
        if (totalPaid >= 120000 && installments[1].status !== 'PAID') {
            installments[1].status = 'PAID';
            installments[1].paidDate = latestReceipt.date || new Date().toISOString();
            installments[1].receiptNumber = latestReceipt.receiptNumber || latestReceipt.transactionReference || 'AUTO-REC';
            installments[1].transactionId = latestReceipt.transactionId;
        }
    }

    return installments;
}

function renderInstallmentSchedule(installments) {
    const tbody = document.getElementById('installmentScheduleTbody');
    if (!tbody) return;

    const rows = Array.isArray(installments) && installments.length
        ? installments
        : [
            {
                label: 'Installment 1 (50%)',
                amount: 60000,
                dueDate: '15 Jun 2025',
                paidDate: '20 Jun 2025',
                status: 'PAID',
                receiptNumber: 'REC-2025-0001',
                transactionId: 'demo-inst-1'
            },
            {
                label: 'Installment 2 (50%)',
                amount: 60000,
                dueDate: '15 Nov 2025',
                status: 'PENDING'
            }
        ];

    tbody.innerHTML = rows.map(inst => {
        const isPaid   = inst.status === 'PAID';
        const amt      = '₹' + Number(inst.amount).toLocaleString('en-IN');
        const statusBadge = isPaid
            ? '<span class="status-pill status-pill-paid">PAID ✓</span>'
            : '<span class="status-pill status-pill-pending">PENDING</span>';
        const paidOn  = isPaid && inst.paidDate
            ? new Date(inst.paidDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
        const rcptRef = isPaid && inst.receiptNumber
            ? `<code>${escHtml(inst.receiptNumber)}</code>`
            : '<span class="text-muted">—</span>';
        const action  = isPaid && inst.transactionId
            ? `<a href="receipt.html?transactionId=${encodeURIComponent(inst.transactionId)}" class="btn-icon-action" title="View Receipt" target="_blank"><i class="bi bi-file-earmark-text-fill text-primary"></i></a>`
            : `<button class="btn-erp-primary btn-sm py-1" onclick="openPaymentTerminalForInstallment(${inst.amount}, '${escHtml(inst.label)}')"><i class="bi bi-credit-card me-1"></i>Pay Now</button>`;

        return `
        <tr>
            <td><strong>${escHtml(inst.label)}</strong></td>
            <td>${amt}</td>
            <td>${escHtml(inst.dueDate)}</td>
            <td><small class="text-muted">${paidOn}</small></td>
            <td>${statusBadge}</td>
            <td>${rcptRef}</td>
            <td>${action}</td>
        </tr>`;
    }).join('');
}

function setTxt(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

/**
 * refreshFullDashboard — Re-fetches ALL data from Supabase via /api/student/dashboard
 * and re-renders every dashboard section in-place. Called immediately after payment success.
 * Exposed on window so payment.js can invoke it directly.
 */
async function refreshFullDashboard() {
    try {
        const result = await apiFetch('/student/dashboard');
        if (result && result.ok && result.data && result.data.data) {
            const data = result.data.data;
            const paymentHistory = Array.isArray(data.paymentHistory) ? data.paymentHistory : [];
            const totalPaid = Number(data.paidAmount || 0);
            if (paymentHistory.length > 0) {
                localStorage.setItem('fpm_payment_history', JSON.stringify(paymentHistory.map(p => ({
                    transactionId: p.transactionId,
                    transactionReference: p.transactionReference || p.txId || 'TXN-' + p.transactionId,
                    receiptNumber: p.receiptNumber || p.transactionReference || 'TXN-' + p.transactionId,
                    amount: Number(p.amount || 0),
                    gatewayName: p.gateway || 'RAZORPAY',
                    transactionStatus: p.status || 'SUCCESS',
                    transactionDate: p.date ? new Date(p.date).toISOString() : new Date().toISOString()
                }))));
            } else {
                localStorage.removeItem('fpm_payment_history');
            }
            if (totalPaid > 0 && !Array.isArray(data.installments)) {
                data.installments = [
                    { label: 'Installment 1 (50%)', amount: 60000, dueDate: '15 Jun 2025', status: totalPaid >= 60000 ? 'PAID' : 'PENDING', paidDate: totalPaid >= 60000 ? new Date().toISOString() : null },
                    { label: 'Installment 2 (50%)', amount: 60000, dueDate: '15 Nov 2025', status: totalPaid >= 120000 ? 'PAID' : 'PENDING', paidDate: totalPaid >= 120000 ? new Date().toISOString() : null }
                ];
            }
            // Re-render all sections (stat cards, installments, receipts snippet, track status)
            renderStudentDashboard(data);
            // Also refresh the full transaction history table (Section 8)
            if (typeof loadStudentTransactionHistory === 'function') {
                loadStudentTransactionHistory();
            }
        }
    } catch (e) {
        console.warn('refreshFullDashboard failed:', e);
    }
}

// Expose to window so payment.js can call window.refreshFullDashboard()
window.refreshFullDashboard = refreshFullDashboard;


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
        paidAmount: 60000,
        pendingAmount: 60000,
        paymentStatus: 'PARTIALLY PAID',
        installments: [
            {
                label: 'Installment 1 (50%)',
                amount: 60000,
                dueDate: '15 Jun 2025',
                paidDate: '20 Jun 2025',
                status: 'PAID',
                receiptNumber: 'REC-2025-0001',
                transactionId: 'dummy-inst-1'
            },
            {
                label: 'Installment 2 (50%)',
                amount: 60000,
                dueDate: '15 Nov 2025',
                status: 'PENDING'
            }
        ]
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
