import { ADMIN_PERMISSION_KEYS } from './adminPermissions.shared.js'
import { SITE_SETTINGS_SECTIONS } from './siteSettingsSections.shared.js'

const MAIN_ADMIN_ROLE = 'main_admin'
const STANDARD_ACTIONS = ['list', 'show', 'new', 'edit', 'delete', 'bulkDelete']

export function normalizeRoleKey(roleName) {
  return String(roleName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function isMainAdminRole(roleName) {
  return normalizeRoleKey(roleName) === MAIN_ADMIN_ROLE
}

/** @returns {Record<string, true>} */
export async function loadAdminPermissions(pool, roleId, roleName) {
  if (isMainAdminRole(roleName)) {
    return { __all: true }
  }

  const [rows] = await pool.execute(
    `SELECT permission_key, allowed FROM admin_role_permissions WHERE role_id = ?`,
    [Number(roleId)]
  )

  const permissions = {}
  for (const row of rows || []) {
    if (Number(row.allowed) === 1 && row.permission_key) {
      permissions[String(row.permission_key)] = true
    }
  }
  return permissions
}

export function can(admin, permissionKey) {
  if (!admin || !permissionKey) return false
  if (isMainAdminRole(admin.role)) return true
  if (admin.permissions?.__all) return true
  return Boolean(admin.permissions?.[permissionKey])
}

export function canAny(admin, permissionKeys) {
  return Array.isArray(permissionKeys) && permissionKeys.some((key) => can(admin, key))
}

function mergeAccessible(existingAccessible, check) {
  return (context) => {
    if (!check(context)) return false
    if (existingAccessible === false) return false
    if (typeof existingAccessible === 'function') return existingAccessible(context)
    return true
  }
}

/**
 * Attach `isAccessible` guards to standard CRUD actions (+ optional custom actions).
 * @param {object} options AdminJS resource options
 * @param {string} resourceId table / resource id
 * @param {string[]} [extraActions] e.g. ['duplicate']
 */
export function applyPermissionsToResourceOptions(options, resourceId, extraActions = []) {
  const next = { ...options, actions: { ...(options.actions || {}) } }
  const actions = next.actions

  for (const action of STANDARD_ACTIONS) {
    const current = actions[action]
    const currentObj = current && typeof current === 'object' ? current : {}
    actions[action] = {
      ...currentObj,
      isAccessible: mergeAccessible(currentObj.isAccessible, (ctx) =>
        can(ctx.currentAdmin, `${resourceId}.${action}`)
      ),
    }
  }

  for (const action of extraActions) {
    const current = actions[action]
    const currentObj = current && typeof current === 'object' ? current : {}
    actions[action] = {
      ...currentObj,
      isAccessible: mergeAccessible(currentObj.isAccessible, (ctx) =>
        can(ctx.currentAdmin, `${resourceId}.${action}`)
      ),
    }
  }

  return next
}

export function canAccessPage(admin, pageKey) {
  return can(admin, `pages.${pageKey}`)
}

export function canAccessSiteSettingsSection(admin, sectionId) {
  switch (sectionId) {
    case 'sliderBanner':
      return canAccessPage(admin, 'sliderBanner')
    case 'homeListings':
      return canAccessPage(admin, 'homeListings')
    case 'footer':
      return canAny(admin, ['pages.footer', 'pages.homeListings', 'pages.sliderBanner'])
    case 'header':
      return canAny(admin, ['pages.header', 'pages.homeListings', 'pages.sliderBanner'])
    case 'partners':
      return canAny(admin, ['pages.partners', 'pages.homeListings', 'pages.sliderBanner'])
    case 'ads':
      return canAny(admin, ['pages.ads', 'pages.homeListings', 'pages.sliderBanner'])
    case 'youtubeCarousel':
      return canAny(admin, ['pages.youtubeCarousel', 'pages.homeListings', 'pages.sliderBanner'])
    default:
      return false
  }
}

export function accessibleSiteSettingsSections(admin) {
  return SITE_SETTINGS_SECTIONS.filter((section) => canAccessSiteSettingsSection(admin, section.id))
}

export function canAccessAnySiteSettings(admin) {
  return accessibleSiteSettingsSections(admin).length > 0
}

export function allPermissionKeys() {
  return [...ADMIN_PERMISSION_KEYS]
}
