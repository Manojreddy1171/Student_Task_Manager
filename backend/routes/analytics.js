// routes/analytics.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const db = require('../config/db');

// GET /api/analytics/overview — Admin: all stats
router.get('/overview', verifyToken, isAdmin, async (req, res) => {
  try {
    const [[totalUsers]]   = await db.query("SELECT COUNT(*) as cnt FROM users WHERE role='student'");
    const [[totalTasks]]   = await db.query("SELECT COUNT(*) as cnt FROM tasks");
    const [[doneTasks]]    = await db.query("SELECT COUNT(*) as cnt FROM tasks WHERE status='completed'");
    const [[overdueTasks]] = await db.query("SELECT COUNT(*) as cnt FROM tasks WHERE status='overdue' OR (deadline < CURRENT_TIMESTAMP AND status != 'completed')");

    const [tasksByPriority] = await db.query(
      "SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority"
    );
    const [completionByUser] = await db.query(
      `SELECT u.name, COUNT(t.id) as completed
       FROM users u
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.status='completed'
       WHERE u.role='student'
       GROUP BY u.id ORDER BY completed DESC LIMIT 10`
    );
    const [weeklyTasks] = await db.query(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM tasks WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at) ORDER BY day ASC`
    );

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.cnt,
        totalTasks: totalTasks.cnt,
        completedTasks: doneTasks.cnt,
        overdueTasks: overdueTasks.cnt,
        completionRate: totalTasks.cnt > 0 ? Math.round((doneTasks.cnt / totalTasks.cnt) * 100) : 0,
        tasksByPriority,
        completionByUser,
        weeklyTasks
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/analytics/my-stats — Student: personal stats
router.get('/my-stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [[user]]         = await db.query('SELECT xp_points, streak_count FROM users WHERE id=?', [userId]);
    const [[total]]        = await db.query('SELECT COUNT(*) as cnt FROM tasks WHERE assigned_to=?', [userId]);
    const [[completed]]    = await db.query("SELECT COUNT(*) as cnt FROM tasks WHERE assigned_to=? AND status='completed'", [userId]);
    const [[pending]]      = await db.query("SELECT COUNT(*) as cnt FROM tasks WHERE assigned_to=? AND status='pending'", [userId]);
    const [upcoming]       = await db.query(
      "SELECT title, deadline, priority FROM tasks WHERE assigned_to=? AND deadline >= CURRENT_TIMESTAMP AND status!='completed' ORDER BY deadline ASC LIMIT 5",
      [userId]
    );
    const [achievements]   = await db.query(
      `SELECT a.name, a.icon, ua.earned_at FROM achievements a
       JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id=? ORDER BY ua.earned_at DESC`,
      [userId]
    );
    const [leaderboard]    = await db.query(
      'SELECT id, name, xp_points FROM users WHERE role="student" ORDER BY xp_points DESC LIMIT 10'
    );
    const myRank = leaderboard.findIndex(u => u.id === userId) + 1;

    res.json({
      success: true,
      data: {
        xp_points: user.xp_points,
        streak_count: user.streak_count,
        totalTasks: total.cnt,
        completedTasks: completed.cnt,
        pendingTasks: pending.cnt,
        completionRate: total.cnt > 0 ? Math.round((completed.cnt / total.cnt) * 100) : 0,
        upcomingDeadlines: upcoming,
        achievements,
        leaderboard,
        myRank
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
