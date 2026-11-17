const express = require('express');
const { param, validationResult } = require('express-validator');
const { query } = require('../database/db');

const router = express.Router();

/**
 * Validation rules for level leaderboard
 */
const levelValidation = [
  param('level')
    .notEmpty().withMessage('Level is required')
    .isInt({ min: 1 }).withMessage('Level must be a positive integer')
];

/**
 * GET /api/leaderboard/global/top
 * Get global leaderboard (highest level reached, total score) - top 20 players
 * Note: Place before /:level route so 'global' is not captured as a level param
 */
router.get('/global/top', async (req, res, next) => {
  try {
    const topPlayers = await query(
      `SELECT 
         u.id AS user_id,
         u.username,
         u.display_name,
         u.avatar_url,
         up.highest_level,
         up.total_score,
         up.levels_completed,
         up.updated_at
       FROM user_progress up
       JOIN users u ON up.user_id = u.id
       ORDER BY up.total_score DESC, up.highest_level DESC
       LIMIT 20`
    );

    // Format results with rank
    const leaderboardWithRank = topPlayers.map((player, index) => ({
      rank: index + 1,
      user_id: player.user_id,
      username: player.username,
      display_name: player.display_name || player.username,
      avatar_url: player.avatar_url,
      highest_level: parseInt(player.highest_level, 10),
      total_score: parseInt(player.total_score, 10),
      levels_completed: parseInt(player.levels_completed, 10),
      updated_at: player.updated_at
    }));

    return res.json({
      success: true,
      leaderboard: leaderboardWithRank
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard/:level
 * Get top 20 scores for a specific level
 * Returns username, display_name, best_moves, best_time_seconds, score
 */
router.get('/:level', levelValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const level = parseInt(req.params.level, 10);

    const scores = await query(
      `SELECT 
         u.username,
         u.display_name,
         u.avatar_url,
         l.best_moves,
         l.best_time_seconds,
         l.score,
         l.updated_at
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       WHERE l.level = ?
       ORDER BY l.score DESC, l.best_time_seconds ASC, l.best_moves ASC
       LIMIT 20`,
      [level]
    );

    const leaderboardWithRank = scores.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      display_name: entry.display_name || entry.username,
      avatar_url: entry.avatar_url,
      best_moves: parseInt(entry.best_moves, 10),
      best_time_seconds: parseInt(entry.best_time_seconds, 10),
      score: parseInt(entry.score, 10),
      updated_at: entry.updated_at
    }));

    return res.json({
      success: true,
      level,
      leaderboard: leaderboardWithRank
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
