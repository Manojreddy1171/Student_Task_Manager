// routes/users.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const db = require('../config/db');

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, xp_points, streak_count, avatar, created_at FROM users WHERE id=?', [req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.put('/profile', verifyToken, async (req, res) => {
  const { name } = req.body;
  try {
    await db.query('UPDATE users SET name=? WHERE id=?', [name, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Admin: get all students
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, email, role, xp_points, streak_count, is_active, created_at FROM users WHERE role='student'");
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Admin: toggle user active
router.put('/:id/toggle', verifyToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active = NOT is_active WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
