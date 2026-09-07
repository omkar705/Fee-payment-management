/**
 * admin.js — Admin Dashboard & Student Management
 * Fee Payment Management Platform — Milestone 1
 */

// ============================================================
// Admin Dashboard Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('ADMIN')) return;
    initDashboard();
    initAddStudentModal(); // Modal form on dashboard

    const page = document.body.dataset.page;
    if (page === 'admin-dashboard') initAdminDashboard();
    else if (page === 'admin-students') initStudentsPage();
    else if (page === 'admin-add-student') initAddStudentPage();
    else if (page === 'admin-profile') initAdminProfile();
});

// ============================================================
// Admin Dashboard Stats
// ============================================================
async function initAdminDashboard() {
    try {
        const result = await apiFetch('/admin/dashboard');
        if (result && result.ok) {
            const stats = result.data.data;
            setStatValue('statTotalStudents',   stats.totalStudents   || 0);
            setStatValue('statActiveStudents',  stats.activeStudents  || 0);
            setStatValue('statPendingStudents', stats.pendingStudents  || 0);
            setStatValue('statInactiveStudents', stats.inactiveStudents || 0);
        }
    } catch (e) {
        // Use dummy data if backend unavailable
        setStatValue('statTotalStudents',   10);
        setStatValue('statActiveStudents',  9);
        setStatValue('statPendingStudents', 0);
        setStatValue('statInactiveStudents', 1);
    }

    // Load recent students table
    loadRecentStudents();
}

function setStatValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(value).toLocaleString('en-IN');
}

async function loadRecentStudents() {
    const tbody = document.getElementById('recentStudentsTbody');
    if (!tbody) return;

    try {
        const result = await apiFetch('/admin/students');
        if (result && result.ok && result.data.data) {
            const students = result.data.data.slice(0, 5);
            renderStudentRows(tbody, students);
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">
            <i class="bi bi-info-circle me-1"></i>Start the backend to see live data.
        </td></tr>`;
    }
}

function renderStudentRows(tbody, students) {
    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No students found.</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map(s => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar" style="width:32px;height:32px;font-size:0.8rem;">${getInitials(s.name)}</div>
                    <div>
                        <div class="fw-semibold" style="font-size:0.875rem;">${escHtml(s.name)}</div>
                        <div class="text-muted" style="font-size:0.75rem;">${escHtml(s.email)}</div>
                    </div>
                </div>
            </td>
            <td><code style="font-size:0.8rem;">${escHtml(s.prn)}</code></td>
            <td>${escHtml(s.department)}</td>
            <td>${escHtml(s.academicYear)}</td>
            <td>${statusBadge(s.status)}</td>
            <td>
                <div class="d-flex gap-1">
                    <a href="/admin/students.html" class="btn btn-sm btn-outline-primary" title="View"><i class="bi bi-eye"></i></a>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// Students List Page
// ============================================================
let allStudents = [];
let currentPage = 1;
const PAGE_SIZE = 8;

async function initStudentsPage() {
    await loadStudents();

    // Search
    document.getElementById('searchInput')?.addEventListener('input', debounce(filterStudents, 300));

    // Filters
    ['filterDept', 'filterYear', 'filterStatus'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', filterStudents);
    });

    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterDept').value = '';
        document.getElementById('filterYear').value = '';
        document.getElementById('filterStatus').value = '';
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
            s.name.toLowerCase().includes(search) ||
            s.prn.toLowerCase().includes(search) ||
            s.email.toLowerCase().includes(search);
        const matchDept   = !dept   || s.department === dept;
        const matchYear   = !year   || s.academicYear === year;
        const matchStatus = !status || s.status === status;
        return matchSearch && matchDept && matchYear && matchStatus;
    });

    if (resetPage) {
        currentPage = 1;
    }
    renderStudentsTable(filtered);
    updateStudentCount(filtered.length);
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTbody');
    if (!tbody) return;

    // Paginate
    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = students.slice(start, start + PAGE_SIZE);

    if (!page.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-4 d-block mb-2"></i>No students found.
        </td></tr>`;
        renderPagination(0, 0);
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
                    <button class="btn btn-sm btn-outline-primary" title="View" onclick="viewStudent(${s.id || i})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" title="Edit" onclick="editStudent(${s.id || i})">
                        <i class="bi bi-pencil"></i>
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
    const student = allStudents.find(s => s.id == id) || allStudents[id];
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
            await loadStudents();
        } else {
            showToast('Failed to update status.', 'danger');
        }
    } catch (e) {
        // Demo mode: update locally
        if (student) student.status = newStatus;
        renderStudentsTable(allStudents);
        showToast(`[Demo] Student ${action}d.`, 'success');
    }
}

function editStudent(id) {
    showToast('Edit functionality — connect backend to enable.', 'info');
}

// ============================================================
// Add Student Form
// ============================================================
function initAddStudentPage() {
    const form = document.getElementById('addStudentForm');
    if (!form) return;

    // PRN validation
    const prnInput = document.getElementById('prn');
    if (prnInput) {
        prnInput.addEventListener('input', () => {
            prnInput.value = prnInput.value.toUpperCase();
            validatePRN(prnInput);
        });
    }

    // Email validation
    const emailInput = document.getElementById('studentEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', () => validateStudentEmail(emailInput));
    }

    // Mobile validation
    const mobileInput = document.getElementById('mobile');
    if (mobileInput) {
        mobileInput.addEventListener('blur', () => validateMobile(mobileInput));
    }

    // Cancel button
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
// Admin Profile
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
// Dummy Data (for demo when backend is down)
// ============================================================
function getDummyStudents() {
    return [
        { id:1,  name: 'Manan Tote',     prn: 'B25IT2010', email: 'b25it2010@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543210', status: 'ACTIVE' },
        { id:2,  name: 'Aarav Sharma',   prn: 'B25IT2001', email: 'b25it2001@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543201', status: 'ACTIVE' },
        { id:3,  name: 'Priya Desai',    prn: 'B25IT2002', email: 'b25it2002@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543202', status: 'ACTIVE' },
        { id:4,  name: 'Rohan Kulkarni', prn: 'B25IT2003', email: 'b25it2003@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543203', status: 'ACTIVE' },
        { id:5,  name: 'Sneha Patil',    prn: 'B25IT2004', email: 'b25it2004@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543204', status: 'ACTIVE' },
        { id:6,  name: 'Vikram Joshi',   prn: 'B25IT2005', email: 'b25it2005@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543205', status: 'ACTIVE' },
        { id:7,  name: 'Ananya Mehta',   prn: 'B25IT2006', email: 'b25it2006@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543206', status: 'INACTIVE' },
        { id:8,  name: 'Karan Verma',    prn: 'B25IT2007', email: 'b25it2007@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543207', status: 'ACTIVE' },
        { id:9,  name: 'Divya Nair',     prn: 'B25IT2008', email: 'b25it2008@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543208', status: 'ACTIVE' },
        { id:10, name: 'Arjun Rao',      prn: 'B25IT2009', email: 'b25it2009@mmcoe.com', department: 'Information Technology', course: 'B.Tech', academicYear: '2025-26', mobile: '9876543209', status: 'ACTIVE' },
    ];
}

// ============================================================
// Helpers
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
// Dashboard Modal: Add Student (in admin/dashboard.html)
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
                const url = (typeof API_BASE !== 'undefined' ? API_BASE : '/api') + '/admin/students';
                const res = await fetch(url, {
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
                }, 1200);
            }
        } catch (err) {
            // Demo mode fallback
            alertEl.className = 'alert alert-success mb-3';
            alertEl.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>[Demo] <strong>${escHtml(payload.name)}</strong> (${escHtml(payload.prn)}) registered. Default password: <code>Student@123</code>`;
            alertEl.classList.remove('d-none');
            form.classList.remove('was-validated');
            form.reset();
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addStudentModal'));
                if (modal) modal.hide();
            }, 1200);
        }

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-person-plus-fill me-1"></i>Create Student Account';
    });
}
