// server.js — Student Task Manager Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const compression = require('compression');

const app = express();
const server = http.createServer(app);

// ── Socket.io Setup ──────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  socket.on('send_message', ({ groupId, userId, message }) => {
    const msg = { userId, message, timestamp: new Date() };
    io.to(`group_${groupId}`).emit('receive_message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ── Middleware ────────────────────────────────────────────
app.use(compression()); // Compress all routes
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/achievements',  require('./routes/achievements'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/events',        require('./routes/events'));

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Serve Frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1d' // Cache files in browser for 1 day to speed up load times
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages', 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages', 'admin-dashboard.html'));
});

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, io };
