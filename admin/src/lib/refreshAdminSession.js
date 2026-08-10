import express from 'express'
import { dbPool } from '../db.js'
import { loadAdminPermissions } from './adminPermissions.js'

/** Keep `req.session.adminUser` in sync with DB (role + permissions). */
export async function refreshAdminSessionUser(req) {
  const u = req.session?.adminUser
  if (!u?.id) return

  const pool = dbPool()
  const [rows] = await pool.execute(
    `
      SELECT a.id, a.name, a.email, a.is_active, a.role_id, r.name AS role_name
      FROM admins a
      JOIN admin_roles r ON r.id = a.role_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [Number(u.id)]
  )

  const row = rows?.[0]
  if (!row || Number(row.is_active) !== 1) {
    delete req.session.adminUser
    return
  }

  const permissions = await loadAdminPermissions(pool, row.role_id, row.role_name)
  req.session.adminUser = {
    id: row.id,
    email: row.email,
    title: row.name,
    role: row.role_name,
    roleId: row.role_id,
    permissions,
    theme: u.theme === 'dark' ? 'dark' : 'light',
  }
}

export function adminSessionRefreshMiddleware() {
  return (req, res, next) => {
    void refreshAdminSessionUser(req)
      .then(() => next())
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('adminSessionRefresh', e)
        next()
      })
  }
}

/** Run express-session then refresh admin role/permissions (for JSON API routers). */
export function sessionWithAdminRefresh(sessionMiddleware) {
  const refresh = adminSessionRefreshMiddleware()
  return (req, res, next) => {
    sessionMiddleware(req, res, (err) => {
      if (err) return next(err)
      refresh(req, res, next)
    })
  }
}

/** Insert middleware immediately after express-session in an AdminJS router. */
export function attachAdminSessionRefresh(router) {
  const idx = router.stack.findIndex((layer) => layer.name === 'session')
  const insertAt = idx >= 0 ? idx + 1 : 0
  const refreshRouter = express.Router()
  refreshRouter.use(adminSessionRefreshMiddleware())
  router.stack.splice(insertAt, 0, ...refreshRouter.stack)
}
