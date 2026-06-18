-- AUS Ticket Lanka - dev seed
-- Creates an initial main admin. Replace password hash by running your own once in PHP/Node.
-- Default password in docs: Admin@12345 (hash below generated with bcrypt cost 10)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Ensure roles exist
INSERT INTO admin_roles (name) VALUES ('main_admin')
  ON DUPLICATE KEY UPDATE name = VALUES(name);

-- NOTE: If you want a different password, update `password_hash`
INSERT INTO admins (role_id, name, email, password_hash, is_active)
SELECT r.id, 'Main Admin', 'admin@austicketlanka.local', '$2y$10$wRzQc6m0ElpQXcO2r3c5rO6vI5Ujv2l4xUu9m6W9j0F6wK7KcO8pS', 1
FROM admin_roles r
WHERE r.name = 'main_admin'
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  is_active = VALUES(is_active);

