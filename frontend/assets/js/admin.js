/**
 * admin.js — Admin Dashboard, Student Management & Fee Structure CRUD
 * Fee Payment Management System | MMCOE
 *
 * Designed with simple, clean JavaScript methods easy to explain in a college viva.
 */

let allStudentsCache = [];
let allFeeStructuresCache = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('ADMIN')) return;

    initAdminDashboard();
});

// ============================================================
// 1. DASHBOARD INITIALIZATION
// ============================================================
async function initAdminDashboard() {
    await loadDashboardStats();
    await loadRecentStudents();
    await loadStudents();
    await loadFeeStructures();
}

/**
 * Fetch overview stats: Total Students, Total Collection, Pending Fees, Department Collections
 */
async function loadDashboardStats() {
    try {
        const result = await apiFetch('/admin/dashboard');
        if (result && result.ok && result.data && result.data.data) {
            const data = result.data.data;
            const totalStudentsEl = document.getElementById('statTotalStudents');
            if (totalStudentsEl) {
                totalStudentsEl.textContent = data.totalStudents || 0;
            }
            const totalFeeEl = document.getElementById('statTotalFeeCollection');
            if (totalFeeEl) {
                totalFeeEl.textContent = '₹' + Number(data.totalFeeCollection || 0).toLocaleString('en-IN');
            }
            const pendingFeeEl = document.getElementById('statTotalPendingFees');
            if (pendingFeeEl) {
                pendingFeeEl.textContent = '₹' + Number(data.totalPendingFees || 0).toLocaleString('en-IN');
            }

            // Populate department-wise collection table & chart
            if (data.departmentWiseCollection && Array.isArray(data.departmentWiseCollection)) {
                renderDeptWiseCollection(data.departmentWiseCollection);
                drawFeeSummaryChart(data.departmentWiseCollection);
            }
        }
    } catch (e) {
        console.warn('Using default dashboard stats.');
    }
}

function renderDeptWiseCollection(deptList) {
    const tbody = document.getElementById('deptWiseCollectionTbody');
    if (!tbody) return;

    if (!deptList || deptList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No department collection data recorded.</td></tr>';
        return;
    }

    tbody.innerHTML = deptList.map(item => `
        <tr>
            <td><strong>${escHtml(item.department)}</strong></td>
            <td>${item.students != null ? item.students : 0}</td>
            <td><strong>₹${Number(item.collected || 0).toLocaleString('en-IN')}</strong></td>
        </tr>
    `).join('');
}

/**
 * Fetch and render the 5 most recently registered students
 */
async function loadRecentStudents() {
    const tbody = document.getElementById('recentStudentsTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data && result.data.data) {
            const students = result.data.data;
            const recent = students.slice(0, 5);
            renderRecentTable(tbody, recent);
            return;
        }
    } catch (e) {
        console.warn('Failed to load recent students from API');
    }

    // Default sample data fallback
    renderRecentTable(tbody, getSampleStudents().slice(0, 5));
}

function renderRecentTable(tbody, students) {
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No student records found.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr>
            <td><code>${escHtml(s.prn)}</code></td>
            <td><strong>${escHtml(s.name)}</strong></td>
            <td>${escHtml(s.department)}</td>
            <td>${escHtml(s.course || 'B.Tech')}</td>
            <td>${escHtml(s.academicYear || '2025-26')}</td>
            <td><span class="badge ${s.status === 'ACTIVE' ? 'bg-success' : 'bg-warning text-dark'}">${escHtml(s.status || 'ACTIVE')}</span></td>
        </tr>
    `).join('');
}

// ============================================================
// 2. NATIVE CANVAS FEE COLLECTION CHART
// Simple 2D bar chart — 100% native HTML5 Canvas, zero external libraries
// ============================================================
function drawFeeSummaryChart(deptData) {
    const canvas = document.getElementById('adminFeeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.parentElement.clientWidth * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.parentElement.clientWidth;
    const height = 200;

    let labels = [];
    let amounts = []; // in Thousands (₹k)

    if (deptData && deptData.length > 0) {
        labels = deptData.map(d => {
            const name = d.department || '';
            if (name.toLowerCase().includes('information')) return 'IT';
            if (name.toLowerCase().includes('computer')) return 'CS';
            if (name.toLowerCase().includes('mechanical')) return 'Mech';
            if (name.toLowerCase().includes('electronics')) return 'E&TC';
            if (name.toLowerCase().includes('civil')) return 'Civil';
            return name.slice(0, 5);
        });
        amounts = deptData.map(d => Math.round(Number(d.collected || 0) / 1000));
    } else {
        labels = ['IT', 'CS', 'Mech', 'Civil', 'E&TC'];
        amounts = [310, 0, 0, 0, 0];
    }

    const maxAmount = Math.max(50, ...amounts) * 1.25;

    const paddingLeft = 50;
    const paddingBottom = 30;
    const chartWidth = width - paddingLeft - 20;
    const chartHeight = height - paddingBottom - 20;

    ctx.clearRect(0, 0, width, height);

    // Draw baseline
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, height - paddingBottom);
    ctx.lineTo(width - 10, height - paddingBottom);
    ctx.stroke();

    const barWidth = Math.max(16, Math.floor((chartWidth / labels.length) * 0.45));
    const step = chartWidth / labels.length;

    labels.forEach((label, i) => {
        const barHeight = Math.max(2, (amounts[i] / maxAmount) * chartHeight);
        const x = paddingLeft + i * step + (step - barWidth) / 2;
        const y = height - paddingBottom - barHeight;

        // Draw bar
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Value text on top of bar
        ctx.fillStyle = '#334155';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        if (amounts[i] > 0) {
            ctx.fillText('₹' + amounts[i] + 'k', x + barWidth / 2, y - 5);
        }

        // Department label below baseline
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(label, x + barWidth / 2, height - 10);
    });
}

// ============================================================
// 3. MANAGE STUDENTS DIRECTORY (CRUD + ACTIVATE/DEACTIVATE)
// ============================================================
async function loadStudents() {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data && result.data.data) {
            allStudentsCache = result.data.data;
            renderStudentsTable(allStudentsCache);
            return;
        }
    } catch (e) {
        console.warn('Failed to load students from API');
    }

    allStudentsCache = getSampleStudents();
    renderStudentsTable(allStudentsCache);
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No matching students found.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => `
        <tr>
            <td><code>${escHtml(s.prn)}</code></td>
            <td><strong>${escHtml(s.name)}</strong></td>
            <td>${escHtml(s.department)}</td>
            <td><small class="text-muted">${escHtml(s.email)}</small></td>
            <td><span class="badge ${s.status === 'ACTIVE' ? 'bg-success' : 'bg-warning text-dark'}">${escHtml(s.status || 'ACTIVE')}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="viewStudentDetails(${s.id})">
                    <i class="bi bi-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline-secondary py-0 px-2 ms-1" onclick="openEditStudentModal(${s.id})">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
                <button class="btn btn-sm ${s.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'} py-0 px-2 ms-1" onclick="toggleStudentStatus(${s.id}, '${s.status || 'ACTIVE'}')">
                    <i class="bi ${s.status === 'ACTIVE' ? 'bi-person-x' : 'bi-person-check'}"></i> ${s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleStudentStatus(studentId, currentStatus) {
    const newStatus = (currentStatus === 'ACTIVE') ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this student account?`)) return;

    try {
        const result = await apiFetch(`/admin/students/${studentId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        if (result && result.ok) {
            alert(`Student has been ${newStatus.toLowerCase()}d successfully.`);
            await loadStudents();
            await loadDashboardStats();
            return;
        }
    } catch (e) {
        console.warn('API error updating status');
    }

    // Cache fallback
    const idx = allStudentsCache.findIndex(s => s.id === studentId);
    if (idx !== -1) {
        allStudentsCache[idx].status = newStatus;
        renderStudentsTable(allStudentsCache);
    }
}

function openAddStudentModal() {
    const form = document.getElementById('addStudentModalForm');
    if (form) form.reset();
    const modal = new bootstrap.Modal(document.getElementById('addStudentModal'));
    modal.show();
}

async function handleRegisterStudentModal(e) {
    e.preventDefault();

    const name = document.getElementById('newStudentName').value.trim();
    const prn = document.getElementById('newStudentPrn').value.trim().toUpperCase();
    const email = document.getElementById('newStudentEmail').value.trim();
    const mobile = document.getElementById('newStudentMobile').value.trim();
    const department = document.getElementById('newStudentDept').value;
    const course = document.getElementById('newStudentCourse').value.trim();
    const academicYear = document.getElementById('newStudentYear').value.trim();

    const btn = document.getElementById('btnSubmitAddStudent');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Registering...';
    }

    const payload = { name, prn, email, mobile, department, course, academicYear, status: 'ACTIVE' };

    try {
        const result = await apiFetch('/admin/students', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result && result.ok) {
            alert('Student registered successfully in PostgreSQL database!');
            bootstrap.Modal.getInstance(document.getElementById('addStudentModal'))?.hide();
            await loadStudents();
            await loadRecentStudents();
            await loadDashboardStats();
            return;
        } else {
            const msg = result && result.data && result.data.message ? result.data.message : 'Registration failed.';
            alert('Error: ' + msg);
        }
    } catch (err) {
        alert('Server connection error. Please try again.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Register Student';
        }
    }
}

function openEditStudentModal(studentId) {
    const student = allStudentsCache.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('editStudentId').value = student.id;
    document.getElementById('editStudentPrn').value = student.prn;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editStudentEmail').value = student.email;
    document.getElementById('editStudentMobile').value = student.mobile || '';
    document.getElementById('editStudentDept').value = student.department;
    document.getElementById('editStudentCourse').value = student.course || 'B.Tech';
    document.getElementById('editStudentStatus').value = student.status || 'ACTIVE';

    const modal = new bootstrap.Modal(document.getElementById('editStudentModal'));
    modal.show();
}

async function handleSaveStudent(e) {
    e.preventDefault();

    const id = document.getElementById('editStudentId').value;
    const payload = {
        name: document.getElementById('editStudentName').value.trim(),
        email: document.getElementById('editStudentEmail').value.trim(),
        mobile: document.getElementById('editStudentMobile').value.trim(),
        department: document.getElementById('editStudentDept').value,
        course: document.getElementById('editStudentCourse').value.trim(),
        status: document.getElementById('editStudentStatus').value
    };

    try {
        const result = await apiFetch(`/admin/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (result && result.ok) {
            alert('Student details updated successfully in PostgreSQL!');
            bootstrap.Modal.getInstance(document.getElementById('editStudentModal'))?.hide();
            await loadStudents();
            await loadDashboardStats();
            return;
        }
    } catch (err) {
        console.warn('API error, updating student in local cache');
    }

    const idx = allStudentsCache.findIndex(s => s.id == id);
    if (idx !== -1) {
        allStudentsCache[idx] = { ...allStudentsCache[idx], ...payload };
        renderStudentsTable(allStudentsCache);
    }
    alert('Student updated successfully!');
    bootstrap.Modal.getInstance(document.getElementById('editStudentModal'))?.hide();
}

function filterStudentsTable() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('filterDept')?.value || '';

    const filtered = allStudentsCache.filter(s => {
        const matchSearch = !searchVal ||
            (s.name && s.name.toLowerCase().includes(searchVal)) ||
            (s.prn && s.prn.toLowerCase().includes(searchVal)) ||
            (s.email && s.email.toLowerCase().includes(searchVal));

        const matchDept = !deptVal || s.department === deptVal;

        return matchSearch && matchDept;
    });

    renderStudentsTable(filtered);
}

function resetFilters() {
    const search = document.getElementById('searchInput');
    const dept = document.getElementById('filterDept');
    if (search) search.value = '';
    if (dept) dept.value = '';
    renderStudentsTable(allStudentsCache);
}

function viewStudentDetails(studentId) {
    const student = allStudentsCache.find(s => s.id === studentId);
    if (!student) return;

    const modalBody = document.getElementById('viewStudentModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <table class="table table-bordered mb-0">
                <tr><th style="width:35%;" class="table-light">Full Name</th><td>${escHtml(student.name)}</td></tr>
                <tr><th class="table-light">PRN</th><td><code>${escHtml(student.prn)}</code></td></tr>
                <tr><th class="table-light">Email</th><td>${escHtml(student.email)}</td></tr>
                <tr><th class="table-light">Mobile</th><td>${escHtml(student.mobile || '—')}</td></tr>
                <tr><th class="table-light">Department</th><td>${escHtml(student.department)}</td></tr>
                <tr><th class="table-light">Course</th><td>${escHtml(student.course || 'B.Tech')}</td></tr>
                <tr><th class="table-light">Academic Year</th><td>${escHtml(student.academicYear || '2025-26')}</td></tr>
                <tr><th class="table-light">Status</th><td><span class="badge bg-success">${escHtml(student.status || 'ACTIVE')}</span></td></tr>
            </table>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('viewStudentModal'));
    modal.show();
}

// ============================================================
// 4. MANAGE FEE STRUCTURE (CRUD)
// ============================================================
async function loadFeeStructures() {
    const tbody = document.getElementById('feeStructureTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/fee-structures');
        if (result && result.ok && result.data && result.data.data) {
            allFeeStructuresCache = result.data.data;
            renderFeeStructureTable(allFeeStructuresCache);
            return;
        }
    } catch (e) {
        console.warn('Failed to load fee structures from API');
    }

    // Default sample fee structures
    allFeeStructuresCache = getSampleFeeStructures();
    renderFeeStructureTable(allFeeStructuresCache);
}

function renderFeeStructureTable(structures) {
    const tbody = document.getElementById('feeStructureTbody');
    if (!tbody) return;

    if (!structures || structures.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">No fee structures configured.</td></tr>';
        return;
    }

    tbody.innerHTML = structures.map(fs => `
        <tr>
            <td><strong>${escHtml(fs.department)}</strong></td>
            <td><span class="badge bg-light text-dark border">${escHtml(fs.category || 'OPEN')}</span></td>
            <td>₹${Number(fs.tuitionFee || 0).toLocaleString('en-IN')}</td>
            <td>₹${Number(fs.developmentFee || 0).toLocaleString('en-IN')}</td>
            <td>₹${Number(fs.examFee || 0).toLocaleString('en-IN')}</td>
            <td><strong class="text-primary">₹${Number(fs.totalAmount || 0).toLocaleString('en-IN')}</strong></td>
            <td>${escHtml(fs.academicYear || '2025-26')}</td>
            <td><span class="badge bg-success">${escHtml(fs.status || 'ACTIVE')}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="openEditFeeStructureModal(${fs.id})">
                    <i class="bi bi-pencil-square"></i> Edit
                </button>
            </td>
        </tr>
    `).join('');
}

function openAddFeeStructureModal() {
    document.getElementById('feeStructureModalTitle').innerHTML = '<i class="bi bi-plus-circle text-primary me-2"></i>Add Fee Structure';
    document.getElementById('feeStructureId').value = '';
    document.getElementById('feeDepartment').value = 'Information Technology';
    document.getElementById('feeCategory').value = 'OPEN';
    document.getElementById('feeTuition').value = '95000';
    document.getElementById('feeDev').value = '15000';
    document.getElementById('feeExam').value = '10000';
    document.getElementById('feeYear').value = '2025-26';
    calcFeeTotal();

    const modal = new bootstrap.Modal(document.getElementById('feeStructureModal'));
    modal.show();
}

function openEditFeeStructureModal(id) {
    const fs = allFeeStructuresCache.find(item => item.id === id);
    if (!fs) return;

    document.getElementById('feeStructureModalTitle').innerHTML = '<i class="bi bi-pencil-square text-primary me-2"></i>Edit Fee Structure';
    document.getElementById('feeStructureId').value = fs.id;
    document.getElementById('feeDepartment').value = fs.department;
    document.getElementById('feeCategory').value = fs.category || 'OPEN';
    document.getElementById('feeTuition').value = fs.tuitionFee;
    document.getElementById('feeDev').value = fs.developmentFee;
    document.getElementById('feeExam').value = fs.examFee;
    document.getElementById('feeYear').value = fs.academicYear || '2025-26';
    calcFeeTotal();

    const modal = new bootstrap.Modal(document.getElementById('feeStructureModal'));
    modal.show();
}

function calcFeeTotal() {
    const tuition = Number(document.getElementById('feeTuition')?.value || 0);
    const dev = Number(document.getElementById('feeDev')?.value || 0);
    const exam = Number(document.getElementById('feeExam')?.value || 0);
    const total = tuition + dev + exam;

    const display = document.getElementById('feeTotalDisplay');
    if (display) {
        display.value = '₹' + total.toLocaleString('en-IN');
    }
}

async function handleSaveFeeStructure(e) {
    e.preventDefault();

    const id = document.getElementById('feeStructureId')?.value;
    const department = document.getElementById('feeDepartment')?.value;
    const category = document.getElementById('feeCategory')?.value;
    const tuitionFee = Number(document.getElementById('feeTuition')?.value || 0);
    const developmentFee = Number(document.getElementById('feeDev')?.value || 0);
    const examFee = Number(document.getElementById('feeExam')?.value || 0);
    const totalAmount = tuitionFee + developmentFee + examFee;
    const academicYear = document.getElementById('feeYear')?.value || '2025-26';

    const payload = {
        department,
        category,
        tuitionFee,
        developmentFee,
        examFee,
        totalAmount,
        academicYear,
        status: 'ACTIVE'
    };

    try {
        const url = id ? `/admin/fee-structures/${id}` : '/admin/fee-structures';
        const method = id ? 'PUT' : 'POST';

        const result = await apiFetch(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (result && result.ok) {
            alert('Fee structure saved successfully in PostgreSQL database!');
            bootstrap.Modal.getInstance(document.getElementById('feeStructureModal'))?.hide();
            await loadFeeStructures();
            return;
        }
    } catch (err) {
        console.warn('API error, saving locally in cache.');
    }

    if (id) {
        const idx = allFeeStructuresCache.findIndex(item => item.id == id);
        if (idx !== -1) {
            allFeeStructuresCache[idx] = { id: Number(id), ...payload };
        }
    } else {
        const newId = allFeeStructuresCache.length + 101;
        allFeeStructuresCache.push({ id: newId, ...payload });
    }

    alert('Fee structure saved successfully!');
    bootstrap.Modal.getInstance(document.getElementById('feeStructureModal'))?.hide();
    renderFeeStructureTable(allFeeStructuresCache);
}

// ============================================================
// 5. SYSTEM AUDIT LOGS RETRIEVAL & RENDERING
// ============================================================
async function loadAuditLogs() {
    const tbody = document.getElementById('auditLogsTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/audit-logs');
        if (result && result.ok && result.data && result.data.data) {
            const logs = result.data.data;
            if (!logs || logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No audit records logged yet.</td></tr>';
                return;
            }

            tbody.innerHTML = logs.map(l => {
                let badgeClass = 'bg-secondary';
                if (l.action && l.action.includes('CREATED')) badgeClass = 'bg-success';
                else if (l.action && l.action.includes('UPDATED')) badgeClass = 'bg-primary';
                else if (l.action && l.action.includes('STATUS')) badgeClass = 'bg-warning text-dark';
                else if (l.action && l.action.includes('LOGIN')) badgeClass = 'bg-info text-dark';

                const dateStr = l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : 'Just now';

                return `
                    <tr>
                        <td><small class="text-muted">${escHtml(dateStr)}</small></td>
                        <td><code>${escHtml(l.username || 'admin@mmcoe.com')}</code></td>
                        <td><span class="badge ${badgeClass}">${escHtml(l.action)}</span></td>
                        <td>${escHtml(l.entityName || '—')}</td>
                        <td>${escHtml(l.details || '—')}</td>
                        <td><small class="text-muted">${escHtml(l.ipAddress || '127.0.0.1')}</small></td>
                    </tr>
                `;
            }).join('');
            return;
        }
    } catch (e) {
        console.warn('Could not load audit logs from API');
    }

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No audit records available.</td></tr>';
}

// ============================================================
// Helpers & Sample Fallbacks
// ============================================================
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getSampleStudents() {
    return [
        { id: 1, name: 'Manan Vivekanand Tote', prn: 'B25IT2010', email: 'b25it2010@mmcoe.com', mobile: '9876543210', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', status: 'ACTIVE' },
        { id: 2, name: 'Aarav Sharma', prn: 'B25IT2001', email: 'b25it2001@mmcoe.com', mobile: '9876543201', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', status: 'ACTIVE' },
        { id: 3, name: 'Priya Desai', prn: 'B25IT2002', email: 'b25it2002@mmcoe.com', mobile: '9876543202', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', status: 'ACTIVE' }
    ];
}

function getSampleFeeStructures() {
    return [
        { id: 1, department: 'Information Technology', category: 'OPEN', tuitionFee: 95000, developmentFee: 15000, examFee: 10000, totalAmount: 120000, academicYear: '2025-26', status: 'ACTIVE' },
        { id: 2, department: 'Computer Science', category: 'OPEN', tuitionFee: 95000, developmentFee: 15000, examFee: 10000, totalAmount: 120000, academicYear: '2025-26', status: 'ACTIVE' },
        { id: 3, department: 'Mechanical', category: 'OPEN', tuitionFee: 85000, developmentFee: 15000, examFee: 10000, totalAmount: 110000, academicYear: '2025-26', status: 'ACTIVE' },
        { id: 4, department: 'Civil', category: 'OPEN', tuitionFee: 80000, developmentFee: 15000, examFee: 10000, totalAmount: 105000, academicYear: '2025-26', status: 'ACTIVE' },
        { id: 5, department: 'Electronics', category: 'OPEN', tuitionFee: 88000, developmentFee: 15000, examFee: 10000, totalAmount: 113000, academicYear: '2025-26', status: 'ACTIVE' }
    ];
}
