export const FOOTER_SETTING_KEY = 'footer'

const DEFAULT_USEFUL_LINKS = [
  { label: 'About us', url: '/about', enabled: true },
  { label: 'Contact us', url: '/contact', enabled: true },
  { label: 'Blog', url: '/blogs', enabled: true },
  { label: 'Privacy policy', url: '/privacy', enabled: true },
  { label: 'Terms of use', url: '/terms', enabled: true },
]

const DEFAULT_SOCIAL_LINKS = [
  { platform: 'facebook', label: 'Facebook', url: '', iconUrl: '', enabled: false },
  { platform: 'instagram', label: 'Instagram', url: '', iconUrl: '', enabled: false },
  { platform: 'twitter', label: 'X (Twitter)', url: '', iconUrl: '', enabled: false },
  { platform: 'youtube', label: 'YouTube', url: '', iconUrl: '', enabled: false },
  { platform: 'tiktok', label: 'TikTok', url: '', iconUrl: '', enabled: false },
  { platform: 'linkedin', label: 'LinkedIn', url: '', iconUrl: '', enabled: false },
]

const DEFAULTS = {
  aboutTitle: 'AUS Ticket Lanka',
  aboutDescription:
    'A modern listings experience that connects you to official booking links for movies and live events.',
  citiesHeading: 'Popular cities',
  showAllEventsLink: true,
  allEventsLabel: 'All events',
  allEventsUrl: '/listings',
  maxAutoCities: 8,
  cityLinks: [],
  linksHeading: 'Useful links',
  usefulLinks: DEFAULT_USEFUL_LINKS,
  contactHeading: 'Contact details',
  contactEmail: 'info@austicketlanka.com',
  contactPhone: '',
  socialHeading: 'Follow us',
  socialLinks: DEFAULT_SOCIAL_LINKS,
  copyrightText: '© {year} AUS Ticket Lanka. All rights reserved.',
}

export const FIELD_GROUPS = [
  {
    id: 'about',
    label: 'About column',
    fields: [
      { key: 'aboutTitle', label: 'Title', type: 'text' },
      { key: 'aboutDescription', label: 'Description', type: 'textarea', rows: 4 },
    ],
  },
  {
    id: 'cities',
    label: 'Popular cities column',
    fields: [
      { key: 'citiesHeading', label: 'Column heading', type: 'text' },
      { key: 'showAllEventsLink', label: 'Show “All events” link', type: 'boolean' },
      { key: 'allEventsLabel', label: 'All events label', type: 'text' },
      { key: 'allEventsUrl', label: 'All events URL', type: 'text' },
      {
        key: 'maxAutoCities',
        label: 'Max cities (when using auto list)',
        type: 'number',
        min: 1,
        max: 24,
        step: 1,
        help: 'Used when no custom city links are added below.',
      },
    ],
  },
  {
    id: 'links',
    label: 'Useful links column',
    fields: [{ key: 'linksHeading', label: 'Column heading', type: 'text' }],
  },
  {
    id: 'contact',
    label: 'Contact column',
    fields: [
      { key: 'contactHeading', label: 'Column heading', type: 'text' },
      { key: 'contactEmail', label: 'Email address', type: 'text' },
      { key: 'contactPhone', label: 'Phone number', type: 'text' },
      { key: 'socialHeading', label: 'Social media heading', type: 'text' },
    ],
  },
  {
    id: 'copyright',
    label: 'Copyright bar',
    fields: [
      {
        key: 'copyrightText',
        label: 'Copyright text',
        type: 'text',
        help: 'Use {year} for the current year.',
      },
    ],
  },
]

function cloneLinks(items, fallback) {
  const base = !Array.isArray(items) || items.length === 0 ? fallback.map((item) => ({ ...item })) : items.map((item) => ({
    label: String(item?.label ?? '').trim(),
    url: String(item?.url ?? '').trim(),
    enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
  }))

  const blogDefault = fallback.find((item) => item.url === '/blogs')
  if (blogDefault && !base.some((item) => item.url === '/blogs')) {
    const contactIdx = base.findIndex((item) => item.url === '/contact')
    if (contactIdx >= 0) base.splice(contactIdx + 1, 0, { ...blogDefault })
    else base.push({ ...blogDefault })
  }

  return base
}

function cloneCityLinks(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => ({
      label: String(item?.label ?? item?.name ?? '').trim(),
      url: String(item?.url ?? '').trim(),
      enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
    }))
    .filter((item) => item.label && item.url)
}

function cloneSocialLinks(items, fallback) {
  const platforms = new Map(fallback.map((s) => [s.platform, { ...s }]))
  if (!Array.isArray(items)) return Array.from(platforms.values())

  for (const raw of items) {
    const platform = String(raw?.platform ?? '').trim().toLowerCase()
    if (!platform || !platforms.has(platform)) continue
    const base = platforms.get(platform)
    platforms.set(platform, {
      ...base,
      label: String(raw?.label ?? base.label).trim() || base.label,
      url: String(raw?.url ?? '').trim(),
      iconUrl: String(raw?.iconUrl ?? base.iconUrl ?? '').trim(),
      enabled: raw?.enabled === true || raw?.enabled === 1 || raw?.enabled === '1',
    })
  }
  return Array.from(platforms.values())
}

function clampNumber(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

function coerceBool(raw, fallback) {
  if (typeof raw === 'boolean') return raw
  if (raw === 1 || raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true
  if (raw === 0 || raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return fallback
}

function coerceValue(field, raw, fallback) {
  if (field.type === 'boolean') return coerceBool(raw, fallback)
  if (field.type === 'textarea' || field.type === 'text') {
    const s = String(raw ?? '').trim()
    return field.type === 'textarea' ? s || fallback : s || fallback
  }
  if (field.type === 'number') {
    const n = clampNumber(raw, field.min ?? -Infinity, field.max ?? Infinity)
    return n === null ? fallback : n
  }
  return fallback
}

export function defaultFooterSettings() {
  return {
    ...DEFAULTS,
    usefulLinks: DEFAULT_USEFUL_LINKS.map((item) => ({ ...item })),
    socialLinks: DEFAULT_SOCIAL_LINKS.map((item) => ({ ...item })),
    cityLinks: [],
  }
}

export function footerSettingFields() {
  return FIELD_GROUPS
}

export function mergeFooterSettings(input) {
  const base = defaultFooterSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  for (const key of Object.keys(base)) {
    if (key === 'usefulLinks' || key === 'socialLinks' || key === 'cityLinks') continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'usefulLinks')) {
    out.usefulLinks = cloneLinks(input.usefulLinks, DEFAULT_USEFUL_LINKS)
  }
  if (input && Object.prototype.hasOwnProperty.call(input, 'socialLinks')) {
    out.socialLinks = cloneSocialLinks(input.socialLinks, DEFAULT_SOCIAL_LINKS)
  }
  if (input && Object.prototype.hasOwnProperty.call(input, 'cityLinks')) {
    out.cityLinks = cloneCityLinks(input.cityLinks)
  }

  return out
}
