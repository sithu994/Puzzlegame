const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('display_name')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Display name must not exceed 50 characters')
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { username, email, password, display_name } = req.body;

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id, username, email FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      const conflictField = existing.email.toLowerCase() === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(409).json({
        success: false,
        error: `${conflictField} is already registered`
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userDisplayName = display_name || username;

    // Insert user into database
    const insertResult = await query(
      `INSERT INTO users (username, email, password, display_name, created_at, updated_at) 
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [username, email, hashedPassword, userDisplayName]
    );

    const userId = insertResult.insertId;

    // Initialize user_progress record
    try {
      await query(
        `INSERT INTO user_progress (user_id, highest_level, total_score, levels_completed, updated_at)
         VALUES (?, 1, 0, 0, NOW())`,
        [userId]
      );
    } catch (progErr) {
      console.warn('Could not auto-initialize user_progress:', progErr.message);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: userId, username, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        username,
        email,
        display_name: userDisplayName,
        avatar_url: null,
        created_at: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email or username is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { email, password } = req.body;

    // Find user by email or username
    const users = await query(
      'SELECT id, username, email, password, display_name, avatar_url, created_at FROM users WHERE email = ? OR username = ?',
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name || user.username,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, username, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Validation rules for profile update
 */
const updateProfileValidation = [
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Display name must be between 1 and 50 characters'),
  body('avatar_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Avatar URL must be a valid URL')
];

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, updateProfileValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const { display_name, avatar_url } = req.body;

    const updates = [];
    const params = [];

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
    }

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields provided for update'
      });
    }

    updates.push('updated_at = NOW()');
    params.push(req.user.id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated user
    const updatedUsers = await query(
      'SELECT id, username, email, display_name, avatar_url, updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUsers[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
