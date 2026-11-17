const express = require('express');
const { query } = require('../database/db');

// Import auth middleware with fallback
let authenticateToken;
try {
  const auth = require('../middleware/auth');
  authenticateToken = auth.authenticateToken || auth.requireAuth;
} catch (err) {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'Authentication token is required' });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({ success: false, error: 'Invalid authorization format' });
    }
    jwt.verify(parts[1], JWT_SECRET, (verifyErr, user) => {
      if (verifyErr) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  };
}

const router = express.Router();

/**
 * GET /api/achievements
 * Get all available game achievements
 */
router.get('/', async (req, res, next) => {
  try {
    const achievements = await query(
      `SELECT 
         id,
         code,
         title,
         description,
         icon,
         COALESCE(category, 'general') AS category,
         COALESCE(points, 10) AS points,
         created_at
       FROM achievements 
       ORDER BY id ASC`
    );

    return res.json({
      success: true,
      count: achievements.length,
      achievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/achievements/user
 * Get authenticated user's unlocked achievements (protected)
 */
router.get('/user', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userAchievements = await query(
      `SELECT 
         a.id,
         a.code,
         a.title,
         a.description,
         a.icon,
         COALESCE(a.category, 'general') AS category,
         COALESCE(a.points, 10) AS points,
         ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ?
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      count: userAchievements.length,
      achievements: userAchievements
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
