-- Student Task Manager - SQLite Schema
-- Run this file to initialize the database

-- ==================== USERS ====================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin')),
  avatar TEXT DEFAULT NULL,
  xp_points INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  last_login TEXT DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TASKS ====================
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  deadline TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  assigned_to INTEGER DEFAULT NULL,
  group_id INTEGER DEFAULT NULL,
  xp_reward INTEGER DEFAULT 50,
  file_url TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- ==================== GROUPS ====================
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (group_id, user_id)
);

-- ==================== SUBMISSIONS ====================
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  grade TEXT DEFAULT NULL,
  feedback TEXT DEFAULT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'deadline_alert', 'badge_earned', 'group_invite', 'announcement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== ACHIEVEMENTS ====================
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  xp_bonus INTEGER DEFAULT 100,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('tasks_completed', 'streak', 'xp_reached', 'group_tasks')),
  condition_value INTEGER NOT NULL
);

CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE (user_id, achievement_id)
);

-- ==================== EVENTS / CALENDAR ====================
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  color TEXT DEFAULT '#6c63ff',
  created_by INTEGER NOT NULL,
  visibility TEXT DEFAULT 'personal' CHECK (visibility IN ('personal', 'group', 'all')),
  group_id INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== GROUP CHAT ====================
CREATE TABLE group_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==================== SEED DATA ====================
-- Default achievements
INSERT INTO achievements (name, description, icon, xp_bonus, condition_type, condition_value) VALUES
('First Task', 'Complete your first task', '✅', 50, 'tasks_completed', 1),
('Fast Finisher', 'Complete 5 tasks before their deadline', '⚡', 100, 'tasks_completed', 5),
('Study Pro', 'Complete 20 tasks', '📚', 200, 'tasks_completed', 20),
('7-Day Streak', 'Login and complete tasks 7 days in a row', '🔥', 150, 'streak', 7),
('Team Player', 'Complete 3 group tasks', '🤝', 100, 'group_tasks', 3),
('Top Student', 'Reach 5000 XP', '🏆', 500, 'xp_reached', 5000);

-- Default admin user (password: Admin@123)
INSERT INTO users (name, email, password, role, xp_points) VALUES
('Prof. Admin', 'admin@college.edu', '$2b$10$hashedpasswordhere', 'admin', 0),
('Super Admin', 'superadmin@college.edu', '$2b$10$hashedpasswordhere', 'superadmin', 0);
