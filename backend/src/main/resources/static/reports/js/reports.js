/**
 * reports.js — Core Engine for Reports & Analysis Module
 * Handles filter processing, dynamic JOINs across confirmed ER tables,
 * KPI calculations, Chart.js visualizations, tab rendering, CSV export, and print formatting.
 */

// Global state container
const ReportsApp = {
    activeTab: 'collection',
    filteredData: {},
    charts: {},
    raw: null
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Dataset (Dummy or API Fallback)
    initDataset();

    // 2. Populate Dropdown Filters Options
    populateFilterDropdowns();

    // 3. Bind Event Listeners (Filter buttons, search, tabs, export, print)
    bindEvents();

    // 4. Initial Render Execution
    processAndRender();
});

/**
 * Dataset Initializer
 */
function initDataset() {
    if (window.REPORTS_DUMMY_DATA) {
        ReportsApp.raw = window.REPORTS_DUMMY_DATA;
    } else {
        console.warn('REPORTS_DUMMY_DATA not loaded. Initializing empty dataset.');
        ReportsApp.raw = { students: [], fee_structures: [], fee_assignments: [], fee_installments: [], fee_payments: [] };
    }
}

/**
 * Populate Filter Options Dynamically from Dataset
 */
function populateFilterDropdowns() {
    const raw = ReportsApp.raw;

    // Academic Years
    const years = [...new Set(raw.fee_structures.map(f => f.academic_year))];
    populateSelect('filterAcademicYear', years);

    // Departments
    const depts = [...new Set(raw.students.map(s => s.department))];
    populateSelect('filterDepartment', depts);

    // Programs
    const progs = [...new Set(raw.students.map(s => s.program))];
    populateSelect('filterProgram', progs);

    // Semesters
    const sems = [...new Set(raw.students.map(s => s.year_semester))];
    populateSelect('filterSemester', sems);

    // Fee Types
    const feeTypes = [...new Set(raw.fee_structures.map(f => f.fee_type))];
    populateSelect('filterFeeType', feeTypes);
}

function populateSelect(id, options) {
    const sel = document.getElementById(id);
    if (!sel) return;
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        sel.appendChild(el);
    });
}

/**
 * Bind UI Events
 */
function bindEvents() {
    // Filter buttons
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => processAndRender());
    document.getElementById('btnResetFilters')?.addEventListener('click', () => resetFilters());

    // Live search input
    document.getElementById('reportsSearchInput')?.addEventListener('input', (e) => handleSearch(e.target.value));

    // Tab buttons
    document.querySelectorAll('.reports-nav-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Export CSV & Print
    document.getElementById('btnExportCSV')?.addEventListener('click', exportToCSV);
    document.getElementById('btnPrintReport')?.addEventListener('click', printReport);
}

/**
 * Reset All Filter Dropdowns
 */
function resetFilters() {
    ['filterAcademicYear', 'filterDepartment', 'filterProgram', 'filterSemester', 'filterFeeType', 'filterStatus', 'filterFromDate', 'filterToDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const search = document.getElementById('reportsSearchInput');
    if (search) search.value = '';

    processAndRender();
}

/**
 * Get Selected Filter Values
 */
function getFilters() {
    return {
        academicYear: document.getElementById('filterAcademicYear')?.value || '',
        department:   document.getElementById('filterDepartment')?.value || '',
        program:      document.getElementById('filterProgram')?.value || '',
        semester:     document.getElementById('filterSemester')?.value || '',
        feeType:      document.getElementById('filterFeeType')?.value || '',
        status:       document.getElementById('filterStatus')?.value || '',
        fromDate:     document.getElementById('filterFromDate')?.value || '',
        toDate:       document.getElementById('filterToDate')?.value || '',
        search:       document.getElementById('reportsSearchInput')?.value.trim().toLowerCase() || ''
    };
}

/**
 * Core Processing & Rendering Pipeline
 */
function processAndRender() {
    const filters = getFilters();
    const raw = ReportsApp.raw;

    // 1. Process JOINed Relational Data according to confirmed schema
    const collectionData = processCollectionReport(raw, filters);
    const pendingData    = processPendingReport(raw, filters);
    const paymentData    = processPaymentReport(raw, filters);
    const studentData    = processStudentWiseReport(raw, filters);
    const deptData       = processDepartmentReport(raw, filters);
    const semesterData   = processSemesterReport(raw, filters);

    ReportsApp.filteredData = {
        collection: collectionData,
        pending: pendingData,
        payment: paymentData,
        student: studentData,
        department: deptData,
        semester: semesterData
    };

    // 2. Render KPI Metrics
    renderKPICards(raw, filters);

    // 3. Render Analytics Charts
    renderAnalyticsCharts(raw, filters);

    // 4. Render Active Tab Table Data
    renderActiveTabTable();
}

// ============================================================================
// RELATIONAL JOIN ENGINES (Following Confirmed ER Relationships)
// ============================================================================

/**
 * Fee Collection Report JOIN Engine
 * fee_payments (SUCCESS) -> students -> fee_installments -> fee_assignments -> fee_structures
 */
function processCollectionReport(raw, f) {
    return raw.fee_payments
        .filter(p => p.status === 'SUCCESS')
        .map(p => {
            const student     = raw.students.find(s => s.student_id === p.student_id) || {};
            const installment = raw.fee_installments.find(i => i.installment_id === p.installment_id) || {};
            const assignment  = raw.fee_assignments.find(a => a.assignment_id === installment.assignment_id) || {};
            const structure   = raw.fee_structures.find(fs => fs.fee_structure_id === assignment.fee_structure_id) || {};

            return {
                payment_id: p.payment_id,
                installment_id: p.installment_id,
                student_id: student.student_id,
                prn: student.prn,
                full_name: `${student.full_name || ''} ${student.last_name || ''}`.trim(),
                department: student.department,
                program: student.program,
                year_semester: student.year_semester,
                fee_type: structure.fee_type || 'Academic Fee',
                academic_year: structure.academic_year || '2025-26',
                total_amount: assignment.total_amount || 0,
                amount_paid: p.amount_paid,
                payment_method: p.payment_method,
                payment_date: p.payment_date,
                status: p.status
            };
        })
        .filter(row => applyFiltersToRow(row, f));
}

/**
 * Pending Fee Report JOIN Engine
 * fee_assignments (outstanding_amount > 0 OR status != 'PAID') -> students, fee_structures
 */
function processPendingReport(raw, f) {
    return raw.fee_assignments
        .filter(a => a.outstanding_amount > 0 || a.status !== 'PAID')
        .map(a => {
            const student   = raw.students.find(s => s.student_id === a.student_id) || {};
            const structure = raw.fee_structures.find(fs => fs.fee_structure_id === a.fee_structure_id) || {};

            return {
                assignment_id: a.assignment_id,
                student_id: student.student_id,
                prn: student.prn,
                full_name: `${student.full_name || ''} ${student.last_name || ''}`.trim(),
                department: student.department,
                program: student.program,
                year_semester: student.year_semester,
                fee_type: structure.fee_type || 'Academic Fee',
                academic_year: structure.academic_year || '2025-26',
                total_amount: a.total_amount,
                paid_amount: a.paid_amount,
                outstanding_amount: a.outstanding_amount,
                due_date: a.due_date,
                status: a.status
            };
        })
        .filter(row => applyFiltersToRow(row, f));
}

/**
 * Payment / Transaction Report JOIN Engine
 * fee_payments -> students, fee_installments
 */
function processPaymentReport(raw, f) {
    return raw.fee_payments
        .map(p => {
            const student     = raw.students.find(s => s.student_id === p.student_id) || {};
            const installment = raw.fee_installments.find(i => i.installment_id === p.installment_id) || {};

            return {
                payment_id: p.payment_id,
                student_id: student.student_id,
                prn: student.prn,
                full_name: `${student.full_name || ''} ${student.last_name || ''}`.trim(),
                department: student.department,
                program: student.program,
                installment_id: p.installment_id,
                installment_number: installment.installment_number || 1,
                amount_paid: p.amount_paid,
                payment_method: p.payment_method,
                status: p.status,
                payment_date: p.payment_date
            };
        })
        .filter(row => applyFiltersToRow(row, f));
}

/**
 * Student-wise Fee Report Engine
 */
function processStudentWiseReport(raw, f) {
    return raw.students.map(s => {
        const assignments = raw.fee_assignments.filter(a => a.student_id === s.student_id);
        const payments    = raw.fee_payments.filter(p => p.student_id === s.student_id && p.status === 'SUCCESS');

        const totalAssigned   = assignments.reduce((sum, a) => sum + a.total_amount, 0);
        const totalPaid       = payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const totalOutstanding = Math.max(0, totalAssigned - totalPaid);
        const status           = totalOutstanding === 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

        return {
            student_id: s.student_id,
            prn: s.prn,
            full_name: `${s.full_name || ''} ${s.last_name || ''}`.trim(),
            department: s.department,
            program: s.program,
            year_semester: s.year_semester,
            email: s.email,
            phone: s.phone,
            total_assigned: totalAssigned,
            total_paid: totalPaid,
            outstanding_amount: totalOutstanding,
            status: status
        };
    }).filter(row => applyFiltersToRow(row, f));
}

/**
 * Department-wise Aggregation Engine
 */
function processDepartmentReport(raw, f) {
    const depts = [...new Set(raw.students.map(s => s.department))];
    return depts.map(dept => {
        const deptStudents = raw.students.filter(s => s.department === dept);
        const studentIds   = deptStudents.map(s => s.student_id);

        const deptPayments = raw.fee_payments.filter(p => studentIds.includes(p.student_id) && p.status === 'SUCCESS');
        const deptAssign   = raw.fee_assignments.filter(a => studentIds.includes(a.student_id));

        const collected   = deptPayments.reduce((sum, p) => sum + p.amount_paid, 0);
        const outstanding = deptAssign.reduce((sum, a) => sum + a.outstanding_amount, 0);
        const totalFee    = collected + outstanding;

        return {
            department: dept,
            total_students: deptStudents.length,
            total_assigned: totalFee,
            total_collected: collected,
            total_outstanding: outstanding,
            collection_percentage: totalFee > 0 ? ((collected / totalFee) * 100).toFixed(1) : '0.0'
        };
    }).filter(row => !f.department || row.department === f.department);
}

/**
 * Semester/Year-wise Aggregation Engine
 */
function processSemesterReport(raw, f) {
    const sems = [...new Set(raw.students.map(s => s.year_semester))];
    return sems.map(sem => {
        const semStudents = raw.students.filter(s => s.year_semester === sem);
        const studentIds  = semStudents.map(s => s.student_id);

        const semPayments = raw.fee_payments.filter(p => studentIds.includes(p.student_id) && p.status === 'SUCCESS');
        const semAssign   = raw.fee_assignments.filter(a => studentIds.includes(a.student_id));

        const collected   = semPayments.reduce((sum, p) => sum + p.amount_paid, 0);
        const outstanding = semAssign.reduce((sum, a) => sum + a.outstanding_amount, 0);

        return {
            year_semester: sem,
            total_students: semStudents.length,
            total_collected: collected,
            total_outstanding: outstanding
        };
    }).filter(row => !f.semester || row.year_semester === f.semester);
}

/**
 * Apply Generic Filters & Search Criteria to any row object
 */
function applyFiltersToRow(row, f) {
    if (f.academicYear && row.academic_year && row.academic_year !== f.academicYear) return false;
    if (f.department && row.department && row.department !== f.department) return false;
    if (f.program && row.program && row.program !== f.program) return false;
    if (f.semester && row.year_semester && row.year_semester !== f.semester) return false;
    if (f.feeType && row.fee_type && row.fee_type !== f.feeType) return false;
    if (f.status && row.status && row.status.toUpperCase() !== f.status.toUpperCase()) return false;

    if (f.fromDate && row.payment_date && row.payment_date < f.fromDate) return false;
    if (f.toDate && row.payment_date && row.payment_date > f.toDate) return false;

    // Search query matching
    if (f.search) {
        const str = `${row.prn || ''} ${row.full_name || ''} ${row.student_id || ''} ${row.payment_id || ''} ${row.installment_id || ''}`.toLowerCase();
        if (!str.includes(f.search)) return false;
    }

    return true;
}

// ============================================================================
// KPI CALCULATIONS & RENDERING
// ============================================================================
function renderKPICards(raw, f) {
    const collections = ReportsApp.filteredData.collection || [];
    const pendings    = ReportsApp.filteredData.pending || [];
    const payments    = ReportsApp.filteredData.payment || [];

    // 1. Total Fee Collection (SUM of successful payments)
    const totalCollection = collections.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    // 2. Total Outstanding (SUM of outstanding amount in fee_assignments)
    const totalOutstanding = pendings.reduce((sum, a) => sum + (a.outstanding_amount || 0), 0);

    // 3. Payment Success Rate (SUCCESS payments / Total attempts * 100)
    const totalAttempts = payments.length;
    const successAttempts = payments.filter(p => p.status === 'SUCCESS').length;
    const successRate = totalAttempts > 0 ? ((successAttempts / totalAttempts) * 100).toFixed(1) : '100.0';

    // 4. Pending Installments (COUNT of fee_installments where status = 'PENDING')
    const pendingInstallmentsCount = raw.fee_installments.filter(i => i.status === 'PENDING').length;

    // Update DOM KPI elements
    setElText('kpiTotalCollection', formatINR(totalCollection));
    setElText('kpiTotalOutstanding', formatINR(totalOutstanding));
    setElText('kpiSuccessRate', `${successRate}%`);
    setElText('kpiPendingInstallments', pendingInstallmentsCount.toLocaleString('en-IN'));
}

// ============================================================================
// CHARTS RENDERING (Chart.js Engine)
// ============================================================================
function renderAnalyticsCharts(raw, f) {
    if (typeof Chart === 'undefined') return;

    // A. Fee Collection Trend Chart (Monthly)
    renderTrendChart(raw);

    // B. Payment Success Rate Donut Chart
    renderSuccessRateChart(raw);

    // C. Installment Distribution Bar Chart
    renderInstallmentChart(raw);

    // D. Department-wise Collection Bar Chart
    renderDeptCollectionChart(raw);
}

function renderTrendChart(raw) {
    const ctx = document.getElementById('chartCollectionTrend')?.getContext('2d');
    if (!ctx) return;

    if (ReportsApp.charts.trend) ReportsApp.charts.trend.destroy();

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const collectedData = [12, 18, 25, 14, 30, 85, 92, 78, 45, 30, 20, 15]; // In Lakhs
    const outstandingData = [45, 40, 35, 32, 28, 15, 10, 18, 25, 30, 35, 40];

    ReportsApp.charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Fee Collection (₹ in Lakhs)',
                    data: collectedData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5
                },
                {
                    label: 'Outstanding Amount (₹ in Lakhs)',
                    data: outstandingData,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.05)',
                    fill: true,
                    tension: 0.35,
                    borderDash: [5, 5],
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderSuccessRateChart(raw) {
    const ctx = document.getElementById('chartSuccessRate')?.getContext('2d');
    if (!ctx) return;

    if (ReportsApp.charts.successRate) ReportsApp.charts.successRate.destroy();

    const payments = raw.fee_payments;
    const successCount = payments.filter(p => p.status === 'SUCCESS').length;
    const pendingCount = payments.filter(p => p.status === 'PENDING').length;
    const failedCount  = payments.filter(p => p.status === 'FAILED').length;

    ReportsApp.charts.successRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Success', 'Pending', 'Failed'],
            datasets: [{
                data: [successCount, pendingCount, failedCount],
                backgroundColor: ['#059669', '#d97706', '#dc2626'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderInstallmentChart(raw) {
    const ctx = document.getElementById('chartInstallmentDist')?.getContext('2d');
    if (!ctx) return;

    if (ReportsApp.charts.installment) ReportsApp.charts.installment.destroy();

    const instMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    raw.fee_installments.forEach(i => {
        const num = i.installment_number || 1;
        if (instMap[num] !== undefined) instMap[num]++;
    });

    ReportsApp.charts.installment = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Inst 1', 'Inst 2', 'Inst 3', 'Inst 4', 'Inst 5'],
            datasets: [{
                label: 'Number of Installments',
                data: Object.values(instMap),
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderDeptCollectionChart(raw) {
    const ctx = document.getElementById('chartDeptCollection')?.getContext('2d');
    if (!ctx) return;

    if (ReportsApp.charts.dept) ReportsApp.charts.dept.destroy();

    const deptReport = ReportsApp.filteredData.department || [];
    const labels = deptReport.map(d => d.department);
    const collectionValues = deptReport.map(d => (d.total_collected / 100000).toFixed(2)); // Lakhs

    ReportsApp.charts.dept = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Collection (₹ in Lakhs)',
                data: collectionValues,
                backgroundColor: ['#059669', '#2563eb', '#7c3aed', '#d97706', '#0891b2'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ============================================================================
// TAB NAVIGATION & TABLE RENDERING
// ============================================================================
function switchTab(tabKey) {
    ReportsApp.activeTab = tabKey;

    // Update active tab buttons
    document.querySelectorAll('.reports-nav-tabs .tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabKey) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderActiveTabTable();
}

function renderActiveTabTable() {
    const container = document.getElementById('reportsTableContainer');
    const badge = document.getElementById('tableRecordsBadge');
    if (!container) return;

    const data = ReportsApp.filteredData[ReportsApp.activeTab] || [];
    if (badge) badge.textContent = `Showing ${data.length} records`;

    if (!data.length) {
        container.innerHTML = `
            <div class="table-empty-state">
                <i class="bi bi-inbox"></i>
                <h6>No report records match the selected filters</h6>
                <p class="small text-muted mb-0">Try adjusting your filters or resetting the search query.</p>
            </div>
        `;
        return;
    }

    let html = '';
    switch (ReportsApp.activeTab) {
        case 'collection':
            html = renderCollectionTable(data);
            break;
        case 'pending':
            html = renderPendingTable(data);
            break;
        case 'payment':
            html = renderPaymentTable(data);
            break;
        case 'student':
            html = renderStudentTable(data);
            break;
        case 'department':
            html = renderDepartmentTable(data);
            break;
        case 'semester':
            html = renderSemesterTable(data);
            break;
        default:
            html = renderCollectionTable(data);
    }

    container.innerHTML = html;
}

function renderCollectionTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Payment ID</th>
                    <th>PRN / Student</th>
                    <th>Department</th>
                    <th>Program</th>
                    <th>Fee Type</th>
                    <th>Academic Year</th>
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><code>PAY-${r.payment_id}</code></td>
                        <td><strong>${r.full_name}</strong><br><span class="text-muted small">${r.prn}</span></td>
                        <td>${r.department}</td>
                        <td>${r.program}</td>
                        <td>${r.fee_type}</td>
                        <td>${r.academic_year}</td>
                        <td><strong class="text-success">${formatINR(r.amount_paid)}</strong></td>
                        <td><span class="badge bg-light text-dark border">${r.payment_method}</span></td>
                        <td>${r.payment_date}</td>
                        <td>${renderStatusPill(r.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderPendingTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Assignment ID</th>
                    <th>PRN / Student</th>
                    <th>Department</th>
                    <th>Fee Type</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Outstanding Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><code>ASG-${r.assignment_id}</code></td>
                        <td><strong>${r.full_name}</strong><br><span class="text-muted small">${r.prn}</span></td>
                        <td>${r.department}</td>
                        <td>${r.fee_type}</td>
                        <td>${formatINR(r.total_amount)}</td>
                        <td><span class="text-success">${formatINR(r.paid_amount)}</span></td>
                        <td><strong class="text-danger">${formatINR(r.outstanding_amount)}</strong></td>
                        <td>${r.due_date}</td>
                        <td>${renderStatusPill(r.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderPaymentTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Payment ID</th>
                    <th>Student Name</th>
                    <th>PRN</th>
                    <th>Installment ID</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><code>PAY-${r.payment_id}</code></td>
                        <td><strong>${r.full_name}</strong></td>
                        <td><span class="badge bg-light text-dark border">${r.prn}</span></td>
                        <td><code>INST-${r.installment_id}</code></td>
                        <td><strong>${formatINR(r.amount_paid)}</strong></td>
                        <td>${r.payment_method}</td>
                        <td>${r.payment_date}</td>
                        <td>${renderStatusPill(r.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderStudentTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Student ID</th>
                    <th>PRN</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Program / Semester</th>
                    <th>Total Assigned</th>
                    <th>Total Paid</th>
                    <th>Outstanding</th>
                    <th>Fee Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><code>STU-${r.student_id}</code></td>
                        <td><strong>${r.prn}</strong></td>
                        <td>${r.full_name}</td>
                        <td>${r.department}</td>
                        <td>${r.program}<br><span class="text-muted small">${r.year_semester}</span></td>
                        <td>${formatINR(r.total_assigned)}</td>
                        <td><span class="text-success">${formatINR(r.total_paid)}</span></td>
                        <td><strong class="${r.outstanding_amount > 0 ? 'text-danger' : 'text-muted'}">${formatINR(r.outstanding_amount)}</strong></td>
                        <td>${renderStatusPill(r.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderDepartmentTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Enrolled Students</th>
                    <th>Total Fee Assigned</th>
                    <th>Total Fee Collected</th>
                    <th>Outstanding Fee</th>
                    <th>Collection Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><strong>${r.department}</strong></td>
                        <td>${r.total_students} Students</td>
                        <td>${formatINR(r.total_assigned)}</td>
                        <td><strong class="text-success">${formatINR(r.total_collected)}</strong></td>
                        <td><strong class="text-danger">${formatINR(r.total_outstanding)}</strong></td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="progress flex-grow-1" style="height: 8px;">
                                    <div class="progress-bar bg-success" style="width: ${r.collection_percentage}%"></div>
                                </div>
                                <span class="fw-bold small">${r.collection_percentage}%</span>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderSemesterTable(data) {
    return `
        <table class="reports-data-table">
            <thead>
                <tr>
                    <th>Year / Semester</th>
                    <th>Enrolled Students</th>
                    <th>Total Collected</th>
                    <th>Total Outstanding</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td><strong>${r.year_semester}</strong></td>
                        <td>${r.total_students} Students</td>
                        <td><strong class="text-success">${formatINR(r.total_collected)}</strong></td>
                        <td><strong class="text-danger">${formatINR(r.total_outstanding)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================================
// EXPORT & PRINT UTILITIES
// ============================================================================
function handleSearch(val) {
    processAndRender();
}

function exportToCSV() {
    const data = ReportsApp.filteredData[ReportsApp.activeTab] || [];
    if (!data.length) {
        alert('No data available to export.');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(header => {
            const val = row[header] !== undefined ? row[header] : '';
            return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MMCOE_Fee_${ReportsApp.activeTab.toUpperCase()}_Report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function printReport() {
    window.print();
}

// ============================================================================
// FORMATTERS & HELPERS
// ============================================================================
function formatINR(val) {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
}

function setElText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderStatusPill(status) {
    const s = String(status || '').toUpperCase();
    let cls = 'status-pill-pending';
    if (['SUCCESS', 'PAID', 'ACTIVE'].includes(s)) cls = 'status-pill-success';
    else if (['FAILED', 'UNPAID', 'REJECTED'].includes(s)) cls = 'status-pill-failed';
    else if (['APPROVED'].includes(s)) cls = 'status-pill-approved';

    return `<span class="status-pill ${cls}">${s}</span>`;
}
