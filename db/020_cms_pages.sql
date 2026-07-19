-- CMS content pages (title, richtext body, optional embed HTML)
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS cms_pages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL,
  banner_image VARCHAR(255) NULL,
  parent_id INT UNSIGNED NULL,
  body_html MEDIUMTEXT NULL,
  embed_html MEDIUMTEXT NULL,
  status ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
  created_by_admin_id INT UNSIGNED NULL,
  updated_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cms_pages_slug (slug),
  KEY idx_cms_pages_status (status),
  KEY idx_cms_pages_parent (parent_id),
  CONSTRAINT fk_cms_pages_created_by
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cms_pages_updated_by
    FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cms_pages_parent
    FOREIGN KEY (parent_id) REFERENCES cms_pages(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
SELECT r.id, p.permission_key, 1
FROM admin_roles r
CROSS JOIN (
  SELECT 'cms_pages.list' AS permission_key
  UNION ALL SELECT 'cms_pages.show'
  UNION ALL SELECT 'cms_pages.new'
  UNION ALL SELECT 'cms_pages.edit'
  UNION ALL SELECT 'cms_pages.delete'
) AS p
WHERE 1 = 1
ON DUPLICATE KEY UPDATE allowed = 1, updated_at = CURRENT_TIMESTAMP;
