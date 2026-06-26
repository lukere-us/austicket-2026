-- Remove schedule/sort columns from blogs (status-only publishing)

SET NAMES utf8mb4;

SET time_zone = '+00:00';



ALTER TABLE blogs DROP COLUMN IF EXISTS publish_at;

ALTER TABLE blogs DROP COLUMN IF EXISTS unpublish_at;

ALTER TABLE blogs DROP COLUMN IF EXISTS sort_order;


