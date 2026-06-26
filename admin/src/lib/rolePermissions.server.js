import { ADMIN_PERMISSION_KEYS } from './adminPermissions.shared.js'
import { isMainAdminRole, normalizeRoleKey } from './adminPermissions.js'

const MAIN_ADMIN_ROLE = 'main_admin'
const ALLOWED_KEY_SET = new Set(ADMIN_PERMISSION_KEYS)

export function normalizeAllowedKeys(keys) {
  if (!Array.isArray(keys)) return []
  const out = []
  const seen = new Set()
  for (const raw of keys) {
    const key = String(raw || '').trim()
    if (!key || !ALLOWED_KEY_SET.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

export async function fetchRoleById(pool, roleId) {
  const id = Number(roleId)
  if (!Number.isFinite(id) || id <= 0) return null
  const [rows] = await pool.execute(`SELECT id, name FROM admin_roles WHERE id = ? LIMIT 1`, [id])
  return rows?.[0] || null
}

export async function fetchRolePermissionKeys(pool, roleId) {
  const id = Number(roleId)
  if (!Number.isFinite(id) || id <= 0) return []
  const [rows] = await pool.execute(
    `SELECT permission_key FROM admin_role_permissions WHERE role_id = ? AND allowed = 1 ORDER BY permission_key ASC`,
    [id]
  )
  return (rows || []).map((row) => String(row.permission_key)).filter((key) => ALLOWED_KEY_SET.has(key))
}

export async function saveRolePermissions(pool, roleId, allowedKeys) {
  const id = Number(roleId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid role id')
  const keys = normalizeAllowedKeys(allowedKeys)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(`DELETE FROM admin_role_permissions WHERE role_id = ?`, [id])
    for (const key of keys) {
      await conn.execute(
        `INSERT INTO admin_role_permissions (role_id, permission_key, allowed) VALUES (?, ?, 1)`,
        [id, key]
      )
    }
    await conn.commit()
    return keys
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function createRoleWithPermissions(pool, name, allowedKeys) {
  const roleName = String(name || '').trim()
  if (!roleName) throw new Error('Role name is required')
  if (normalizeRoleKey(roleName) === MAIN_ADMIN_ROLE) throw new Error('Cannot create a role named main_admin')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.execute(`INSERT INTO admin_roles (name) VALUES (?)`, [roleName])
    const roleId = Number(result?.insertId)
    if (!roleId) throw new Error('Failed to create role')
    const keys = normalizeAllowedKeys(allowedKeys)
    for (const key of keys) {
      await conn.execute(
        `INSERT INTO admin_role_permissions (role_id, permission_key, allowed) VALUES (?, ?, 1)`,
        [roleId, key]
      )
    }
    await conn.commit()
    return { id: roleId, name: roleName, allowedKeys: keys }
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export async function updateRoleWithPermissions(pool, roleId, name, allowedKeys) {
  const role = await fetchRoleById(pool, roleId)
  if (!role) throw new Error('Role not found')

  const roleName = String(name || '').trim()
  if (!roleName) throw new Error('Role name is required')
  if (isMainAdminRole(role.name) && normalizeRoleKey(roleName) !== MAIN_ADMIN_ROLE) {
    throw new Error('Cannot rename the main admin role')
  }
  if (normalizeRoleKey(roleName) === MAIN_ADMIN_ROLE && !isMainAdminRole(role.name)) {
    throw new Error('Cannot rename a role to main admin')
  }

  await pool.execute(`UPDATE admin_roles SET name = ? WHERE id = ?`, [roleName, Number(roleId)])

  if (isMainAdminRole(role.name)) {
    return { id: Number(roleId), name: role.name, allowedKeys: ADMIN_PERMISSION_KEYS }
  }

  const keys = await saveRolePermissions(pool, roleId, allowedKeys)
  return { id: Number(roleId), name: roleName, allowedKeys: keys }
}

export function isMainAdminRoleName(name) {
  return isMainAdminRole(name)
}
