/**
 * accounts.js — Accounts Officer Dashboard
 * Fee Payment Management Platform — Milestone 1
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth('ACCOUNTS')) return;
    initDashboard();

    const page = document.body.dataset.page;
    if (page === 'accounts-dashboard') initAccountsDashboard();
    else if (page === 'accounts-profile') initAccountsProfile();
});

// ============================================================
// Accounts Dashboard
// ============================================================
async function initAccountsDashboard() {
    try {
        const result = await apiFetch('/accounts/dashboard');
        if (result && result.ok && result.data.data) {
            renderDashboard(result.data.data);
        } else {
            renderDashboard(getDummyDashboard());
        }
    } catch (e) {
        renderDashboard(getDummyDashboard());
    }
}

function renderDashboard(data) {
    // Stat cards
    setStatText('statTotalCollection', formatCurrency(data.totalFeeCollection));
    setStatText('statPendingFees',     formatCurrency(data.pendingFees));
    setStatText('statSuccessPayments', Number(data.successfulPayments).toLocaleString('en-IN'));
    setStatText('statPendingTx',       data.pendingTransactions);

    // Recent activity table
    const tbody = document.getElementById('activityTbody');
    if (tbody && data.recentActivity) {
        renderActivityTable(tbody, data.recentActivity);
    }

    // Draw chart
    drawCollectionChart(data);
}

function setStatText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderActivityTable(tbody, activities) {
    if (!activities.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No recent activity.</td></tr>`;
        return;
    }

    tbody.innerHTML = activities.map(a => `
        <tr>
            <td>
                <div class="fw-semibold" style="font-size:0.875rem;">${escHtml(a.student)}</div>
            </td>
            <td><code style="font-size:0.8rem;color:#1a56db;">${escHtml(a.prn)}</code></td>
            <td><strong>${formatCurrency(a.amount)}</strong></td>
            <td style="font-size:0.875rem;color:#6b7280;">${escHtml(a.paymentDate)}</td>
            <td>${paymentStatusBadge(a.status)}</td>
        </tr>
    `).join('');
}

function paymentStatusBadge(status) {
    const map = {
        SUCCESS: 'bg-success',
        PENDING: 'bg-warning text-dark',
        FAILED:  'bg-danger',
    };
    const cls = map[status] || 'bg-secondary';
    return `<span class="badge ${cls}" style="border-radius:30px;padding:0.35em 0.75em;">${status}</span>`;
}

// ============================================================
// Mini Bar Chart — Vanilla Canvas
// ============================================================
function drawCollectionChart(data) {
    const canvas = document.getElementById('collectionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // Monthly dummy data
    const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const collected = [1200000, 980000, 1500000, 2100000, 1750000, 1220000];
    const pending   = [300000,  200000, 180000,  100000,  250000,  395000];

    const maxVal = Math.max(...collected, ...pending) * 1.15;
    const barGroupW = Math.floor((W - 60) / months.length);
    const barW = Math.floor(barGroupW * 0.3);
    const chartTop = 20;
    const chartBottom = H - 30;
    const chartH = chartBottom - chartTop;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Y-axis gridlines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = chartBottom - (i / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(W, y);
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('₹' + formatLakh(maxVal * i / 4), 46, y + 4);
    }

    // Bars
    months.forEach((month, i) => {
        const x = 55 + i * barGroupW + barGroupW * 0.1;

        // Collected bar
        const collH = (collected[i] / maxVal) * chartH;
        ctx.fillStyle = '#1a56db';
        roundRect(ctx, x, chartBottom - collH, barW, collH, 3);
        ctx.fill();

        // Pending bar
        const pendH = (pending[i] / maxVal) * chartH;
        ctx.fillStyle = '#fbbf24';
        roundRect(ctx, x + barW + 3, chartBottom - pendH, barW, pendH, 3);
        ctx.fill();

        // Month label
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(month, x + barW + 1.5, chartBottom + 14);
    });

    // Legend
    ctx.fillStyle = '#1a56db';
    ctx.fillRect(W - 140, 8, 10, 10);
    ctx.fillStyle = '#374151';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Collected', W - 126, 17);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(W - 65, 8, 10, 10);
    ctx.fillStyle = '#374151';
    ctx.fillText('Pending', W - 51, 17);
}

function formatLakh(n) {
    if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ============================================================
// Accounts Profile
// ============================================================
async function initAccountsProfile() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const initials = document.getElementById('profileInitials');
    const name = getName() || 'Accounts Officer';
    const email = getEmail() || 'accounts@mmcoe.com';
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    if (initials) initials.textContent = getInitials(name);

    try {
        const result = await apiFetch('/accounts/profile');
        if (result && result.ok && result.data.data) {
            const p = result.data.data;
            const deptEl = document.getElementById('profileDept');
            if (deptEl) deptEl.textContent = p.department || 'Finance Department';
        }
    } catch (e) {}
}

// ============================================================
// Dummy Data
// ============================================================
function getDummyDashboard() {
    return {
        totalFeeCollection: 8250000,
        pendingFees: 1425000,
        successfulPayments: 1126,
        pendingTransactions: 42,
        recentActivity: [
            { prn: 'B25IT2001', student: 'Aarav Sharma',   amount: 15000, paymentDate: '10-Aug-2025', status: 'SUCCESS' },
            { prn: 'B25IT2002', student: 'Priya Desai',    amount: 20000, paymentDate: '09-Aug-2025', status: 'SUCCESS' },
            { prn: 'B25IT2003', student: 'Rohan Kulkarni', amount: 10000, paymentDate: '08-Aug-2025', status: 'PENDING' },
            { prn: 'B25IT2004', student: 'Sneha Patil',    amount: 25000, paymentDate: '07-Aug-2025', status: 'SUCCESS' },
            { prn: 'B25IT2005', student: 'Vikram Joshi',   amount: 18000, paymentDate: '06-Aug-2025', status: 'FAILED'  },
            { prn: 'B25IT2007', student: 'Karan Verma',    amount: 12000, paymentDate: '05-Aug-2025', status: 'SUCCESS' },
            { prn: 'B25IT2008', student: 'Divya Nair',     amount: 22000, paymentDate: '04-Aug-2025', status: 'PENDING' },
            { prn: 'B25IT2009', student: 'Arjun Rao',      amount: 15000, paymentDate: '03-Aug-2025', status: 'SUCCESS' },
        ]
    };
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
