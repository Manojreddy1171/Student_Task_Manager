// routes/events.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/db');

router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM events WHERE created_by=? OR visibility='all' ORDER BY event_date ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.post('/', verifyToken, async (req, res) => {
  const { title, description, event_date, color, visibility } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO events (title, description, event_date, color, created_by, visibility) VALUES (?,?,?,?,?,?)',
      [title, description, event_date, color || '#6c63ff', req.user.id, visibility || 'personal']
    );
    res.status(201).json({ success: true, eventId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM events WHERE id=? AND created_by=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
