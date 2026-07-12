export function uploadPathToAdminUrl(storedPath, rootPath = '/admin') {
  const raw = String(storedPath || '').trim()
  if (!raw) return null

  const rel = raw.startsWith('Upload/') ? raw.slice('Upload/'.length) : raw.replace(/^\/+/, '')
  if (!rel) return null

  return `${rootPath}/uploads-root/${rel.split('/').map(encodeURIComponent).join('/')}`
}

export function resolveAdminBrandLogoFromHeader(settings, rootPath = '/admin') {
  if (!settings || typeof settings !== 'object') return null
  const branding = settings.countryBranding && typeof settings.countryBranding === 'object'
    ? settings.countryBranding
    : {}
  const fromBranding =
    branding.AU?.logoUrl ||
    branding.NZ?.logoUrl ||
    Object.values(branding).find((e) => e && typeof e === 'object' && e.logoUrl)?.logoUrl ||
    ''
  const path = fromBranding || settings.logoAuUrl || settings.logoNzUrl || ''
  return uploadPathToAdminUrl(path, rootPath)
}
