// routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// POST /api/auth/request-signup-otp
router.post('/request-signup-otp', [
  body('email').isEmail().withMessage('Valid email required')
], authController.requestSignupOtp);

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  body('role').optional().isIn(['student', 'admin']).withMessage('Invalid role'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP is required')
], authController.register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail()
], authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], authController.resetPassword);

module.exports = router;
