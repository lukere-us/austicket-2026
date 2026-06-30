-- YouTube carousel site settings (Admin → Site settings → YouTube carousel)
SET NAMES utf8mb4;

INSERT INTO site_settings (setting_key, setting_value) VALUES ('home_youtube_carousel', '{"enabled":true,"sectionTitle":"Our Streaming","showDecorLines":true,"autoplayCarousel":false,"scrollSeconds":8,"videos":[]}')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
SELECT r.id, 'pages.youtubeCarousel', 1
FROM admin_roles r
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_at = CURRENT_TIMESTAMP;
