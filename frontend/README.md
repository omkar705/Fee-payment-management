# Frontend — Fee Payment Management Platform

This is the frontend module for the **MMCOE Fee Payment Management Platform** (Milestone 1).

## 🛠️ Technology Stack

- **HTML5** & **CSS3**
- **Bootstrap 5.3.3** (Responsive Framework)
- **Bootstrap Icons 1.11.3**
- **Vanilla JavaScript** (ES6+, `fetch` API)
- *Strictly No React, Angular, Vue, or Tailwind CSS*

---

## 📁 Directory Structure

```
frontend/
├── index.html                 # Main redirect based on authentication
├── login.html                 # Enterprise-grade Login page
├── forgot-password.html       # Forgot & Reset Password Flow
│
├── admin/                     # Administrator Module
│   ├── dashboard.html         # Admin Dashboard with live stats & quick actions
│   ├── students.html          # Student Management Table (Search, Filter, Pagination)
│   ├── add-student.html       # Add Student Form with strict validation
│   └── profile.html           # Administrator Profile
│
├── accounts/                  # Accounts Officer Module
│   ├── dashboard.html         # Accounts Dashboard, Chart & Recent Activity
│   └── profile.html           # Accounts Officer Profile
│
├── student/                   # Student Module
│   ├── dashboard.html         # Student Fee Summary & Payment History
│   └── profile.html           # Student Academic Profile
│
└── assets/
    ├── css/
    │   ├── style.css          # Design Tokens, typography, utility classes
    │   ├── login.css          # Login & Forgot Password aesthetics
    │   └── dashboard.css      # Sidebar, topbar, responsive layout & cards
    ├── js/
    │   ├── auth.js            # JWT handling, auth guards, login/forgot handlers
    │   ├── admin.js           # Admin APIs, student table rendering, validation
    │   ├── accounts.js        # Accounts APIs, canvas bar chart rendering
    │   └── student.js         # Student dashboard & profile data rendering
    └── images/
        └── college-logo.png   # (Optional) College Logo File
```

---

## 🖼️ How to Add or Change College Logo

1. Prepare your college logo image (PNG or JPG, square aspect ratio recommended).
2. Save or copy it to:
   ```
   frontend/assets/images/college-logo.png
   ```
3. Refresh your browser on the login page (`login.html`).
4. **Fallback Behavior**: If `college-logo.png` is absent or deleted, an automated stylized icon placeholder with "College Logo" text is rendered automatically without broken image icons.

---

## 🚀 How to Run the Frontend

### Option 1: Live Server in VS Code (Recommended)
1. Open the project folder in VS Code.
2. Install the **Live Server** extension (`ritwickdey.liveserver`).
3. Right-click on `frontend/login.html` and click **"Open with Live Server"**.
4. Access at `http://127.0.0.1:5500/login.html`.

### Option 2: Python Simple HTTP Server
Run from the root or frontend directory:
```bash
cd frontend
python3 -m http.server 3000
```
Open [http://localhost:3000/login.html](http://localhost:3000/login.html).

### Option 3: Direct Browser File Opening
Open `frontend/login.html` directly in your browser. *(Note: Opening as a local file might cause CORS blocks on some browsers if connecting to the live API; using a local HTTP server like Live Server or Python is recommended).*

---

## 🔐 Demo Credentials (Milestone 1)

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@mmcoe.com` | `Admin@123` |
| **Accounts Officer** | `accounts@mmcoe.com` | `Accounts@123` |
| **Student** | `b25it2010@mmcoe.com` | `Student@123` |

---

## 🎯 Validation Rules Enforced in UI

1. **Student Email**: Must end with `@mmcoe.com` (e.g. `b25it2010@mmcoe.com`).
2. **Student PRN**: Must match format `B + 2 digits + Dept Code + 4 digits` (e.g. `B25IT2010`).
3. **Mobile Number**: Must be a valid 10-digit Indian mobile number starting with `6-9`.
4. **Role Match**: Selected role in login dropdown must match user account role.
