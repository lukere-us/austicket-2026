export function uploadPathToAdminUrl(storedPath, rootPath = '/admin') {
  const raw = String(storedPath || '').trim()
  if (!raw) return null

  const rel = raw.startsWith('Upload/') ? raw.slice('Upload/'.length) : raw.replace(/^\/+/, '')
  if (!rel) return null

  return `${rootPath}/uploads-root/${rel.split('/').map(encodeURIComponent).join('/')}`
}

export function resolveAdminBrandLogoFromHeader(settings, rootPath = '/admin') {
  if (!settings || typeof settings !== 'object') return null
  const path = settings.logoAuUrl || settings.logoNzUrl || ''
  return uploadPathToAdminUrl(path, rootPath)
}
