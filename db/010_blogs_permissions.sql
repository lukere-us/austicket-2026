-- Seed blogs permissions (run after 010_blogs.sql if permissions insert failed)
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
