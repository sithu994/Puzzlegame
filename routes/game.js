const express = require('express');
const { body, param, query: queryParam, validationResult } = require('express-validator');
const { query } = require('../database/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/game/start
 * Start a new game session. Params: level.
 * Returns session_id.
 */
router.post(
  '/start',
  optionalAuth,
  [
    body('level')
      .notEmpty().withMessage('Level is required')
      .isInt({ min: 1 }).withMessage('Level must be a positive integer')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
      }

      const level = parseInt(req.body.level, 10);
      const gridSize = Math.min(level + 2, 7);
      const userId = req.user ? req.user.id : null;

      const result = await query(
        `INSERT INTO game_sessions (user_id, level, grid_size, moves, time_seconds, completed, score, started_at)
         VALUES (?, ?, ?, 0, 0, FALSE, 0, NOW())`,
        [userId, level, gridSize]
      );

      return res.status(201).json({
        success: true,
        message: 'Game session started',
        session_id: result.insertId,
        level,
        grid_size: gridSize
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/game/complete/:sessionId
 * Complete a game session. Params: moves, time_seconds.
 * Updates game_session, checks/updates leaderboard, updates user_progress, checks achievements.
 * Returns score, new_achievements, is_new_best.
 */
router.put(
  '/complete/:sessionId',
  optionalAuth,
  [
    param('sessionId')
      .notEmpty().withMessage('Session ID is required')
      .isInt({ min: 1 }).withMessage('Session ID must be a positive integer'),
    body('moves')
      .notEmpty().withMessage('Moves count is required')
      .isInt({ min: 0 }).withMessage('Moves must be a non-negative integer'),
    body('time_seconds')
      .notEmpty().withMessage('Time in seconds is required')
      .isNumeric().withMessage('Time in seconds must be a numeric value')
      .custom(val => parseFloat(val) >= 0).withMessage('Time in seconds must be non-negative')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
      }

      const sessionId = parseInt(req.params.sessionId, 10);
      const moves = parseInt(req.body.moves, 10);
      const timeSeconds = Math.round(parseFloat(req.body.time_seconds));

      // Find the session
      const sessions = await query(
        'SELECT id, user_id, level, completed FROM game_sessions WHERE id = ?',
        [sessionId]
      );

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Game session not found'
        });
      }

      const session = sessions[0];
      if (session.completed) {
        return res.status(400).json({
          success: false,
          error: 'Game session has already been completed'
        });
      }

      const userId = session.user_id || (req.user ? req.user.id : null);
      const level = session.level;

      // Score formula: score = Math.max(0, 1000 - (moves * 10) - (time_seconds * 2))
      const score = Math.max(0, 1000 - (moves * 10) - (timeSeconds * 2));

      // Update game session
      await query(
        `UPDATE game_sessions 
         SET completed = TRUE, moves = ?, time_seconds = ?, score = ?, completed_at = NOW()
         WHERE id = ?`,
        [moves, timeSeconds, score, sessionId]
      );

      let isNewBest = false;
      const newAchievements = [];

      if (userId) {
        // 1. Leaderboard check & update
        const existingEntries = await query(
          'SELECT id, score, best_moves, best_time_seconds FROM leaderboard WHERE user_id = ? AND level = ?',
          [userId, level]
        );

        if (existingEntries.length > 0) {
          const existing = existingEntries[0];
          if (score > existing.score) {
            isNewBest = true;
            await query(
              `UPDATE leaderboard 
               SET score = ?, best_moves = ?, best_time_seconds = ?, achieved_at = NOW()
               WHERE id = ?`,
              [score, moves, timeSeconds, existing.id]
            );
          }
        } else {
          isNewBest = true;
          await query(
            `INSERT INTO leaderboard (user_id, level, score, best_moves, best_time_seconds, achieved_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [userId, level, score, moves, timeSeconds]
          );
        }

        // 2. User progress update
        const existingProgress = await query(
          'SELECT id, current_level, total_games_played, total_moves, total_time_seconds FROM user_progress WHERE user_id = ?',
          [userId]
        );

        if (existingProgress.length > 0) {
          const prog = existingProgress[0];
          const newLevel = Math.max(prog.current_level, level + 1);
          await query(
            `UPDATE user_progress 
             SET current_level = ?, total_games_played = total_games_played + 1, 
                 total_moves = total_moves + ?, total_time_seconds = total_time_seconds + ?,
                 last_played_at = NOW()
             WHERE user_id = ?`,
            [newLevel, moves, timeSeconds, userId]
          );
        } else {
          await query(
            `INSERT INTO user_progress (user_id, current_level, total_games_played, total_moves, total_time_seconds, last_played_at)
             VALUES (?, ?, 1, ?, ?, NOW())`,
            [userId, level + 1, moves, timeSeconds]
          );
        }

        // 3. Achievement evaluation
        try {
          const allAchievements = await query('SELECT id, name, description, icon, requirement_type, requirement_value FROM achievements');
          const userAchs = await query('SELECT achievement_id FROM user_achievements WHERE user_id = ?', [userId]);
          const userAchievementIds = userAchs.map(a => a.achievement_id);

          const progressData = await query('SELECT total_games_played FROM user_progress WHERE user_id = ?', [userId]);
          const totalGames = progressData.length > 0 ? progressData[0].total_games_played : 0;

          for (const ach of allAchievements) {
            if (userAchievementIds.includes(ach.id)) continue;

            let unlocked = false;

            switch (ach.requirement_type) {
              case 'level_complete':
                if (level >= ach.requirement_value) unlocked = true;
                break;
              case 'speed':
                if (timeSeconds <= ach.requirement_value) unlocked = true;
                break;
              case 'moves':
                if (moves <= ach.requirement_value) unlocked = true;
                break;
              case 'games_played':
                if (totalGames >= ach.requirement_value) unlocked = true;
                break;
            }

            if (unlocked) {
              try {
                await query(
                  'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, NOW())',
                  [userId, ach.id]
                );
                newAchievements.push({
                  id: ach.id,
                  name: ach.name,
                  description: ach.description,
                  icon: ach.icon
                });
              } catch (unlockErr) {
                // Ignore duplicate key errors
              }
            }
          }
        } catch (achErr) {
          console.warn('Achievement check failed:', achErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Game session completed successfully',
        session_id: sessionId,
        level,
        score,
        moves,
        time_seconds: timeSeconds,
        is_new_best: isNewBest,
        new_achievements: newAchievements
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/game/progress
 * Get user's current progress (protected)
 */
router.get('/progress', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const progressRows = await query(
      'SELECT current_level, total_games_played, total_moves, total_time_seconds, last_played_at FROM user_progress WHERE user_id = ?',
      [userId]
    );

    const progress = progressRows.length > 0 ? progressRows[0] : {
      current_level: 1,
      total_games_played: 0,
      total_moves: 0,
      total_time_seconds: 0,
      last_played_at: null
    };

    const achStats = await query(
      'SELECT COUNT(*) AS unlocked_count FROM user_achievements WHERE user_id = ?',
      [userId]
    );

    return res.json({
      success: true,
      progress: {
        ...progress,
        achievements_unlocked: parseInt(achStats[0].unlocked_count, 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/game/history
 * Get user's game history with pagination (protected)
 */
router.get(
  '/history',
  authenticateToken,
  [
    queryParam('page').optional().isInt({ min: 1 }),
    queryParam('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
        });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      const countResult = await query(
        'SELECT COUNT(*) AS total FROM game_sessions WHERE user_id = ?',
        [userId]
      );
      const total = parseInt(countResult[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      const sessions = await query(
        `SELECT id, level, grid_size, moves, time_seconds, score, completed, started_at, completed_at
         FROM game_sessions 
         WHERE user_id = ? 
         ORDER BY started_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return res.json({
        success: true,
        sessions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
