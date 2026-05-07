// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendEmail } = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';
const otpStore = new Map();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupOtp(email) {
  otpStore.delete(email.toLowerCase());
}

function getOtpRecord(email) {
  return otpStore.get(email.toLowerCase());
}

exports.requestSignupOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });

    const otp = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    await sendEmail({
      to: email,
      subject: 'Your TaskAcademy signup OTP',
      text: `Your TaskAcademy signup code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your TaskAcademy signup code is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
    });

    res.json({ success: true, message: 'OTP sent to your email. Check your inbox and spam folder.' });
  } catch (err) {
    console.error('Request signup OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password, role = 'student', otp } = req.body;

  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required to complete registration' });
  }

  const record = getOtpRecord(email);
  if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    cleanupOtp(email);
    const token = jwt.sign({ id: result.insertId, role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: result.insertId, name, email, role, xp_points: 0 }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Login ────────────────────────────────────────────────
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, xp_points: user.xp_points, streak_count: user.streak_count
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Forgot Password ──────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    // Always return success to prevent email enumeration
    if (rows.length === 0) return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });

    const resetToken = jwt.sign({ id: rows[0].id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `http://localhost:3000/reset-password.html?token=${resetToken}`;
    
    await sendEmail({
      to: email,
      subject: 'TaskAcademy Password Reset',
      text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p>Please <a href="${resetUrl}">click here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`
    });
    console.log(`[DEV] Reset token for ${email}: ${resetToken}`);

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Reset Password ───────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset') throw new Error('Invalid token');

    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, decoded.id]);

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
};
