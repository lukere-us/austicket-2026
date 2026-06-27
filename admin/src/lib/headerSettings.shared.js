export const HEADER_SETTING_KEY = 'header'

const DEFAULT_NAV_LINKS = [
  { label: 'Blog', url: '/blogs', enabled: true },
]

const DEFAULTS = {
  siteName: 'AUS Ticket Lanka',
  taglineTemplate: "What's on across {location}",
  homeUrl: '/',
  logoAuUrl: '',
  logoNzUrl: '',
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
      { key: 'siteName', label: 'Site name', type: 'text' },
      {
        key: 'taglineTemplate',
        label: 'Tagline',
        type: 'text',
        help: 'Use {location} for the selected country name. Hidden on very small screens.',
      },
      { key: 'homeUrl', label: 'Home link URL', type: 'text' },
      { key: 'useCountryBadge', label: 'Use country code in badge when no logo (AU / NZ)', type: 'boolean' },
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
  return items.map((item) => ({
    label: String(item?.label ?? '').trim(),
    url: String(item?.url ?? '').trim(),
    enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
  }))
}

function cloneLogoUrl(raw) {
  return typeof raw === 'string' ? raw.trim() : ''
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
    navLinks: DEFAULT_NAV_LINKS.map((item) => ({ ...item })),
  }
}

export function headerSettingFields() {
  return FIELD_GROUPS
}

export function mergeHeaderSettings(input) {
  const base = defaultHeaderSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  for (const key of Object.keys(base)) {
    if (key === 'navLinks' || key === 'logoAuUrl' || key === 'logoNzUrl') continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'navLinks')) {
    out.navLinks = cloneNavLinks(input.navLinks)
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'logoAuUrl')) {
    out.logoAuUrl = cloneLogoUrl(input.logoAuUrl)
  }
  if (input && Object.prototype.hasOwnProperty.call(input, 'logoNzUrl')) {
    out.logoNzUrl = cloneLogoUrl(input.logoNzUrl)
  }

  // Legacy single logo field
  if (input?.logoImageUrl && !out.logoAuUrl && !out.logoNzUrl) {
    const legacy = cloneLogoUrl(input.logoImageUrl)
    out.logoAuUrl = legacy
    out.logoNzUrl = legacy
  }

  return out
}
