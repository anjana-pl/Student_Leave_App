# Student Leave Request & Approval Management System

A production-grade, secure, multi-stakeholder digital leave management web application developed for colleges to replace paper forms and informal messaging (e.g., WhatsApp).

---

## 🏛️ System Architecture

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (No React, Angular, Vue, or heavy frameworks). Clean, accessible, responsive design tailored for mobile and desktop screens.
- **Backend:** Node.js, Express.js, RESTful API architecture.
- **Database:** MongoDB (with Mongoose ODM schemas).
- **Authentication:** Role-Based Access Control (RBAC) with JWT tokens and bcrypt password hashing.

---

## 🔒 Core Security & Business Rules (Server-Enforced)

1. **Strict Identity Binding:**
   - The backend *never* trusts a Student ID passed in the request body.
   - The user identity is cryptographically resolved from the authenticated JWT token.
   - If a request attempts to spoof or send a different `studentId`, the server immediately rejects the request with a security violation alert (`validateLeave.js`).

2. **Advance Submission Deadline:**
   - Normal leave requests must be submitted at least **12 hours** prior to the departure time (configurable by administrators).
   - Time calculations are performed against the trusted server clock (`Date.now()`), rendering frontend device time tampering ineffective.

3. **Past Date Rejection:**
   - Leave start dates earlier than today's server date are strictly blocked, preventing fraudulent retroactive leave applications.

4. **Duplicate & Overlap Prevention:**
   - The database is scanned for any existing `Pending` or `Approved` leave requests for the same student that overlap with the requested dates.

5. **Mandatory Two-Stage Parent Acknowledgement:**
   - Upon leave application, a verification alert is dispatched to the student's registered parent/guardian.
   - Parents confirm awareness via a 6-digit OTP verification portal (`parent.html`).
   - Leave is flagged as `Waiting for Acknowledgement` until confirmed.

6. **Class Advisor Review & History Tracking:**
   - Class advisors review requests for their assigned classes.
   - Advisors can inspect the student's full historical leave record to identify attendance patterns.
   - If rejecting a request, faculty **must** provide a detailed reason/remark.

---

## 📁 Project Directory Structure

```text
student-leave-management/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection logic
│   ├── controllers/
│   │   ├── adminController.js     # System settings, students & faculty management
│   │   ├── authController.js      # Login, session verification & logout
│   │   ├── facultyController.js   # Class advisor evaluations & reviews
│   │   ├── parentController.js    # Parent OTP dispatch & acknowledgement
│   │   └── studentController.js   # Student profile, leave requests & notifications
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification & RBAC authorization
│   │   └── validateLeave.js       # Core security validations (ID tampering, deadline, overlap)
│   ├── models/
│   │   ├── Faculty.js             # Faculty schema with assigned classes
│   │   ├── LeaveRequest.js        # Central leave model with audit trail
│   │   ├── LeaveSettings.js       # Dynamic institution-wide policy rules
│   │   ├── Notification.js       # Real-time user alert records
│   │   ├── Parent.js              # Guardian records with OTP verification
│   │   ├── Student.js             # Student schema linked to parent & user
│   │   └── User.js                # Auth credentials and role definitions
│   ├── routes/
│   │   ├── adminRoutes.js         # /api/admin
│   │   ├── authRoutes.js          # /api/auth
│   │   ├── facultyRoutes.js       # /api/faculty
│   │   ├── parentRoutes.js        # /api/parent
│   │   └── studentRoutes.js       # /api/student
│   ├── utils/
│   │   ├── helpers.js             # Unique ID generation & date computations
│   │   └── seedData.js            # Database seeder with sample accounts
│   └── server.js                  # Express application entry point
├── frontend/
│   ├── css/
│   │   └── style.css              # Institutional navy/slate theme & responsive styles
│   ├── js/
│   │   ├── admin.js               # Admin policy editor & directory management
│   │   ├── api.js                 # Unified API client with automatic fallback engine
│   │   ├── auth.js                # Session management & role routing
│   │   ├── faculty.js             # Advisor review modal & leave history viewer
│   │   ├── leave.js               # Dynamic date calculations & apply form logic
│   │   ├── notifications.js       # Real-time activity feed & polling
│   │   └── student.js             # Student dashboard & security test runners
│   ├── admin.html                 # Administration dashboard
│   ├── apply-leave.html           # Leave application form
│   ├── faculty.html               # Class advisor dashboard
│   ├── index.html                 # Institutional login portal
│   ├── leave-details.html         # Leave status & progression timeline
│   ├── notifications.html         # Notifications center
│   └── parent.html                # Dedicated Parent OTP verification portal
├── .env.example                   # Environment configuration template
└── package.json                   # Project dependencies and npm scripts
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
- Node.js (v16+)
- MongoDB (running locally or a MongoDB Atlas URI)

### 2. Installation
```bash
cd student-leave-management
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default values:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/student_leave_db
JWT_SECRET=super_secret_jwt_key_leave_portal_2026
```

### 4. Seed Test Data
Populate the database with test accounts, faculty class assignments, and sample leave requests:
```bash
npm run seed
```

### 5. Start Server
```bash
npm start
```
Access the application at `http://localhost:5000`.

---

## 🔑 Pre-Configured Test Credentials

| Role | Email / ID | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Student** | `student1@college.edu` or `CS202401` | `password123` | Aarav Sharma (CSE Year 3-A) |
| **Student 2** | `student2@college.edu` or `CS202402` | `password123` | Priya Patel (CSE Year 3-A) |
| **Faculty** | `faculty1@college.edu` or `FAC101` | `password123` | Dr. Ramesh Kumar (Class Advisor) |
| **Admin** | `admin@college.edu` | `admin123` | Academic Dean / Office |
| **Parent OTP**| Phone: `9876543210` | Code: `123456` | Suresh Sharma (Ward: Aarav Sharma) |

---

## 🧪 Hackathon Demonstration Scenarios

### Test Case 1: Student ID Tampering Attempt (Identity Spoofing)
- **Action:** Click the "Test CASE 1: ID Spoofing Attempt" button on the student dashboard, or manually craft a POST request with `studentId: "CS202402"` while authenticated as `CS202401`.
- **Expected Result:** The server rejects the submission with a security violation alert: *"Security Violation: You cannot apply for leave on behalf of another student."*

### Test Case 2: Deadline Violation Attempt (Late Submission)
- **Action:** Click "Test CASE 2: Deadline Violation Attempt" on the student dashboard, or apply for normal leave starting within 2 hours.
- **Expected Result:** The server rejects the submission with: *"Leave request cannot be submitted because the submission deadline has passed (12 hours notice required)."*

### Test Case 3: Parent Acknowledgement & Faculty Approval Workflow
1. Student submits a leave application (`apply-leave.html`).
2. Request appears with status `Pending` and parent status `Waiting for Acknowledgement`.
3. Open `parent.html?id=<REQUEST_ID>`, enter OTP `123456`, and acknowledge.
4. Log into Faculty Portal (`faculty.html`). The advisor sees the request, inspects the student's prior leave history, and approves or rejects with a mandatory remark.
5. Student receives an instant notification reflecting the final decision.
