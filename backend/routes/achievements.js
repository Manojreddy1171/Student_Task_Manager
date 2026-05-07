// routes/achievements.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/db');

router.get('/', verifyToken, async (req, res) => {
  try {
    const [all] = await db.query('SELECT * FROM achievements');
    const [earned] = await db.query(
      `SELECT a.*, ua.earned_at FROM achievements a
       JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id=?`, [req.user.id]
    );
    const earnedIds = earned.map(e => e.id);
    const result = all.map(a => ({ ...a, earned: earnedIds.includes(a.id), earned_at: earned.find(e=>e.id===a.id)?.earned_at || null }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;

