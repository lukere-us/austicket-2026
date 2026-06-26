-- Footer site settings (editable from Admin → Site settings → Footer)
SET NAMES utf8mb4;

INSERT INTO site_settings (setting_key, setting_value) VALUES ('footer', '{}')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- Allow footer settings for roles that can access other site settings pages
INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
SELECT r.id, 'pages.footer', 1
FROM admin_roles r
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_at = CURRENT_TIMESTAMP;
