// controllers/taskController.js
const db = require('../config/db');

// ─── Get All Tasks (role-filtered) ────────────────────────
exports.getAllTasks = async (req, res) => {
  try {
    let query, params;
    const { status, priority, search } = req.query;

    if (['admin', 'superadmin'].includes(req.user.role)) {
      query = `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
               FROM tasks t
               LEFT JOIN users u ON t.assigned_to = u.id
               LEFT JOIN users c ON t.created_by = c.id
               WHERE 1=1`;
      params = [];
    } else {
      query = `SELECT t.*, u.name as assigned_to_name, c.name as created_by_name
               FROM tasks t
               LEFT JOIN users u ON t.assigned_to = u.id
               LEFT JOIN users c ON t.created_by = c.id
               WHERE (t.assigned_to = ? OR t.group_id IN (
                 SELECT group_id FROM group_members WHERE user_id = ?
               ))`;
      params = [req.user.id, req.user.id];
    }

    if (status)   { query += ' AND t.status = ?';    params.push(status); }
    if (priority) { query += ' AND t.priority = ?';  params.push(priority); }
    if (search)   { query += ' AND t.title LIKE ?';  params.push(`%${search}%`); }

    query += ' ORDER BY t.deadline ASC';
    const [tasks] = await db.query(query, params);
    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Get Task By ID ───────────────────────────────────────
exports.getTaskById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.name as assigned_to_name FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Create Task (Admin) ──────────────────────────────────
exports.createTask = async (req, res) => {
  const { title, description, priority, deadline, assigned_to, group_id, xp_reward } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO tasks (title, description, priority, deadline, assigned_to, group_id, created_by, xp_reward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, priority || 'medium', deadline, assigned_to || null, group_id || null, req.user.id, xp_reward || 50]
    );

    // Send notification to assigned user
    if (assigned_to) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'task_assigned', ?, ?)`,
        [assigned_to, `New Task: ${title}`, `You have been assigned a new task due ${deadline}`]
      );
    }

    res.status(201).json({ success: true, message: 'Task created', taskId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Update Task ──────────────────────────────────────────
exports.updateTask = async (req, res) => {
  const { title, description, priority, deadline, status } = req.body;
  try {
    await db.query(
      `UPDATE tasks SET title=?, description=?, priority=?, deadline=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description, priority, deadline, status, req.params.id]
    );
    res.json({ success: true, message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Delete Task (Admin) ──────────────────────────────────
exports.deleteTask = async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Submit Task (Student) ────────────────────────────────
exports.submitTask = async (req, res) => {
  const { content } = req.body;
  const file_url = req.file ? `/uploads/${req.file.filename}` : null;
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if task exists and is assigned to this user
    const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ? AND assigned_to = ?', [taskId, userId]);
    if (tasks.length === 0) return res.status(403).json({ success: false, message: 'Task not found or not assigned to you' });

    await db.query(
      `INSERT OR REPLACE INTO submissions (task_id, user_id, content, file_url, submitted_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [taskId, userId, content || '', file_url]
    );

    // Mark task as completed
    await db.query(`UPDATE tasks SET status='completed' WHERE id = ?`, [taskId]);

    // Award XP
    const xpReward = tasks[0].xp_reward || 50;
    await db.query('UPDATE users SET xp_points = xp_points + ? WHERE id = ?', [xpReward, userId]);

    // Check & award achievements
    await checkAchievements(userId);

    res.json({ success: true, message: `Task submitted! You earned ${xpReward} XP.`, xp_earned: xpReward });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Grade Submission (Admin) ─────────────────────────────
exports.gradeSubmission = async (req, res) => {
  const { submission_id, grade, feedback } = req.body;
  try {
    await db.query('UPDATE submissions SET grade=?, feedback=? WHERE id=?', [grade, feedback, submission_id]);
    res.json({ success: true, message: 'Grade submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Internal: Check & Award Achievements ─────────────────
async function checkAchievements(userId) {
  const [user] = await db.query('SELECT * FROM users WHERE id=?', [userId]);
  if (!user[0]) return;

  const [completedCount] = await db.query(
    'SELECT COUNT(*) as cnt FROM tasks WHERE assigned_to=? AND status="completed"', [userId]
  );
  const [achievements] = await db.query('SELECT * FROM achievements');
  const [earned] = await db.query('SELECT achievement_id FROM user_achievements WHERE user_id=?', [userId]);
  const earnedIds = earned.map(e => e.achievement_id);

  for (const ach of achievements) {
    if (earnedIds.includes(ach.id)) continue;
    let qualified = false;

    if (ach.condition_type === 'tasks_completed' && completedCount[0].cnt >= ach.condition_value) qualified = true;
    if (ach.condition_type === 'xp_reached' && user[0].xp_points >= ach.condition_value) qualified = true;
    if (ach.condition_type === 'streak' && user[0].streak_count >= ach.condition_value) qualified = true;

    if (qualified) {
      await db.query('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?,?)', [userId, ach.id]);
      await db.query('UPDATE users SET xp_points = xp_points + ? WHERE id=?', [ach.xp_bonus, userId]);
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'badge_earned', ?, ?)`,
        [userId, `Badge Unlocked: ${ach.name}`, `${ach.description} (+${ach.xp_bonus} XP)`]
      );
    }
  }
}
