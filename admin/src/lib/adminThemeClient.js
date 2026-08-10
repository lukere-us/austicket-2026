/** Shared admin theme helpers (browser). */

export const ADMIN_THEME_COOKIE = 'aus_admin_theme'

export function normalizeTheme(raw) {
  return String(raw || '').trim().toLowerCase() === 'dark' ? 'dark' : 'light'
}

export function applyDocumentTheme(themeId) {
  if (typeof document === 'undefined') return
  const next = normalizeTheme(themeId)
  document.documentElement.dataset.adminTheme = next
  document.documentElement.classList.toggle('admin-theme-dark', next === 'dark')
  document.documentElement.classList.toggle('admin-theme-light', next === 'light')
  try {
    window.localStorage.setItem(ADMIN_THEME_COOKIE, next)
  } catch {
    // ignore
  }
  document.cookie = `${ADMIN_THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export async function persistAdminTheme(themeId, currentAdmin) {
  const theme = normalizeTheme(themeId)
  applyDocumentTheme(theme)
  const res = await fetch('/admin/api/theme', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ theme }),
  })
  if (!res.ok) throw new Error(`Failed to switch theme (${res.status})`)
  const data = await res.json()
  return data?.admin || { ...(currentAdmin || {}), theme }
}
