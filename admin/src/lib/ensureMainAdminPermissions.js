import { ADMIN_PERMISSION_KEYS } from './adminPermissions.shared.js'
import { isMainAdminRole } from './adminPermissions.js'

/**
 * Main admin roles should have every permission key in DB (roles UI + consistency).
 */
export async function ensureMainAdminPermissions(pool) {
  const [roles] = await pool.execute(`SELECT id, name FROM admin_roles`)
  const mainRoles = (roles || []).filter((row) => isMainAdminRole(row.name))

  for (const role of mainRoles) {
    const roleId = Number(role.id)
    if (!Number.isFinite(roleId) || roleId <= 0) continue

    for (const key of ADMIN_PERMISSION_KEYS) {
      await pool.execute(
        `
          INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
          VALUES (?, ?, 1)
          ON DUPLICATE KEY UPDATE allowed = 1, updated_at = CURRENT_TIMESTAMP
        `,
        [roleId, key],
      )
    }
  }

  await pool.execute(
    `
      INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
      SELECT r.id, 'pages.youtubeCarousel', 1
      FROM admin_roles r
      ON DUPLICATE KEY UPDATE allowed = 1, updated_at = CURRENT_TIMESTAMP
    `,
  )
}
