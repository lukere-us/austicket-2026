-- AUS Ticket Lanka - blogs module
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS blogs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL,
  excerpt TEXT NULL,
  body_html MEDIUMTEXT NULL,
  cover_image VARCHAR(255) NULL,
  author_name VARCHAR(120) NULL,
  tags VARCHAR(500) NULL,
  status ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_by_admin_id INT UNSIGNED NULL,
  updated_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blogs_slug (slug),
  KEY idx_blogs_status (status),
  KEY idx_blogs_featured (is_featured),
  CONSTRAINT fk_blogs_created_by
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_blogs_updated_by
    FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
SELECT r.id, p.permission_key, 1
FROM admin_roles r
CROSS JOIN (
  SELECT 'blogs.list' AS permission_key
  UNION ALL SELECT 'blogs.show'
  UNION ALL SELECT 'blogs.new'
  UNION ALL SELECT 'blogs.edit'
  UNION ALL SELECT 'blogs.delete'
) AS p
WHERE 1 = 1
ON DUPLICATE KEY UPDATE allowed = 1, updated_at = CURRENT_TIMESTAMP;
