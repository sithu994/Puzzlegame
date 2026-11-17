-- =============================================================================
-- Lumina Slide - Database Schema (Aligned with API routes)
-- Database: lumina_slide
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `lumina_slide`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lumina_slide`;

-- 1. Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) DEFAULT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: game_sessions
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `grid_size` INT NOT NULL DEFAULT 3,
  `moves` INT DEFAULT 0,
  `time_seconds` INT DEFAULT 0,
  `completed` BOOLEAN DEFAULT FALSE,
  `score` INT DEFAULT 0,
  `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_game_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_game_sessions_user_id` (`user_id`),
  INDEX `idx_game_sessions_level` (`level`),
  INDEX `idx_game_sessions_completed` (`completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: leaderboard
CREATE TABLE IF NOT EXISTS `leaderboard` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `level` INT NOT NULL,
  `best_moves` INT NOT NULL,
  `best_time_seconds` INT NOT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `achieved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `unique_user_level` UNIQUE (`user_id`, `level`),
  CONSTRAINT `fk_leaderboard_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_leaderboard_level_score` (`level`, `score` DESC),
  INDEX `idx_leaderboard_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: user_progress
CREATE TABLE IF NOT EXISTS `user_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `highest_level` INT DEFAULT 1,
  `current_level` INT DEFAULT 1,
  `total_score` INT DEFAULT 0,
  `levels_completed` INT DEFAULT 0,
  `total_games_played` INT DEFAULT 0,
  `total_moves` INT DEFAULT 0,
  `total_time_seconds` INT DEFAULT 0,
  `last_played_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_progress_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: achievements
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT 'trophy',
  `category` VARCHAR(50) DEFAULT 'general',
  `points` INT DEFAULT 10,
  `requirement_type` ENUM('level_complete', 'speed', 'moves', 'games_played') DEFAULT 'level_complete',
  `requirement_value` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: user_achievements
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `achievement_id` INT NOT NULL,
  `unlocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `unique_user_achievement` UNIQUE (`user_id`, `achievement_id`),
  CONSTRAINT `fk_user_achievements_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_achievements_achievement`
    FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_user_achievements_user_id` (`user_id`),
  INDEX `idx_user_achievements_achievement_id` (`achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Achievements
INSERT INTO `achievements` (`code`, `name`, `title`, `description`, `icon`, `category`, `points`, `requirement_type`, `requirement_value`)
VALUES
  ('first_win', 'First Slide', 'First Light', 'Complete level 1 to begin your Lumina Slide journey', 'sparkles', 'progression', 10, 'level_complete', 1),
  ('speed_demon', 'Speed Demon', 'Speed of Light', 'Complete any puzzle level in under 30 seconds', 'bolt', 'speed', 25, 'speed', 30),
  ('efficiency_expert', 'Efficiency Expert', 'Perfect Slide', 'Complete any puzzle level in 20 moves or fewer', 'compass', 'efficiency', 20, 'moves', 20),
  ('level_5_master', 'Level 5 Master', 'Prism Voyager', 'Advance through challenging sliding grids to reach level 5', 'shield', 'progression', 30, 'level_complete', 5),
  ('puzzle_addict', 'Puzzle Addict', 'Slide Veteran', 'Play a total of 50 puzzle games', 'flame', 'progression', 50, 'games_played', 50),
  ('perfectionist', 'Perfectionist', 'Lumina Master', 'Complete any level with 15 or fewer moves', 'crown', 'efficiency', 40, 'moves', 15)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `icon` = VALUES(`icon`),
  `requirement_type` = VALUES(`requirement_type`),
  `requirement_value` = VALUES(`requirement_value`);
