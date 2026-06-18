-- AUS Ticket Lanka - promotions module
-- Run after 001_init.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS promotions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  promo_type ENUM('youtube','image','html') NOT NULL DEFAULT 'image',
  youtube_url VARCHAR(500) NULL,
  image_path VARCHAR(255) NULL,
  embed_html MEDIUMTEXT NULL,
  status ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
  publish_at DATETIME NULL,
  unpublish_at DATETIME NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_admin_id INT UNSIGNED NULL,
  updated_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promotions_slug (slug),
  KEY idx_promotions_status (status),
  KEY idx_promotions_publish_at (publish_at),
  KEY idx_promotions_unpublish_at (unpublish_at),
  KEY idx_promotions_sort (sort_order),
  KEY idx_promotions_created_by (created_by_admin_id),
  KEY idx_promotions_updated_by (updated_by_admin_id),
  CONSTRAINT fk_promotions_created_by
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_promotions_updated_by
    FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

