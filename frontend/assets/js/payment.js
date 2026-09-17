/**
 * payment.js — Fee Payment Module with Razorpay Checkout & Simulation
 * MMCOE Fee Payment Management Platform
 */

const PAYMENT_API_BASE = 'http://localhost:8080/api/payments';

document.addEventListener('DOMContentLoaded', () => {
    initPaymentTerminal();
    loadStudentTransactionHistory();
});

let currentSelectedAmount = 60000;
let currentInstallmentDesc = 'Installment 2 (Final)';

function initPaymentTerminal() {
    // 1. Payment Method Card Selection
    const methodCards = document.querySelectorAll('.payment-method-card');
    methodCards.forEach(card => {
        card.addEventListener('click', () => {
            methodCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // 2. Installment Option Radios
    const installmentRadios = document.querySelectorAll('input[name="installmentSelection"]');
    installmentRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            const customBox = document.getElementById('customAmountContainer');
            if (e.target.id === 'instOptionCustom') {
                if (customBox) customBox.classList.remove('d-none');
                const customInput = document.getElementById('customAmountInput');
                currentSelectedAmount = parseInt(customInput?.value || 10000);
                currentInstallmentDesc = 'Custom Partial Payment';
            } else {
                if (customBox) customBox.classList.add('d-none');
                currentSelectedAmount = val;
                currentInstallmentDesc = e.target.dataset.desc || 'Installment 2 (Final)';
            }
            updatePayButtonDisplay();
        });
    });

    // 3. Custom Amount Input Listener
    const customInput = document.getElementById('customAmountInput');
    if (customInput) {
        customInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            currentSelectedAmount = val;
            currentInstallmentDesc = 'Custom Partial Payment';
            updatePayButtonDisplay();
        });
    }

    // 4. Pay Button Submit
    const paySubmitBtn = document.getElementById('btnSubmitFeePayment');
    if (paySubmitBtn) {
        paySubmitBtn.addEventListener('click', handleFeePayment);
    }
}

function updatePayButtonDisplay() {
    const btnText = document.getElementById('payBtnAmountText');
    if (btnText) {
        btnText.textContent = '₹' + Number(currentSelectedAmount).toLocaleString('en-IN');
    }
    const summaryAmount = document.getElementById('terminalTotalAmount');
    if (summaryAmount) {
        summaryAmount.textContent = '₹' + Number(currentSelectedAmount).toLocaleString('en-IN');
    }
}

/**
 * Initiates payment via Razorpay or Instant Simulator
 */
async function handleFeePayment() {
    const paySubmitBtn = document.getElementById('btnSubmitFeePayment');
    const paySpinner = document.getElementById('paySpinner');
    const payBtnLabel = document.getElementById('payBtnLabel');
    const notifArea = document.getElementById('paymentAlertArea');

    if (!currentSelectedAmount || currentSelectedAmount <= 0) {
        showPaymentAlert('Please enter a valid payment amount greater than ₹0.', 'danger');
        return;
    }

    const selectedMethodRadio = document.querySelector('input[name="paymentModeMethod"]:checked');
    const paymentMethod = selectedMethodRadio ? selectedMethodRadio.value : 'card';

    const useSimulator = document.getElementById('toggleSimulationMode')?.checked || false;

    // Set Loading State
    paySubmitBtn.disabled = true;
    if (paySpinner) paySpinner.classList.remove('d-none');
    if (payBtnLabel) payBtnLabel.textContent = useSimulator ? 'Simulating Payment...' : 'Connecting to Razorpay...';

    const studentId = parseInt(localStorage.getItem('fpm_userId') || '1');
    const studentName = localStorage.getItem('fpm_name') || 'Manan Vivekanand Tote';
    const studentEmail = localStorage.getItem('fpm_email') || 'student@mmcoe.edu.in';

    if (useSimulator) {
        // Direct Fast Simulation
        try {
            const token = localStorage.getItem('fpm_token');
            const res = await fetch(`${PAYMENT_API_BASE}/simulate-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    paymentId: 2,
                    studentId: studentId,
                    amount: currentSelectedAmount,
                    paymentMethod: paymentMethod
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                handlePaymentSuccess(data.data.transactionId || data.transactionId, data.data.razorpayPaymentId || data.data.transactionReference || '', currentSelectedAmount, paymentMethod);
            } else {
                showPaymentAlert(data.message || 'Simulation failed.', 'danger');
            }
        } catch (err) {
            showPaymentAlert('Backend communication error: ' + err.message, 'danger');
        } finally {
            resetPayButton();
        }
        return;
    }

    // Official Razorpay Standard Checkout
    try {
        const token = localStorage.getItem('fpm_token');
        const orderRes = await fetch(`${PAYMENT_API_BASE}/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                paymentId: 2,
                studentId: studentId,
                amount: currentSelectedAmount,
                currency: 'INR'
            })
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok || !orderData.success) {
            throw new Error(orderData.message || 'Failed to initialize payment with Razorpay gateway.');
        }

        // Backend wraps payload: { success, message, data: { keyId, orderId, amountInPaise, ... } }
        const od = orderData.data;

        // Map UI method selection ('upi', 'card', 'netbanking') to Razorpay instrument
        const rzpMethodMap = {
            'upi': 'upi',
            'card': 'card',
            'netbanking': 'netbanking'
        };
        const selectedRzpMethod = rzpMethodMap[paymentMethod] || 'card';

        const options = {
            key: od.keyId,
            amount: od.amountInPaise,
            currency: od.currency || 'INR',
            name: 'MMCOE Fee Payment Portal',
            description: `${currentInstallmentDesc} — Academic Year 2025-26`,
            order_id: od.orderId,
            image: 'https://cdn.razorpay.com/static/assets/logo/rzp.png',
            prefill: {
                name: od.studentName || studentName,
                email: od.studentEmail || studentEmail,
                contact: od.studentContact || '9876543210',
                method: selectedRzpMethod
            },
            config: {
                display: {
                    blocks: {
                        selectedMethodBlock: {
                            name: paymentMethod === 'upi' ? 'Pay with UPI' : (paymentMethod === 'netbanking' ? 'Pay with Netbanking' : 'Pay with Cards'),
                            instruments: [
                                {
                                    method: selectedRzpMethod
                                }
                            ]
                        }
                    },
                    sequence: ['block.selectedMethodBlock']
                }
            },
            notes: {
                student_id: String(studentId),
                installment: currentInstallmentDesc,
                institution: 'MMCOE Pune',
                payment_method: paymentMethod
            },
            theme: {
                color: '#1a56db'
            },
            modal: {
                ondismiss: function () {
                    resetPayButton();
                    showPaymentAlert('Payment window was dismissed. You can retry when ready.', 'warning');
                }
            },
            handler: async function (response) {
                if (payBtnLabel) payBtnLabel.textContent = 'Verifying Transaction & Storing Ledger...';
                try {
                    const token = localStorage.getItem('fpm_token');
                    const verifyRes = await fetch(`${PAYMENT_API_BASE}/verify-payment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            paymentId: od.paymentId || null,
                            studentId: studentId,
                            amount: od.amount || currentSelectedAmount,
                            paymentMethod: paymentMethod
                        })
                    });

                    const verifyData = await verifyRes.json();

                    // Backend wraps: { success, message, data: { transactionId, transactionReference, receiptNumber, ... } }
                    if (verifyRes.ok && verifyData.success) {
                        const vd = verifyData.data || {};
                        handlePaymentSuccess(vd.transactionId, vd.transactionReference, currentSelectedAmount, paymentMethod);
                    } else {
                        showPaymentAlert(verifyData.message || 'Payment signature verification failed.', 'danger');
                    }
                } catch (vErr) {
                    showPaymentAlert('Payment verification error: ' + vErr.message, 'danger');
                } finally {
                    resetPayButton();
                }
            }
        };

        if (typeof Razorpay === 'undefined') {
            // If Razorpay script blocked or offline, fallback to simulation
            showPaymentAlert('Razorpay SDK unavailable. Falling back to Instant Simulation...', 'info');
            document.getElementById('toggleSimulationMode').checked = true;
            handleFeePayment();
            return;
        }

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (resp) {
            resetPayButton();
            showPaymentAlert(`Payment failed: ${resp.error.description} (Code: ${resp.error.code})`, 'danger');
        });
        rzp.open();

    } catch (err) {
        showPaymentAlert(err.message, 'danger');
        resetPayButton();
    }
}

function getStoredPaymentHistory() {
    try {
        const raw = sessionStorage.getItem('fpm_payment_history') || localStorage.getItem('fpm_payment_history');
        const list = raw ? JSON.parse(raw) : [];
        if (sessionStorage.getItem('fpm_payment_history') === null && Array.isArray(list) && list.length > 0) {
            sessionStorage.setItem('fpm_payment_history', JSON.stringify(list));
        }
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function saveStoredPaymentHistory(entry) {
    const list = getStoredPaymentHistory();
    const fresh = {
        transactionId: entry.transactionId,
        transactionReference: entry.transactionReference || `TXN-${entry.transactionId}`,
        receiptNumber: entry.receiptNumber || `TXN-${entry.transactionId}`,
        amount: Number(entry.amount || 0),
        gatewayName: entry.gatewayName || 'Demo/Local',
        transactionStatus: entry.transactionStatus || 'SUCCESS',
        transactionDate: entry.transactionDate || new Date().toISOString()
    };

    const merged = [fresh, ...list.filter(item => String(item.transactionId) !== String(entry.transactionId))].slice(0, 25);
    sessionStorage.setItem('fpm_payment_history', JSON.stringify(merged));
    localStorage.removeItem('fpm_payment_history');
    return merged;
}

function handlePaymentSuccess(transactionId, ref, amount, method) {
    const normalizedRef = String(ref || '').trim() || `TXN-${transactionId}`;
    const paymentEntry = {
        transactionId: String(transactionId),
        transactionReference: normalizedRef,
        receiptNumber: normalizedRef,
        amount: Number(amount || 0),
        gatewayName: method || 'Razorpay',
        transactionStatus: 'SUCCESS',
        transactionDate: new Date().toISOString()
    };

    saveStoredPaymentHistory(paymentEntry);

    sessionStorage.setItem('lastTransactionId', String(transactionId));
    sessionStorage.setItem('lastTransactionReference', String(normalizedRef));
    sessionStorage.setItem('lastAmount', String(amount));
    sessionStorage.setItem('lastPaymentMethod', method);

    // Signal the dashboard to re-fetch live data when the student returns
    sessionStorage.setItem('fpm_payment_done', '1');

    // 1. Show Success Alert in Payment Section
    showPaymentAlert(`
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
                <strong><i class="bi bi-check-circle-fill me-1"></i> Payment Cleared Successfully!</strong><br>
                <span>Transaction Reference: <code>${normalizedRef}</code> • Amount: ₹${Number(amount).toLocaleString('en-IN')}</span>
            </div>
            <div class="d-flex gap-2 mt-1">
                <a href="receipt.html?transactionId=${encodeURIComponent(transactionId)}" class="btn btn-sm btn-light fw-bold text-success border">
                    <i class="bi bi-receipt me-1"></i> View Receipt
                </a>
                <a href="payment-success.html?transactionId=${encodeURIComponent(transactionId)}" class="btn btn-sm btn-success">
                    Confirmation Page <i class="bi bi-arrow-right ms-1"></i>
                </a>
            </div>
        </div>
    `, 'success', false);

    // 2. Refresh ALL dashboard sections immediately and again on the next tick
    if (typeof window.refreshFullDashboard === 'function') {
        window.refreshFullDashboard();
        setTimeout(() => window.refreshFullDashboard(), 800);
    }
}

/**
 * Re-fetches the student dashboard from the backend and updates all UI elements:
 * stat cards, progress bar, sidebar badge, upcoming installment section.
 */
async function refreshDashboardAfterPayment() {
    try {
        const token = localStorage.getItem('fpm_token');
        const res = await fetch('http://localhost:8080/api/student/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data;
        if (!data) return;

        const total   = Number(data.totalFee   || 120000);
        const paid    = Number(data.paidAmount  || 0);
        const pending = Math.max(0, Number(data.pendingAmount != null ? data.pendingAmount : (total - paid)));
        const isCleared = pending <= 0 || data.isCleared === true;
        const paidPct   = Math.min(100, Math.round((paid / total) * 100));

        const fmt = v => '₹' + Number(v).toLocaleString('en-IN');

        // Stat Cards
        const paidEl = document.getElementById('feePaidAmount');
        if (paidEl) { paidEl.textContent = fmt(paid); paidEl.className = 'stat-card-value text-success'; }

        const pendingEl = document.getElementById('feePendingAmount');
        if (pendingEl) {
            pendingEl.textContent = isCleared ? '₹0' : fmt(pending);
            pendingEl.className = isCleared ? 'stat-card-value text-success' : 'stat-card-value text-warning';
        }

        // Pending sub-labels
        const pendingSubEl  = document.getElementById('feePendingSubtext');
        const pendingDueEl  = document.getElementById('feePendingDueDate');
        const pendingIconEl = document.getElementById('feePendingIcon');
        const pendingIconWrap = document.getElementById('feePendingIconWrapper');
        if (isCleared) {
            if (pendingSubEl) { pendingSubEl.className = 'trend-badge trend-positive'; pendingSubEl.textContent = 'All Fees Cleared'; }
            if (pendingDueEl) pendingDueEl.textContent = 'No Dues Pending';
            if (pendingIconWrap) pendingIconWrap.className = 'stat-icon-wrapper stat-icon-green';
            if (pendingIconEl) pendingIconEl.className = 'bi bi-check-circle-fill';
        }

        // Hero status
        const heroStatusEl = document.getElementById('heroPaymentStatus');
        const heroIconEl   = document.getElementById('heroStatusIcon');
        if (heroStatusEl) {
            heroStatusEl.innerHTML = isCleared
                ? 'Status: <strong class="text-success">ALL FEES PAID (100% CLEARED)</strong>'
                : `Status: <strong>${paid > 0 ? 'PARTIALLY PAID (' + paidPct + '%)' : 'UNPAID'}</strong>`;
        }
        if (heroIconEl) {
            heroIconEl.className = isCleared ? 'bi bi-patch-check-fill text-success' : 'bi bi-clock-fill text-warning';
        }

        // Progress Bar
        const progressBar   = document.getElementById('feeProgressBar');
        const progressSub   = document.getElementById('feeProgressSubtext');
        const progressBadge = document.getElementById('feeProgressBadge');
        const markerInst2   = document.getElementById('markerInst2');
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
                progressBadge.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Balance Pending';
            }
        }
        if (markerInst2) {
            markerInst2.className = isCleared ? 'text-success fw-bold' : 'text-danger fw-bold';
            markerInst2.textContent = isCleared ? '₹1,20,000 (PAID ✓)' : `₹1,20,000 (Balance: ${fmt(pending)})`;
        }

        // Upcoming Installment card
        const upcomingTitle  = document.getElementById('upcomingInstTitle');
        const upcomingAmount = document.getElementById('upcomingInstAmount');
        const upcomingPill   = document.getElementById('upcomingActionPill');
        const upcomingPayBtnContainer = document.getElementById('upcomingPayBtnContainer');
        if (isCleared) {
            if (upcomingTitle)  upcomingTitle.textContent = 'Academic Fee Balance';
            if (upcomingAmount) { upcomingAmount.className = 'fw-bold text-success mb-0'; upcomingAmount.textContent = '₹0 (Fully Paid)'; }
            if (upcomingPill)   { upcomingPill.className = 'status-pill status-pill-paid'; upcomingPill.textContent = 'CLEARED ✓'; }
            if (upcomingPayBtnContainer) {
                upcomingPayBtnContainer.innerHTML = `
                    <button class="btn btn-success w-100 py-3 justify-content-center fw-bold shadow-sm" disabled style="cursor:default;">
                        <i class="bi bi-patch-check-fill me-2 fs-5"></i> All Fees Cleared (₹0 Remaining)
                    </button>
                `;
            }
        } else {
            if (upcomingAmount) upcomingAmount.textContent = fmt(pending);
            if (upcomingPayBtnContainer) {
                upcomingPayBtnContainer.innerHTML = `
                    <button class="btn-erp-primary w-100 py-2 justify-content-center" onclick="initiatePaymentModal(${pending}, 'College Fee Payment - Balance ${fmt(pending)}')">
                        <i class="bi bi-lock-fill"></i> Pay ${fmt(pending)} Now via Gateway
                    </button>
                `;
            }
        }

        // Sidebar "Due" badge — hide it when cleared
        const dueBadge = document.querySelector('.erp-nav-badge');
        if (dueBadge && isCleared) {
            dueBadge.style.display = 'none';
        }

        // Payment History snippet on dashboard
        const paymentHistory = data.paymentHistory || [];
        const dashTbody = document.getElementById('dashboardReceiptsTbody');
        if (dashTbody && paymentHistory.length > 0) {
            dashTbody.innerHTML = paymentHistory.map(p => `
                <tr>
                    <td><span class="prn-code-badge">${escHtml(p.receiptNumber || ('REC-' + p.transactionId))}</span></td>
                    <td><strong>Academic Fee Payment</strong></td>
                    <td><strong>₹${Number(p.amount).toLocaleString('en-IN')}</strong></td>
                    <td>${escHtml(p.date || 'Recent')}</td>
                    <td><span class="status-pill status-pill-paid">PAID</span></td>
                    <td>
                        <a href="receipt.html?transactionId=${encodeURIComponent(p.transactionId)}" class="btn-erp-outline py-1 px-2" style="font-size:0.75rem;" target="_blank">
                            <i class="bi bi-printer-fill me-1"></i>Receipt
                        </a>
                    </td>
                </tr>
            `).join('');
        }

    } catch (e) {
        console.warn('Dashboard refresh after payment failed:', e);
    }
}

function resetPayButton() {
    const paySubmitBtn = document.getElementById('btnSubmitFeePayment');
    const paySpinner = document.getElementById('paySpinner');
    const payBtnLabel = document.getElementById('payBtnLabel');
    if (paySubmitBtn) paySubmitBtn.disabled = false;
    if (paySpinner) paySpinner.classList.add('d-none');
    if (payBtnLabel) payBtnLabel.textContent = 'Proceed to Pay Securely';
}

function showPaymentAlert(htmlMessage, type = 'info', autoDismiss = true) {
    const container = document.getElementById('paymentAlertArea');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" style="border-radius:12px;">
            ${htmlMessage}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    if (autoDismiss && type !== 'danger') {
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) bootstrap.Alert.getOrCreateInstance(alert).close();
        }, 8000);
    }
}

/**
 * Open Payment Terminal for a specific installment from "Approved Schedule"
 */
function openPaymentTerminalForInstallment(amount, desc) {
    currentSelectedAmount = amount;
    currentInstallmentDesc = desc;

    // Switch to Payment Section
    const navLink = document.querySelector('.erp-sidebar-nav .erp-nav-link[data-section="sec-student-pay-fee"]');
    if (navLink) {
        navLink.click();
    } else {
        const allSections = document.querySelectorAll('.dashboard-section');
        allSections.forEach(sec => sec.classList.add('d-none'));
        const target = document.getElementById('sec-student-pay-fee');
        if (target) target.classList.remove('d-none');
    }

    // Select the installment radio
    const radioInst2 = document.getElementById('instOption2');
    if (radioInst2) radioInst2.checked = true;

    updatePayButtonDisplay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Dynamically loads transaction records from backend API into Section 8
 */
async function loadStudentTransactionHistory() {
    const tbody = document.getElementById('studentPaymentHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Loading payment history...
            </td>
        </tr>
    `;

    try {
        const token = localStorage.getItem('fpm_token');
        const demoToken = !token || String(token).startsWith('demo-token');
        const storedHistory = filterHiddenTransactionHistory(getStoredPaymentHistory());

        if (!token || demoToken) {
            if (storedHistory.length > 0) {
                tbody.innerHTML = storedHistory.map(t => {
                    const dateStr = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Recent';
                    const statusBadge = (t.transactionStatus || 'SUCCESS') === 'SUCCESS'
                        ? '<span class="status-pill status-pill-paid">SUCCESS</span>'
                        : '<span class="status-pill status-pill-pending">' + (t.transactionStatus || 'PENDING') + '</span>';

                    return `
                        <tr>
                            <td><span class="prn-code-badge">${escHtml(t.receiptNumber || t.transactionReference || ('#' + t.transactionId))}</span></td>
                            <td><strong>Student Fee Payment</strong> <span class="text-muted small d-block">AY 2025-26</span></td>
                            <td><strong class="text-success">₹${Number(t.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
                            <td><span class="badge bg-light text-dark border">${escHtml(t.gatewayName || 'Demo')}</span></td>
                            <td><small class="text-muted">${dateStr}</small></td>
                            <td>${statusBadge}</td>
                            <td>
                                <a href="receipt.html?transactionId=${encodeURIComponent(t.transactionId)}" class="btn-icon-action" title="View & Print Official Receipt">
                                    <i class="bi bi-printer-fill text-primary"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                }).join('');
                return;
            }

            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">
                <i class="bi bi-clock-history fs-3 d-block mb-2"></i>
                No transactions recorded yet. Complete your first payment to see history here.
            </td></tr>`;
            return;
        }

        const res = await fetch(`${PAYMENT_API_BASE}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('[Transactions] HTTP status:', res.status);

        if (res.status === 401 || res.status === 403) {
            if (storedHistory.length > 0) {
                tbody.innerHTML = storedHistory.map(t => {
                    const dateStr = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Recent';
                    const statusBadge = (t.transactionStatus || 'SUCCESS') === 'SUCCESS'
                        ? '<span class="status-pill status-pill-paid">SUCCESS</span>'
                        : '<span class="status-pill status-pill-pending">' + (t.transactionStatus || 'PENDING') + '</span>';

                    return `
                        <tr>
                            <td><span class="prn-code-badge">${escHtml(t.receiptNumber || t.transactionReference || ('#' + t.transactionId))}</span></td>
                            <td><strong>Student Fee Payment</strong> <span class="text-muted small d-block">AY 2025-26</span></td>
                            <td><strong class="text-success">₹${Number(t.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
                            <td><span class="badge bg-light text-dark border">${escHtml(t.gatewayName || 'Demo')}</span></td>
                            <td><small class="text-muted">${dateStr}</small></td>
                            <td>${statusBadge}</td>
                            <td>
                                <a href="receipt.html?transactionId=${encodeURIComponent(t.transactionId)}" class="btn-icon-action" title="View & Print Official Receipt">
                                    <i class="bi bi-printer-fill text-primary"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                }).join('');
                return;
            }

            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-warning">
                <i class="bi bi-shield-exclamation fs-3 d-block mb-2"></i>
                Session expired. Please <a href="../login.html" class="btn btn-sm btn-primary ms-2">Login Again</a>
            </td></tr>`;
            return;
        }

        if (!res.ok) {
            const errText = await res.text();
            console.warn('[Transactions] Error response:', errText);
            throw new Error('Status ' + res.status);
        }

        const json = await res.json();
        console.log('[Transactions] Raw response:', json);

        // Backend wraps: { success: true, data: [...] }
        const transactions = filterHiddenTransactionHistory(Array.isArray(json) ? json : (json.data || []));

        if (!transactions || transactions.length === 0) {
            localStorage.removeItem('fpm_payment_history');
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="bi bi-clock-history fs-3 d-block mb-2"></i>
                        No transactions recorded yet. Complete your first payment to see history here.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const dateStr = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recent';

            const statusBadge = t.transactionStatus === 'SUCCESS'
                ? '<span class="status-pill status-pill-paid">SUCCESS</span>'
                : '<span class="status-pill status-pill-pending">' + (t.transactionStatus || 'PENDING') + '</span>';

            return `
                <tr>
                    <td><span class="prn-code-badge">${escHtml(t.receiptNumber || t.transactionReference || ('#' + t.transactionId))}</span></td>
                    <td><strong>Student Fee Payment</strong> <span class="text-muted small d-block">AY 2025-26</span></td>
                    <td><strong class="text-success">₹${Number(t.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
                    <td><span class="badge bg-light text-dark border">${escHtml(t.gatewayName || 'Razorpay')}</span></td>
                    <td><small class="text-muted">${dateStr}</small></td>
                    <td>${statusBadge}</td>
                    <td>
                        <a href="receipt.html?transactionId=${encodeURIComponent(t.transactionId)}" class="btn-icon-action" title="View & Print Official Receipt">
                            <i class="bi bi-printer-fill text-primary"></i>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.warn('[Transactions] loadStudentTransactionHistory error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="bi bi-exclamation-triangle-fill text-warning fs-3 d-block mb-2"></i>
                    Unable to load transaction history (${err.message}). 
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadStudentTransactionHistory()">Retry</button>
                </td>
            </tr>
        `;
    }
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
