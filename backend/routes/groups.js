// routes/groups.js
const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const db = require('../config/db');

// GET /api/groups
router.get('/', verifyToken, async (req, res) => {
  try {
    const [groups] = req.user.role === 'student'
      ? await db.query(
          `SELECT g.*, u.name as creator_name, COUNT(gm2.user_id) as member_count
           FROM \`groups\` g
           JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
           JOIN users u ON g.created_by = u.id
           LEFT JOIN group_members gm2 ON g.id = gm2.group_id
           GROUP BY g.id`, [req.user.id])
      : await db.query(
          `SELECT g.*, u.name as creator_name, COUNT(gm.user_id) as member_count
           FROM \`groups\` g
           JOIN users u ON g.created_by = u.id
           LEFT JOIN group_members gm ON g.id = gm.group_id
           GROUP BY g.id`);
    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/groups — Admin creates group
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, description, member_ids } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO `groups` (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );
    const groupId = result.insertId;

    if (member_ids && member_ids.length > 0) {
      const values = member_ids.map(uid => [groupId, uid, 'member']);
      await db.query('INSERT INTO group_members (group_id, user_id, role) VALUES ?', [values]);
    }
    res.status(201).json({ success: true, message: 'Group created', groupId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', verifyToken, async (req, res) => {
  try {
    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, u.xp_points, gm.role FROM group_members gm
       JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [req.params.id]
    );
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/groups/:id/messages
router.get('/:id/messages', verifyToken, async (req, res) => {
  try {
    const [messages] = await db.query(
      `SELECT gm.*, u.name FROM group_messages gm
       JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?
       ORDER BY gm.sent_at ASC LIMIT 100`, [req.params.id]
    );
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/groups/:id/messages
router.post('/:id/messages', verifyToken, async (req, res) => {
  const { message } = req.body;
  try {
    await db.query(
      'INSERT INTO group_messages (group_id, user_id, message) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, message]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
