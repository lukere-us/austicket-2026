CREATE TABLE IF NOT EXISTS site_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(64) NOT NULL,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_settings (setting_key, setting_value)
VALUES ('home_hero', '{}')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

INSERT INTO site_settings (setting_key, setting_value)
VALUES ('home_listings', '{}')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
