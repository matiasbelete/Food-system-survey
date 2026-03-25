# SCF-EAT Survey Platform

A full-stack web application for conducting and managing campus food sustainability audits. Auditors fill out a 6-section survey, managers review results on an interactive dashboard, and admins manage users and data.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Installation](#4-installation)
5. [Database Setup](#5-database-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Running the Application](#7-running-the-application)
8. [Default Accounts](#8-default-accounts)
9. [Role Guide — How to Use the System](#9-role-guide--how-to-use-the-system)
10. [Features Reference](#10-features-reference)
11. [API Overview](#11-api-overview)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. System Requirements

Make sure the following are installed on your machine before starting.

| Software | Minimum Version | Download |
|---|---|---|
| Node.js | 18.x or higher | https://nodejs.org |
| npm | 9.x or higher (comes with Node) | — |
| MySQL | 8.0 or higher | https://dev.mysql.com/downloads/mysql |
| Git | Any recent version | https://git-scm.com |

To verify your versions, open a terminal and run:

```bash
node -v
npm -v
mysql --version
```

---

## 2. Technology Stack

**Backend**
- Node.js + Express 5
- MySQL 8 (via mysql2)
- JWT authentication + express-session
- bcrypt for password hashing
- nodemailer for email
- multer for file uploads
- xlsx for spreadsheet import/export

**Frontend**
- React 18
- React Router v6
- Tailwind CSS v3
- Chart.js + react-chartjs-2
- axios
- react-select, react-datepicker
- Heroicons

---

## 3. Project Structure

```
food-system-survey-platform/
├── backend/
│   ├── server.js          # Express API server (all routes)
│   ├── database.sql       # Full DB schema + seed data
│   ├── .env               # Environment variables (edit this)
│   ├── uploads/           # Uploaded files stored here
│   └── package.json
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── LoginPage.js
    │   │   ├── AuditorPage.js       # Auditor home + draft resume
    │   │   ├── SurveyForm.js        # 6-section survey form
    │   │   ├── ManagerDashboard.js  # Charts, KPIs, filters, export
    │   │   ├── AdminPage.js         # Admin home
    │   │   ├── ManageUsersPage.js   # Create/edit/delete users
    │   │   ├── ImportPage.js        # Import surveys via Excel
    │   │   ├── ProfilePage.js       # Change name/password
    │   │   └── PublicSurveyPage.js  # Public survey link
    │   ├── context/
    │   │   └── AuthContext.js       # Auth state (JWT + localStorage)
    │   ├── App.js                   # Routes
    │   └── index.js
    ├── tailwind.config.js
    └── package.json
```

---

## 4. Installation

### Step 1 — Clone or download the project

```bash
git clone <your-repo-url>
cd food-system-survey-platform
```

Or if you already have the folder, just open a terminal inside it.

### Step 2 — Install backend dependencies

```bash
cd backend
npm install
```

### Step 3 — Install frontend dependencies

```bash
cd ../frontend
npm install
```

> Both `npm install` commands will read the respective `package.json` and download all required packages into a `node_modules` folder. This may take 1–3 minutes each.

---

## 5. Database Setup

### Step 1 — Start MySQL

Make sure your MySQL server is running. On Windows you can start it from **Services** or via XAMPP/MySQL Workbench.

### Step 2 — Open a MySQL client

You can use MySQL Workbench, HeidiSQL, DBeaver, or the command line:

```bash
mysql -u root -p
```

Enter your root password when prompted.

### Step 3 — Run the schema file

```sql
SOURCE C:/Users/HP/Desktop/Projects/food-system-survey-platform/backend/database.sql;
```

Or from outside MySQL:

```bash
mysql -u root -p < backend/database.sql
```

This will:
- Create the `scf_eat_survey` database
- Create all 12 tables (surveys, audit_information, campus_information, context_metrics, checklist_responses, governance_indicators, wrap_up_responses, survey_scores, users, survey_drafts, and more)
- Insert default question categories and groups
- Create the `survey_complete_data` view
- Create the `CalculateSurveyScores` stored procedure
- Insert 3 default user accounts (admin, manager, auditor)

### Step 4 — Verify

```sql
USE scf_eat_survey;
SHOW TABLES;
SELECT email, role FROM users;
```

You should see all tables and the 3 seed users.

---

## 6. Environment Configuration

Open `backend/.env` and fill in your values:

```env
NODE_ENV=development
PORT=5000

# --- Database ---
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=scf_eat_survey
DB_PORT=3306

# --- File uploads ---
UPLOAD_PATH=./uploads

# --- JWT & Session ---
JWT_SECRET=scfeat_secret_key_2024
SESSION_SECRET=scfeat_session_secret_2024

# --- Email (optional, for password reset / notifications) ---
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=SCF-EAT Survey <your_email@gmail.com>
```

**Important notes:**

- `DB_PASSWORD` — set this to your actual MySQL password. Leave it empty (`DB_PASSWORD=`) if your MySQL has no root password.
- `JWT_SECRET` and `SESSION_SECRET` — you can change these to any long random string for better security in production.
- Email fields are optional. If you don't configure them, email features (like password reset) will silently fail but the rest of the app works fine.

**Gmail App Password setup (if you want email):**
1. Go to your Google Account → Security → 2-Step Verification (must be enabled)
2. Go to Security → App passwords
3. Generate a password for "Mail" and paste it into `EMAIL_PASS`

---

## 7. Running the Application

You need **two terminals open at the same time** — one for the backend, one for the frontend.

### Terminal 1 — Start the backend

```bash
cd backend
npm start
```

You should see:
```
Server running on port 5000
Database connected successfully
```

The backend runs at: `http://localhost:5000`

### Terminal 2 — Start the frontend

```bash
cd frontend
npm start
```

React will compile and automatically open your browser at: `http://localhost:3000`

> Both servers must be running at the same time for the app to work. The frontend calls the backend at `http://localhost:5000`.

---

## 8. Default Accounts

These accounts are created automatically when you run `database.sql`.

| Role | Email | Password |
|---|---|---|
| Admin | admin@scfeat.com | password |
| Manager | manager@scfeat.com | password |
| Auditor | auditor1@scfeat.com | password |

> Change these passwords immediately after first login via the Profile page.

---

## 9. Role Guide — How to Use the System

### Auditor

Auditors fill out campus food sustainability surveys and can save drafts.

**Login → automatically redirected to `/auditor`**

1. **Fill a new survey** — Click "Start New Survey". The form has 6 sections:
   - Section 1: Auditor & Audit Information (name, email, affiliation, date, times, training, info sources, assessment round)
   - Section 2: Campus Information (university name, city, province/state, institution type, campus setting, provider types)
   - Section 3: Context Metrics (venue counts, nutritional options, headcount, sales figures)
   - Section 4: Checklist Questions (14 Yes/No governance questions)
   - Section 5: Governance Indicators (17 questions rated 0–4)
   - Section 6: Wrap-up (info source percentages summing to 100%, confidence level, constraints, factors)

2. **Navigate sections** — Use "Next Section" / "Previous" buttons. Completed sections show a green checkmark. You cannot skip ahead past an incomplete section.

3. **Save a draft** — Click "Save Draft" at any point. Your progress is saved to the server and tied to your account.

4. **Resume a draft** — If you have a saved draft, a banner appears on the Auditor page. Click "Resume Draft" to reload your saved data and continue from where you left off.

5. **Submit** — On Section 6, click "Submit Survey". On success, a full-page confirmation screen appears with options to "Submit Another" or "Go to Dashboard".

---

### Manager

Managers view submitted survey data through an interactive dashboard.

**Login → automatically redirected to `/manager`**

1. **KPI Cards** — Top row shows total surveys, average score, top-performing region, and most common campus setting — all computed from the currently filtered data.

2. **Charts** — Three charts update based on active filters:
   - Performance Rating distribution (Doughnut)
   - Campus Setting breakdown (Bar)
   - Institution Type breakdown (Bar)

3. **Filters** — Click "Filters" to open the filter panel. Available filters:
   - Year (converts to date range automatically)
   - Date From / Date To (clears Year if set)
   - Region (Province/State)
   - Institution Type (Public / Private)
   - Performance Rating (Excellent / Good / Fair / Needs Improvement / Poor)
   - Campus Setting
   - Respondent Type / Semester (Fall / Winter / Summer)
   - Assessment Round (First-time / Second / Third+)

   Filters use a two-step pattern: edit in the panel → click **Apply Filters** to activate. Click **Clear** to reset all filters.

4. **Survey Table** — Scrollable table of all matching surveys with columns for university, date, score, rating, region, and more.

5. **Export CSV** — Click "Export CSV" (or "Export Filtered CSV" when filters are active) to download a CSV file of all currently visible rows.

---

### Admin

Admins have full access to all features plus user management and data import.

**Login → automatically redirected to `/admin`**

1. **Dashboard** — Overview cards with quick links to all admin functions.

2. **Manage Users** (`/admin/users`):
   - View all users with their role and status
   - Create new users (name, email, password, role)
   - Edit existing users (change name, email, role, active status)
   - Delete users
   - Reset passwords

3. **Import Legacy Data** (`/admin/import-legacy`):
   - Upload an Excel (.xlsx) file to bulk-import historical survey records
   - Download the import template to see the expected column format
   - Review import results (success count, error rows)

4. **Manager Dashboard** — Admins can also access `/manager` to view the full analytics dashboard.

5. **Profile** (`/profile`) — Change your display name or password.

---

### Public Survey (No Login Required)

A public survey link can be shared with external respondents.

- URL: `http://localhost:3000/fill-survey`
- Or with a token: `http://localhost:3000/survey/:token`

This renders the same SurveyForm without requiring authentication. Submissions go directly into the database.

---

## 10. Features Reference

| Feature | Where |
|---|---|
| 6-section survey form with validation | `/auditor` → Start New Survey |
| Save & resume draft | `/auditor` → Save Draft / Resume Draft banner |
| Full-page submit success screen | After submitting a survey |
| Time validation (end must be after start) | Section 1 of survey form |
| Interactive filter panel (8 filters) | `/manager` → Filters button |
| Charts from filtered data (no extra API call) | `/manager` dashboard |
| Export filtered CSV | `/manager` → Export CSV button |
| User management (CRUD) | `/admin/users` |
| Excel bulk import | `/admin/import-legacy` |
| Role-based route protection | All routes |
| JWT + session auth | Login / logout |
| Profile / password change | `/profile` |
| Public survey link | `/fill-survey` |

---

## 11. API Overview

All API endpoints are served from `http://localhost:5000`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login, returns JWT |
| POST | `/api/auth/logout` | JWT | Logout |
| GET | `/api/auth/session` | JWT | Check session validity |
| GET | `/api/surveys` | JWT | List surveys (supports filters) |
| POST | `/api/surveys` | None | Submit a new survey |
| GET | `/api/surveys/:id` | JWT | Get single survey |
| DELETE | `/api/surveys/:id` | Admin | Delete a survey |
| GET | `/api/stats` | JWT | Aggregate stats |
| GET | `/api/drafts` | JWT | Get current user's draft |
| POST | `/api/drafts` | JWT | Save/update draft |
| DELETE | `/api/drafts` | JWT | Delete draft after submit |
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create user |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| POST | `/api/import` | Admin | Import Excel file |
| GET | `/api/profile` | JWT | Get own profile |
| PUT | `/api/profile` | JWT | Update own profile |

---

## 12. Troubleshooting

**`Error: connect ECONNREFUSED 127.0.0.1:3306`**
MySQL is not running. Start your MySQL service and try again.

**`ER_ACCESS_DENIED_ERROR`**
Wrong DB_USER or DB_PASSWORD in `.env`. Double-check your MySQL credentials.

**`ER_BAD_DB_ERROR: Unknown database 'scf_eat_survey'`**
You haven't run `database.sql` yet. Follow Step 5 above.

**Frontend shows blank page or "Cannot GET /"**
Make sure the frontend dev server is running (`npm start` in the `frontend` folder).

**"Network Error" or API calls failing**
The backend is not running. Open a terminal in the `backend` folder and run `npm start`.

**Port 3000 or 5000 already in use**
Another process is using that port. Either stop it, or change `PORT=5001` in `.env` and update the `axios` base URLs in the frontend source files accordingly.

**Styles not loading / Tailwind not working**
Run `npm install` again in the `frontend` folder. If still broken, delete `node_modules` and `package-lock.json` then re-run `npm install`.

**Draft not loading after "Resume Draft"**
Make sure you are logged in as the same user who saved the draft. Drafts are tied to user accounts.

**Excel import fails**
Make sure your file uses the `.xlsx` format and matches the expected column headers. Download the template from the Import page first.

---

## Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] MySQL 8+ installed and running
- [ ] `cd backend && npm install`
- [ ] `cd frontend && npm install`
- [ ] `database.sql` imported into MySQL
- [ ] `backend/.env` updated with your DB password
- [ ] `cd backend && npm start` (Terminal 1)
- [ ] `cd frontend && npm start` (Terminal 2)
- [ ] Open `http://localhost:3000` and log in with `admin@scfeat.com` / `password`
