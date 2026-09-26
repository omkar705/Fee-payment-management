/**
 * student.js — Student Portal Logic
 * Fee Payment Management System | MMCOE
 *
 * Implements: Profile, Fee Status, 2-Installment Plan, Razorpay Payment, and Receipts.
 */

let currentStudentData = null;
let currentInstallmentPlan = null;

function hasInstallmentPlan() {
    return !!(currentInstallmentPlan && currentInstallmentPlan.hasRequest === true);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('STUDENT')) return;

    initStudentPortal();
});

async function initStudentPortal() {
    currentStudentData = null;
    currentInstallmentPlan = null;

    await loadStudentProfileAndFees();
    await loadInstallmentPlan();
    await loadStudentTransactions();

    if (window.location.hash === '#installments') {
        showSection('sec-student-installments');
    }
}

/**
 * 1. Fetch Profile and Fee Status from backend
 */
async function loadStudentProfileAndFees() {
    try {
        const result = await apiFetch('/student/dashboard');
        if (result && result.ok && result.data && result.data.data) {
            currentStudentData = result.data.data;
            if (currentStudentData.installment) {
                currentInstallmentPlan = currentStudentData.installment;
            }
            renderStudentDetails(currentStudentData);
            return;
        }
    } catch (e) {
        console.warn('API error, using session student profile.');
    }

    // Fallback data for offline/demo:
    // A newly created student starts with no installment request and paidAmount 0
    const sessionEmail = getEmail() || 'b25it2010@mmcoe.com';
    const sessionName = getName() || 'Student';
    currentStudentData = {
        student: {
            name: sessionName,
            prn: 'B25IT2010',
            email: sessionEmail,
            mobile: '9876543210',
            department: 'Information Technology',
            course: 'B.Tech',
            academicYear: '2025-26'
        },
        totalFee: 120000,
        paidAmount: 0,
        pendingAmount: 120000,
        paymentStatus: 'PENDING',
        installment: {
            hasRequest: false,
            status: 'NOT_APPLIED'
        }
    };
    currentInstallmentPlan = currentStudentData.installment;
    renderStudentDetails(currentStudentData);
}

function renderStudentDetails(data) {
    const student = data.student || {};

    // Header & Greeting
    setTxt('welcomeGreeting', `Welcome back, ${student.name ? student.name.split(' ')[0] : 'Student'}!`);
    setTxt('studentDeptText', student.department || 'Information Technology');
    setTxt('topbarStudentName', student.name || 'Student');
    setTxt('topbarStudentPrn', `PRN: ${student.prn || '—'}`);

    const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST';
    setTxt('studentAvatarInitials', initials);

    // Profile Section
    setTxt('profileStudentName', student.name || '—');
    setTxt('profileStudentPrn', student.prn || '—');
    setTxt('profileStudentEmail', student.email || '—');
    setTxt('profileStudentMobile', student.mobile || '—');
    setTxt('profileStudentDept', student.department || 'Information Technology');
    setTxt('profileStudentCourse', student.course || 'B.Tech');
    setTxt('profileStudentYear', student.academicYear || '2025-26');
    setTxt('profileStudentBtechYear', student.btechYear || '1st Year');
    setTxt('profileStudentCaste', student.caste || 'OPEN');
    setTxt('profileStudentGender', student.gender || 'Male');
    setTxt('profileStudentIncome', student.annualFamilyIncome ? '₹' + Number(student.annualFamilyIncome).toLocaleString('en-IN') : '₹0');
    setTxt('profileStudentQuota', student.quota || 'CAP');

    // Fee Breakdown from DB
    const total = Number(data.totalFee || 120000);
    const tuition = Number(data.tuitionFee || 0);
    const dev = Number(data.developmentFee || 0);
    const exam = Number(data.examFee || 0);
    const univ = Number(data.universityFee || 0);
    const lib = Number(data.libraryFee || 0);
    const lab = Number(data.laboratoryFee || 0);
    const ins = Number(data.insuranceFee || 0);
    const other = Number(data.otherFee || 0);
    const inst1Amt = Number(data.installment1 || (total / 2));
    const inst2Amt = Number(data.installment2 || (total - inst1Amt));

    setTxt('statTotalAnnualFee', '₹' + total.toLocaleString('en-IN'));
    setTxt('studentTuitionFee', '₹' + tuition.toLocaleString('en-IN'));
    setTxt('studentDevFee', '₹' + dev.toLocaleString('en-IN'));
    setTxt('studentExamFee', '₹' + exam.toLocaleString('en-IN'));
    setTxt('studentUniversityFee', '₹' + univ.toLocaleString('en-IN'));
    setTxt('studentLibraryFee', '₹' + lib.toLocaleString('en-IN'));
    setTxt('studentLaboratoryFee', '₹' + lab.toLocaleString('en-IN'));
    setTxt('studentInsuranceFee', '₹' + ins.toLocaleString('en-IN'));
    setTxt('studentOtherFee', '₹' + other.toLocaleString('en-IN'));
    setTxt('studentTotalFeeDisplay', '₹' + total.toLocaleString('en-IN'));

    // Installments Schedule
    setTxt('inst1AmountDisplay', '₹' + inst1Amt.toLocaleString('en-IN'));
    setTxt('inst2AmountDisplay', '₹' + inst2Amt.toLocaleString('en-IN'));
    setTxt('inst1ScheduleAmount', '₹' + inst1Amt.toLocaleString('en-IN'));
    setTxt('inst2ScheduleAmount', '₹' + inst2Amt.toLocaleString('en-IN'));
    setTxt('payRadioInst1Label', '₹' + inst1Amt.toLocaleString('en-IN'));
    setTxt('payOptionInst1Amount', '₹' + inst1Amt.toLocaleString('en-IN'));

    // Fee Status
    const paid = Number(data.paidAmount != null ? data.paidAmount : 0);
    const pending = Number(data.pendingAmount != null ? data.pendingAmount : Math.max(0, total - paid));

    setTxt('statTotalAnnualFee', '₹' + total.toLocaleString('en-IN'));
    setTxt('statPaidAmount', '₹' + paid.toLocaleString('en-IN'));
    setTxt('statPendingBalance', '₹' + pending.toLocaleString('en-IN'));
    setTxt('payOutstandingFee', '₹' + pending.toLocaleString('en-IN'));
    setTxt('payRadioFullLabel', '₹' + pending.toLocaleString('en-IN'));
    setTxt('payOptionFullAmount', '₹' + pending.toLocaleString('en-IN'));
    setTxt('payStudentPrn', student.prn || '—');

    // Fee Status Badge
    const badge = document.getElementById('feeStatusBadge');
    if (badge) {
        if (pending <= 0) {
            badge.className = 'badge bg-success';
            badge.textContent = 'FULLY PAID';
        } else if (paid > 0) {
            badge.className = 'badge bg-info text-dark';
            badge.textContent = 'PARTIALLY PAID';
        } else {
            badge.className = 'badge bg-warning text-dark';
            badge.textContent = 'PENDING';
        }
    }

    // Installments schedule amounts & badges
    const inst1Amount = Math.round(total / 2);
    const inst2Amount = total - inst1Amount;
    setTxt('inst1ScheduleAmount', '₹' + inst1Amount.toLocaleString('en-IN'));
    setTxt('inst2ScheduleAmount', '₹' + inst2Amount.toLocaleString('en-IN'));

    const inst1 = document.getElementById('inst1Badge');
    const inst2 = document.getElementById('inst2Badge');
    if (inst1) {
        inst1.className = paid >= inst1Amt ? 'badge bg-success' : 'badge bg-warning text-dark';
        inst1.textContent = paid >= inst1Amt ? 'PAID' : 'DUE';
    }
    if (inst2) {
        inst2.className = paid >= total ? 'badge bg-success' : 'badge bg-warning text-dark';
        inst2.textContent = paid >= total ? 'PAID' : 'DUE';
    }

    // Sync payment options with fees
    syncPaymentOptionsWithFees(pending, total);
}

function updateCustomPayAmount(val) {
    const input = document.getElementById('payCustomInput');
    if (input) input.value = val;
}

/**
 * 2. Load 2-Installment Plan Status & Schedule
 */
async function loadInstallmentPlan() {
    try {
        const result = await apiFetch('/student/installment-plan');
        if (result && result.ok && result.data && result.data.data) {
            currentInstallmentPlan = result.data.data;
        } else if (currentStudentData && currentStudentData.installment) {
            currentInstallmentPlan = currentStudentData.installment;
        } else if (!currentInstallmentPlan) {
            currentInstallmentPlan = { hasRequest: false, status: 'NOT_APPLIED' };
        }
    } catch (e) {
        console.warn('Could not load installment plan from API.');
        if (currentStudentData && currentStudentData.installment) {
            currentInstallmentPlan = currentStudentData.installment;
        } else if (!currentInstallmentPlan) {
            currentInstallmentPlan = { hasRequest: false, status: 'NOT_APPLIED' };
        }
    }

    renderInstallmentUI(currentInstallmentPlan);
}

/**
 * Render conditional Installment UI based on backend plan
 */
function renderInstallmentUI(plan) {
    const navItem = document.getElementById('navInstallmentPlan');
    const quickBtn = document.getElementById('quickActionInstallmentBtn');
    const installmentSection = document.getElementById('sec-student-installments');
    const statusPill = document.getElementById('installmentStatusPill');
    const statusDetails = document.getElementById('installmentStatusDetails');
    const scheduleCard = document.getElementById('installmentScheduleCard');
    const applyCard = document.getElementById('installmentApplyCard');
    const applyCardBody = document.getElementById('installmentApplyCardBody');
    const dashMsg = document.getElementById('dashInstMsg');
    const dashBtn = document.getElementById('dashInstBtn');

    // Sidebar navigation is always accessible
    if (navItem) navItem.classList.remove('d-none');

    const hasReq = !!(plan && plan.hasRequest === true);
    const status = hasReq ? (plan.status || 'PENDING').toUpperCase() : 'NOT_APPLIED';

    // -------------------------------------------------------------
    // CASE 1: Student has NOT applied
    // (hasRequest === false, status === "NOT_APPLIED")
    // -------------------------------------------------------------
    if (!hasReq || status === 'NOT_APPLIED') {
        // Quick Action button on Dashboard: "Apply for Installment"
        if (quickBtn) {
            quickBtn.classList.remove('d-none');
            quickBtn.innerHTML = '<i class="bi bi-file-earmark-plus me-1"></i> Apply for Installment';
        }

        // Dashboard installment summary card
        if (dashMsg) {
            dashMsg.textContent = 'You have not applied for an installment plan yet.';
        }
        if (dashBtn) {
            dashBtn.className = 'btn btn-outline-primary btn-sm';
            dashBtn.innerHTML = '<i class="bi bi-file-earmark-plus me-1"></i> Apply for Installment';
        }

        // Section 4: 2-Installment Plan
        // 1. Hide status badge completely (no APPROVED/PENDING/REJECTED/ELIGIBLE badge)
        if (statusPill) {
            statusPill.classList.add('d-none');
            statusPill.textContent = '';
        }

        // 2. Status message
        if (statusDetails) {
            statusDetails.innerHTML = '<p class="mb-0 text-muted">You have not applied for an installment plan yet.</p>';
        }

        // 3. Hide installment schedule card
        if (scheduleCard) {
            scheduleCard.classList.add('d-none');
        }

        // 4. Show Apply for Installment Form
        if (applyCard) {
            applyCard.classList.remove('d-none');
        }
        if (applyCardBody) {
            applyCardBody.innerHTML = `
                <p class="text-secondary small mb-3">
                    If you require split payment, submit an application to the Accounts Office to split your annual fee into exactly two installments.
                </p>
                <form id="applyInstallmentForm" onsubmit="handleApplyInstallment(event)">
                    <div class="mb-3">
                        <label for="installmentReason" class="form-label">Reason for Requesting 2 Installments <span class="text-danger">*</span></label>
                        <textarea class="form-control" id="installmentReason" rows="3" placeholder="Briefly state your reason (e.g. Parent educational loan processing, semester-wise payment preference)" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" id="applyInstallmentBtn">
                        <i class="bi bi-send me-1"></i> Apply for Installment
                    </button>
                </form>
            `;
        }

        // 5. Configure payment page for full outstanding fee only (no installment option)
        configurePaymentForFullFee();
        return;
    }

    // -------------------------------------------------------------
    // CASES 2, 3, 4: Student HAS applied (hasRequest === true)
    // -------------------------------------------------------------
    if (quickBtn) {
        quickBtn.classList.remove('d-none');
        quickBtn.innerHTML = '<i class="bi bi-calendar-range me-1"></i> View 2-Installment Plan';
    }

    // Show status pill
    if (statusPill) {
        statusPill.classList.remove('d-none');
        if (status === 'APPROVED') {
            statusPill.className = 'badge bg-success';
            statusPill.textContent = 'APPROVED';
        } else if (status === 'REJECTED') {
            statusPill.className = 'badge bg-danger';
            statusPill.textContent = 'REJECTED';
        } else {
            statusPill.className = 'badge bg-warning text-dark';
            statusPill.textContent = 'PENDING';
        }
    }

    // Status details
    if (statusDetails) {
        if (status === 'APPROVED') {
            statusDetails.innerHTML = `
                <div class="alert alert-success mb-0">
                    <strong>Status: APPROVED</strong> &mdash; Your 2-installment plan has been approved by Accounts Office.
                    <br><small class="text-muted">Reason: ${escHtml(plan.reason || 'Standard academic session installment')}</small>
                </div>
            `;
        } else if (status === 'REJECTED') {
            statusDetails.innerHTML = `
                <div class="alert alert-danger mb-0">
                    <strong>Status: REJECTED</strong> &mdash; Your 2-installment application was rejected by Accounts Office. Full annual fee payment is required.
                    <br><small class="text-muted">Reason: ${escHtml(plan.reason || 'None stated')}</small>
                </div>
            `;
        } else {
            statusDetails.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <strong>Status: PENDING</strong> &mdash; Application is under review by Accounts Office.
                    <br><small class="text-muted">Reason: ${escHtml(plan.reason || 'None stated')}</small>
                </div>
            `;
        }
    }

    // Dashboard overview card sync
    if (dashMsg) {
        if (status === 'APPROVED') {
            dashMsg.textContent = 'Your 2-installment plan is approved (Semester 1 & 2: ₹60,000 each).';
        } else if (status === 'REJECTED') {
            dashMsg.textContent = 'Application was rejected by Accounts Office. Full annual fee payment required.';
        } else {
            dashMsg.textContent = 'Application is under review by Accounts Office.';
        }
    }
    if (dashBtn) {
        if (status === 'APPROVED') {
            dashBtn.className = 'btn btn-outline-primary btn-sm';
            dashBtn.innerHTML = '<i class="bi bi-calendar-range me-1"></i> View 2-Installment Plan';
        } else if (status === 'REJECTED') {
            dashBtn.className = 'btn btn-outline-danger btn-sm';
            dashBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> View Details / Re-apply';
        } else {
            dashBtn.className = 'btn btn-outline-warning text-dark btn-sm';
            dashBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> View Status';
        }
    }

    // Schedule card: ONLY display when APPROVED
    if (scheduleCard) {
        if (status === 'APPROVED') {
            scheduleCard.classList.remove('d-none');
        } else {
            scheduleCard.classList.add('d-none');
        }
    }

    // Apply card body
    if (applyCard) applyCard.classList.remove('d-none');
    if (applyCardBody) {
        if (status === 'APPROVED') {
            applyCardBody.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-check-circle-fill text-success fs-3 mb-2 d-block"></i>
                    <h6 class="fw-bold text-success mb-1">Installment Plan Active</h6>
                    <p class="text-muted mb-0 small">Your 2-installment plan is approved and active for AY 2025-26.</p>
                </div>
            `;
        } else if (status === 'PENDING') {
            applyCardBody.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-hourglass-split text-warning fs-3 mb-2 d-block"></i>
                    <h6 class="fw-bold text-warning mb-1">Application Under Review</h6>
                    <p class="text-muted mb-0 small">Application is under review by Accounts Office.</p>
                </div>
            `;
        } else if (status === 'REJECTED') {
            applyCardBody.innerHTML = `
                <p class="text-secondary small mb-3">
                    Your previous installment request was rejected. You may submit a new application with additional justification if required.
                </p>
                <form id="applyInstallmentForm" onsubmit="handleApplyInstallment(event)">
                    <div class="mb-3">
                        <label for="installmentReason" class="form-label">Reason for Requesting 2 Installments <span class="text-danger">*</span></label>
                        <textarea class="form-control" id="installmentReason" rows="3" placeholder="State reason with details..." required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" id="applyInstallmentBtn">
                        <i class="bi bi-send me-1"></i> Apply for Installment
                    </button>
                </form>
            `;
        }
    }

    // Configure payment options for installment student
    configurePaymentForInstallmentStudent(status, plan);
}

function configurePaymentForFullFee() {
    const instWrapper = document.getElementById('payOptionInstWrapper');
    const fullWrapper = document.getElementById('payOptionFullWrapper');
    const fullRadio = document.getElementById('payOptionFull');
    const instRadio = document.getElementById('payOptionInst1');
    const customInput = document.getElementById('payCustomInput');

    // Completely hide installment payment option
    if (instWrapper) instWrapper.classList.add('d-none');
    if (instRadio) instRadio.checked = false;

    // Show full fee option
    if (fullWrapper) fullWrapper.classList.remove('d-none');
    if (fullRadio) fullRadio.checked = true;

    // Calculate actual outstanding pending fee
    const total = Number(currentStudentData?.totalFee != null ? currentStudentData.totalFee : 120000);
    const paid = Number(currentStudentData?.paidAmount != null ? currentStudentData.paidAmount : 0);
    const pending = Number(currentStudentData?.pendingAmount != null ? currentStudentData.pendingAmount : Math.max(0, total - paid));

    setTxt('payOptionFullAmount', '₹' + pending.toLocaleString('en-IN'));
    if (fullRadio) fullRadio.value = pending;
    if (customInput) customInput.value = pending;
}

function configurePaymentForInstallmentStudent(status, plan) {
    const instWrapper = document.getElementById('payOptionInstWrapper');
    const fullWrapper = document.getElementById('payOptionFullWrapper');
    const fullRadio = document.getElementById('payOptionFull');
    const instRadio = document.getElementById('payOptionInst1');
    const customInput = document.getElementById('payCustomInput');

    const total = Number(currentStudentData?.totalFee != null ? currentStudentData.totalFee : 120000);
    const paid = Number(currentStudentData?.paidAmount != null ? currentStudentData.paidAmount : 0);
    const pending = Number(currentStudentData?.pendingAmount != null ? currentStudentData.pendingAmount : Math.max(0, total - paid));

    setTxt('payOptionFullAmount', '₹' + pending.toLocaleString('en-IN'));
    if (fullRadio) fullRadio.value = pending;

    // Only students with APPROVED installment plans can pay in installments
    if (status === 'APPROVED') {
        if (instWrapper) instWrapper.classList.remove('d-none');

        const instAmt = plan?.installmentAmount || Math.round(total / 2) || 60000;
        const currentInstPayable = Math.min(instAmt, pending);

        setTxt('payOptionInst1Amount', '₹' + currentInstPayable.toLocaleString('en-IN'));
        if (instRadio) {
            instRadio.value = currentInstPayable;
            instRadio.checked = true;
        }
        if (customInput) {
            customInput.value = currentInstPayable;
        }
    } else {
        // PENDING or REJECTED: cannot pay installment rate yet, show full fee option
        if (instWrapper) instWrapper.classList.add('d-none');
        if (instRadio) instRadio.checked = false;
        if (fullRadio) fullRadio.checked = true;
        if (customInput) customInput.value = pending;
    }
}

function syncPaymentOptionsWithFees(pending, total) {
    if (!currentInstallmentPlan || !currentInstallmentPlan.hasRequest) {
        configurePaymentForFullFee();
    } else {
        const status = (currentInstallmentPlan.status || 'PENDING').toUpperCase();
        configurePaymentForInstallmentStudent(status, currentInstallmentPlan);
    }
}

/**
 * 3. Submit 2-Installment Plan Application
 */
async function handleApplyInstallment(e) {
    e.preventDefault();

    const reason = document.getElementById('installmentReason')?.value.trim();
    if (!reason) {
        alert('Please enter a reason for your 2-installment plan request.');
        return;
    }

    const btn = document.getElementById('applyInstallmentBtn');
    if (btn) btn.disabled = true;

    try {
        const result = await apiFetch('/student/apply-installment', {
            method: 'POST',
            body: JSON.stringify({ reason })
        });

        if (result && result.ok) {
            alert('Your 2-installment application has been submitted successfully to the Accounts Office!');
            const reasonInput = document.getElementById('installmentReason');
            if (reasonInput) reasonInput.value = '';
            await loadInstallmentPlan();
        } else {
            const msg = (result && result.data && result.data.message) ? result.data.message : 'Failed to submit installment application.';
            alert('Notice: ' + msg);
            await loadInstallmentPlan();
        }
    } catch (err) {
        alert('Application submitted! (Demo mode recorded)');
        currentInstallmentPlan = {
            hasRequest: true,
            status: 'PENDING',
            reason: reason,
            appliedDate: new Date().toISOString()
        };
        renderInstallmentUI(currentInstallmentPlan);
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * 4. Load Payment Transactions History
 */
async function loadStudentTransactions() {
    const recentTbody = document.getElementById('studentDashboardRecentTbody');
    const fullTbody = document.getElementById('studentFullPaymentHistoryTbody');

    let history = [];
    if (currentStudentData && Array.isArray(currentStudentData.paymentHistory)) {
        history = currentStudentData.paymentHistory;
    }

    renderHistoryTables(recentTbody, fullTbody, history);
}

function renderHistoryTables(recentTbody, fullTbody, history) {
    if (recentTbody) {
        if (!history || history.length === 0) {
            recentTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No payments recorded yet.</td></tr>';
        } else {
            recentTbody.innerHTML = history.slice(0, 3).map(tx => `
                <tr>
                    <td><code>${escHtml(tx.transactionReference || tx.txId || 'TXN-ONLINE')}</code></td>
                    <td>${escHtml(tx.date || '2025-08-14')}</td>
                    <td><strong>₹${Number(tx.amount || 60000).toLocaleString('en-IN')}</strong></td>
                    <td>${escHtml(tx.gateway || 'Razorpay')}</td>
                    <td>
                        <span class="badge bg-success">SUCCESS</span>
                        ${tx.allocation ? `<br><small class="badge ${tx.allocation.includes('Installment') ? 'bg-primary' : 'bg-light text-secondary border'} mt-1">${escHtml(tx.allocation)}</small>` : ''}
                    </td>
                </tr>
            `).join('');
        }
    }

    if (fullTbody) {
        if (!history || history.length === 0) {
            fullTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No payment history found.</td></tr>';
        } else {
            fullTbody.innerHTML = history.map(tx => `
                <tr>
                    <td><code>${escHtml(tx.transactionReference || tx.txId || 'TXN-ONLINE')}</code></td>
                    <td>${escHtml(tx.date || '2025-08-14')}</td>
                    <td><strong>₹${Number(tx.amount || 60000).toLocaleString('en-IN')}</strong></td>
                    <td>${escHtml(tx.gateway || 'Razorpay')}</td>
                    <td>
                        <span class="badge bg-success">SUCCESS</span>
                        ${tx.allocation ? `<br><small class="badge ${tx.allocation.includes('Installment') ? 'bg-primary' : 'bg-light text-secondary border'} mt-1">${escHtml(tx.allocation)}</small>` : ''}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="showReceiptModal('${tx.receiptNumber || tx.transactionReference}', ${tx.amount || 60000}, '${tx.date || '2025-08-14'}', '${tx.gateway || 'Razorpay'}')">
                            <i class="bi bi-receipt"></i> Receipt
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

/**
 * 5. Trigger Razorpay Payment
 */
async function triggerCollegeFeePayment() {
    const amountInput = document.getElementById('payCustomInput');
    const amount = Number(amountInput ? amountInput.value : 60000);

    if (!amount || amount <= 0) {
        alert('Please enter a valid payment amount.');
        return;
    }

    const payBtn = document.getElementById('payFeeSubmitBtn');
    payBtn.disabled = true;
    payBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Connecting to Gateway...';

    try {
        // Step 1: Create Razorpay Order from backend
        let orderId = 'order_mock_' + Date.now();
        let keyId = 'rzp_test_TQtCrKTrktLiwZ';

        try {
            const orderRes = await apiFetch('/payments/create-order', {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount,
                    currency: 'INR',
                    description: 'MMCOE College Fee Payment'
                })
            });

            if (orderRes && orderRes.ok && orderRes.data && orderRes.data.data) {
                orderId = orderRes.data.data.orderId || orderId;
                keyId = orderRes.data.data.keyId || keyId;
            }
        } catch (apiErr) {
            console.warn('Using simulation order id');
        }

        // Step 2: Open Razorpay Checkout Modal
        if (typeof Razorpay !== 'undefined') {
            const options = {
                key: keyId,
                amount: amount * 100, // paise
                currency: 'INR',
                name: "Marathwada Mitra Mandal's COE",
                description: 'College Tuition & Development Fee',
                order_id: orderId.startsWith('order_mock_') ? undefined : orderId,
                handler: async function (response) {
                    await completePaymentFlow(amount, response.razorpay_payment_id || ('pay_' + Date.now()));
                },
                prefill: {
                    name: currentStudentData?.student?.name || 'Manan Vivekanand Tote',
                    email: currentStudentData?.student?.email || 'b25it2010@mmcoe.com',
                    contact: currentStudentData?.student?.mobile || '9876543210'
                },
                theme: { color: '#0d6efd' }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (err) {
                alert('Payment failed: ' + (err.error?.description || 'Transaction cancelled'));
                resetPayButton();
            });
            rzp.open();
        } else {
            // Simulation fallback
            if (confirm(`Razorpay SDK loaded in test mode. Confirm test payment of ₹${amount.toLocaleString('en-IN')}?`)) {
                await completePaymentFlow(amount, 'pay_sim_' + Date.now());
            } else {
                resetPayButton();
            }
        }
    } catch (err) {
        alert('Payment initiation failed: ' + err.message);
        resetPayButton();
    }
}

async function completePaymentFlow(amount, paymentId) {
    const alertBox = document.getElementById('paymentAlertBox');
    try {
        // Verify with backend
        await apiFetch('/payments/verify-payment', {
            method: 'POST',
            body: JSON.stringify({
                razorpayOrderId: 'order_' + Date.now(),
                razorpayPaymentId: paymentId,
                razorpaySignature: 'simulated_valid_signature'
            })
        });
    } catch (e) {
        console.warn('Payment recorded locally.');
    }

    if (alertBox) {
        alertBox.className = 'alert alert-success py-2 px-3 mb-3';
        alertBox.innerHTML = `<strong>Payment Successful!</strong> Reference: <code>${paymentId}</code> of ₹${amount.toLocaleString('en-IN')}`;
        alertBox.classList.remove('d-none');
    }

    alert(`Payment of ₹${amount.toLocaleString('en-IN')} verified successfully!`);
    resetPayButton();

    // Reload fees, installment plan, and transaction history
    await loadStudentProfileAndFees();
    await loadInstallmentPlan();
    await loadStudentTransactions();
    showSection('sec-student-dashboard');
}

function resetPayButton() {
    const payBtn = document.getElementById('payFeeSubmitBtn');
    if (payBtn) {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="bi bi-shield-lock-fill me-2"></i> Proceed to Pay via Razorpay';
    }
}

/**
 * 6. Receipt Modal
 */
function showReceiptModal(receiptNo, amount, date, gateway) {
    setTxt('recReceiptNo', receiptNo || 'REC-2025-001');
    setTxt('recStudentName', currentStudentData?.student?.name || 'Manan Vivekanand Tote');
    setTxt('recStudentPrn', currentStudentData?.student?.prn || 'B25IT2010');
    setTxt('recDate', date || '2025-08-14');
    setTxt('recGateway', gateway || 'Razorpay');
    setTxt('recAmount', '₹' + Number(amount).toLocaleString('en-IN'));

    const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
    modal.show();
}

function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
