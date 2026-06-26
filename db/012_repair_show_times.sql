-- Repair corrupted show_times table (MySQL error 1932: doesn't exist in engine)
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS show_times;

CREATE TABLE show_times (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  show_time DATETIME NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_show_times_show (show_id),
  KEY idx_show_times_time (show_time),
  CONSTRAINT fk_show_times_show
    FOREIGN KEY (show_id) REFERENCES shows(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
