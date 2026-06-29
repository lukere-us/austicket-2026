-- Explicit visit date/time for page_visits (shown in Admin → Analytics → Page visits).
SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE page_visits
  ADD COLUMN visited_at DATETIME NULL AFTER user_agent;

UPDATE page_visits
SET visited_at = COALESCE(created_at, NOW())
WHERE visited_at IS NULL;

ALTER TABLE page_visits
  MODIFY COLUMN visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_page_visits_visited ON page_visits (visited_at);
