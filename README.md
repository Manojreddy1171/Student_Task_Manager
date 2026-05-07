# 🎓 Student Task Manager — Full Stack Web App

A production-ready, feature-complete academic task management system for students and admins.

---

## 📁 Project Structure

```
student-task-manager/
├── backend/
│   ├── config/db.js          ← MySQL connection
│   ├── controllers/
│   │   ├── authController.js ← Register, Login, JWT
│   │   └── taskController.js ← Full CRUD + XP system
│   ├── middleware/auth.js    ← JWT guard, RBAC
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tasks.js          ← File upload support
│   │   ├── users.js
│   │   ├── groups.js         ← Real-time chat (Socket.io)
│   │   ├── notifications.js
│   │   ├── achievements.js
│   │   ├── events.js
│   │   └── analytics.js      ← Charts data
│   ├── uploads/              ← Uploaded assignment files
│   ├── server.js             ← Express + Socket.io
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── pages/
│   │   ├── index.html        ← Login / Register
│   │   ├── dashboard.html    ← Student dashboard
│   │   └── admin-dashboard.html ← Admin panel
│   └── js/
│       └── api.js            ← API utility functions
└── database/
    └── schema.sql            ← Full MySQL schema + seed data
```

---

## 🚀 Setup Instructions

### Step 1 — MySQL Database

```sql
-- 1. Open MySQL Workbench or terminal
mysql -u root -p

-- 2. Run the schema file
source /path/to/database/schema.sql;
-- OR: mysql -u root -p < database/schema.sql
```

### Step 2 — Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret

# Create uploads folder
mkdir uploads

# Start development server
npm run dev
# Server runs at http://localhost:5000
```

### Step 3 — Frontend

No build required! Just open the HTML files directly:

```bash
# Option A: Open directly in browser
open frontend/pages/index.html

# Option B: Serve with a simple HTTP server
cd frontend/pages
npx serve .
# Open http://localhost:3000
```

---

## 🔑 REST API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset with token |

### Tasks (protected)
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/tasks | Get tasks (role-filtered) |
| GET | /api/tasks/:id | Get task by ID |
| POST | /api/tasks | Create task (admin only) |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task (admin only) |
| POST | /api/tasks/:id/submit | Submit task with file |
| PUT | /api/tasks/:id/grade | Grade submission (admin) |

### Analytics
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/analytics/my-stats | Student personal stats |
| GET | /api/analytics/overview | Admin overview (admin only) |

### Groups
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/groups | Get user's groups |
| POST | /api/groups | Create group (admin) |
| GET | /api/groups/:id/members | Group members |
| GET | /api/groups/:id/messages | Chat history |
| POST | /api/groups/:id/messages | Send message |

---

## 🎮 Gamification System

- Every task has an **XP Reward** (default 50 XP)
- Submitting a task grants XP to the student
- **Achievements** auto-unlock based on conditions:
  - ✅ First Task — complete 1 task
  - ⚡ Fast Finisher — complete 5 tasks
  - 📚 Study Pro — complete 20 tasks
  - 🔥 7-Day Streak — login 7 days in a row
  - 🤝 Team Player — 3 group tasks
  - 🏆 Top Student — reach 5000 XP
- **Leaderboard** ranks students by XP

---

## 💬 Real-Time Chat (Socket.io)

Client-side connection example:
```javascript
const socket = io('http://localhost:5000');
socket.emit('join_group', groupId);
socket.on('receive_message', ({ userId, message, timestamp }) => { ... });
socket.emit('send_message', { groupId, userId, message });
```

---

## 🛡️ Security Features

- Passwords hashed with **bcrypt** (10 rounds)
- **JWT tokens** expire in 7 days
- **RBAC** — student / admin / superadmin
- File upload type & size validation (10MB max)
- Email enumeration prevention in forgot-password

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Tailwind CSS, Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MySQL 8+ |
| Auth | JWT + bcryptjs |
| Realtime | Socket.io |
| File Upload | Multer |
| Charts | Chart.js |

---

## 🎓 College Submission Notes

- Architecture: 3-Tier (Presentation → Business Logic → Data)
- Design Pattern: MVC (Models via DB queries, Views via HTML, Controllers)
- RBAC: 3 roles — Student, Admin (Teacher), Super Admin
- All modules implemented: Tasks, Groups, Calendar, Notifications, Gamification, Analytics, File Management

---

Built for MERN/Node.js Full Stack Project — Saveetha School of Engineering
