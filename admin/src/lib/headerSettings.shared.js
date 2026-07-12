export const HEADER_SETTING_KEY = 'header'

const DEFAULT_NAV_LINKS = [
  { label: 'Blog', url: '/blogs', enabled: true },
]

const DEFAULTS = {
  siteName: 'AUS Ticket Lanka',
  // Legacy AU/NZ fields kept for older saved settings / admin login branding.
  siteNameAu: '',
  siteNameNz: '',
  taglineTemplate: "What's on across {location}",
  homeUrl: '/',
  logoAuUrl: '',
  logoNzUrl: '',
  /** @type {Record<string, { siteName: string, logoUrl: string }>} */
  countryBranding: {},
  useCountryBadge: true,
  customBadgeText: 'AUS',
  showSearch: true,
  showCountrySelector: true,
  showThemeToggle: true,
  showAuthButtons: true,
  loginLabel: 'Login',
  registerLabel: 'Register',
  navLinks: DEFAULT_NAV_LINKS,
}

export const FIELD_GROUPS = [
  {
    id: 'brand',
    label: 'Brand & logo',
    fields: [
      {
        key: 'siteName',
        label: 'Default site name',
        type: 'text',
        help: 'Used when a country has no site name of its own.',
      },
      {
        key: 'taglineTemplate',
        label: 'Tagline',
        type: 'text',
        help: 'Use {location} for the selected country name. Hidden on very small screens.',
      },
      { key: 'homeUrl', label: 'Home link URL', type: 'text' },
      {
        key: 'useCountryBadge',
        label: 'Use country code in badge when no logo',
        type: 'boolean',
      },
      {
        key: 'customBadgeText',
        label: 'Custom badge text',
        type: 'text',
        help: 'Used when country badge is off and no logo is uploaded for the active country.',
      },
    ],
  },
  {
    id: 'visibility',
    label: 'Header elements',
    fields: [
      { key: 'showSearch', label: 'Show search', type: 'boolean' },
      { key: 'showCountrySelector', label: 'Show country selector', type: 'boolean' },
      { key: 'showThemeToggle', label: 'Show theme toggle', type: 'boolean' },
      { key: 'showAuthButtons', label: 'Show login / register buttons', type: 'boolean' },
    ],
  },
  {
    id: 'auth',
    label: 'Auth button labels',
    fields: [
      { key: 'loginLabel', label: 'Login label', type: 'text' },
      { key: 'registerLabel', label: 'Register label', type: 'text' },
    ],
  },
]

function cloneNavLinks(items) {
  if (!Array.isArray(items)) return DEFAULT_NAV_LINKS.map((item) => ({ ...item }))
  return items
    .map((item) => ({
      label: String(item?.label ?? '').trim(),
      url: String(item?.url ?? '').trim(),
      enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
    }))
    .filter((item) => item.label && item.url)
}

function cloneText(raw) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeCountryCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

/**
 * @param {unknown} input
 * @returns {Record<string, { siteName: string, logoUrl: string }>}
 */
export function cloneCountryBranding(input) {
  const out = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out

  for (const [rawCode, rawEntry] of Object.entries(input)) {
    const code = normalizeCountryCode(rawCode)
    if (!code) continue
    const entry = rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry) ? rawEntry : {}
    out[code] = {
      siteName: cloneText(entry.siteName),
      logoUrl: cloneText(entry.logoUrl),
    }
  }
  return out
}

function seedCountryBrandingFromLegacy(branding, input) {
  const out = { ...branding }
  const logoAu = cloneText(input?.logoAuUrl)
  const logoNz = cloneText(input?.logoNzUrl)
  const nameAu = cloneText(input?.siteNameAu)
  const nameNz = cloneText(input?.siteNameNz)

  if (logoAu || nameAu) {
    out.AU = {
      siteName: out.AU?.siteName || nameAu,
      logoUrl: out.AU?.logoUrl || logoAu,
    }
  }
  if (logoNz || nameNz) {
    out.NZ = {
      siteName: out.NZ?.siteName || nameNz,
      logoUrl: out.NZ?.logoUrl || logoNz,
    }
  }

  const legacyLogo = cloneText(input?.logoImageUrl)
  if (legacyLogo) {
    if (!out.AU) out.AU = { siteName: '', logoUrl: '' }
    if (!out.NZ) out.NZ = { siteName: '', logoUrl: '' }
    if (!out.AU.logoUrl) out.AU.logoUrl = legacyLogo
    if (!out.NZ.logoUrl) out.NZ.logoUrl = legacyLogo
  }

  return out
}

function syncLegacyFromCountryBranding(out) {
  out.logoAuUrl = out.countryBranding?.AU?.logoUrl || ''
  out.logoNzUrl = out.countryBranding?.NZ?.logoUrl || ''
  out.siteNameAu = out.countryBranding?.AU?.siteName || ''
  out.siteNameNz = out.countryBranding?.NZ?.siteName || ''
  return out
}

function clampBool(raw, fallback) {
  if (typeof raw === 'boolean') return raw
  if (raw === 1 || raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true
  if (raw === 0 || raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return fallback
}

function coerceValue(field, raw, fallback) {
  if (field.type === 'boolean') return clampBool(raw, fallback)
  if (field.type === 'text') {
    const s = String(raw ?? '').trim()
    return s || fallback
  }
  return fallback
}

export function defaultHeaderSettings() {
  return {
    ...DEFAULTS,
    countryBranding: {},
    navLinks: DEFAULT_NAV_LINKS.map((item) => ({ ...item })),
  }
}

export function headerSettingFields() {
  return FIELD_GROUPS
}

export function getCountryBrandingEntry(settings, countryCode) {
  const code = normalizeCountryCode(countryCode)
  if (!code) return { siteName: '', logoUrl: '' }
  const entry = settings?.countryBranding?.[code]
  if (entry && typeof entry === 'object') {
    return {
      siteName: cloneText(entry.siteName),
      logoUrl: cloneText(entry.logoUrl),
    }
  }
  // Legacy fallback
  if (code === 'AU') {
    return { siteName: cloneText(settings?.siteNameAu), logoUrl: cloneText(settings?.logoAuUrl) }
  }
  if (code === 'NZ') {
    return { siteName: cloneText(settings?.siteNameNz), logoUrl: cloneText(settings?.logoNzUrl) }
  }
  return { siteName: '', logoUrl: '' }
}

export function mergeHeaderSettings(input) {
  const base = defaultHeaderSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  const skip = new Set([
    'navLinks',
    'countryBranding',
    'logoAuUrl',
    'logoNzUrl',
    'siteNameAu',
    'siteNameNz',
  ])

  for (const key of Object.keys(base)) {
    if (skip.has(key)) continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'navLinks')) {
    out.navLinks = cloneNavLinks(input.navLinks)
  }

  let branding = {}
  if (input && Object.prototype.hasOwnProperty.call(input, 'countryBranding')) {
    branding = cloneCountryBranding(input.countryBranding)
  }
  branding = seedCountryBrandingFromLegacy(branding, input || {})
  out.countryBranding = branding

  return syncLegacyFromCountryBranding(out)
}
