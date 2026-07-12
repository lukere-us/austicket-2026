export const ADS_SETTING_KEY = 'site_ads'

export const AD_TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'youtube', label: 'Video (YouTube)' },
  { value: 'html', label: 'Embed HTML' },
  { value: 'iframe', label: 'Iframe' },
]

export const PUBLISH_STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
]

const DEFAULTS = {
  publishStatus: 'published',
  adsPerRow: 2,
  sectionTitle: '',
  items: [],
}

export const FIELD_GROUPS = [
  {
    id: 'settings',
    label: 'Ad settings',
    fields: [
      {
        key: 'publishStatus',
        label: 'Publish status',
        type: 'select',
        options: PUBLISH_STATUS_OPTIONS,
        help: 'Draft hides ads on the public site. Published shows them on homepage, listing detail, and blog detail.',
      },
      {
        key: 'adsPerRow',
        label: 'Ads per row',
        type: 'number',
        min: 1,
        max: 4,
        step: 1,
        help: 'Homepage grid columns (1–4). Sidebar always shows one column.',
      },
      {
        key: 'sectionTitle',
        label: 'Section title (optional)',
        type: 'text',
        help: 'Shown above the homepage ads block. Leave blank for no title.',
      },
    ],
  },
]

function clampBool(raw, fallback) {
  if (typeof raw === 'boolean') return raw
  if (raw === 1 || raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true
  if (raw === 0 || raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return fallback
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function normalizeAdType(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'image' || s === 'youtube' || s === 'html' || s === 'iframe') return s
  return 'image'
}

function cloneItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => {
      const adType = normalizeAdType(item?.adType)
      const out = {
        id: String(item?.id ?? `ad-${index + 1}`).trim(),
        adType,
        title: String(item?.title ?? '').trim(),
        imageUrl: String(item?.imageUrl ?? '').trim(),
        linkUrl: String(item?.linkUrl ?? '').trim(),
        youtubeUrl: String(item?.youtubeUrl ?? '').trim(),
        embedHtml: String(item?.embedHtml ?? '').trim(),
        iframeUrl: String(item?.iframeUrl ?? '').trim(),
        enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
      }
      return out
    })
    .filter((item) => {
      if (item.adType === 'image') return Boolean(item.imageUrl)
      if (item.adType === 'youtube') return Boolean(item.youtubeUrl)
      if (item.adType === 'html') return Boolean(item.embedHtml)
      if (item.adType === 'iframe') return Boolean(item.iframeUrl)
      return false
    })
}

function coerceValue(field, raw, fallback) {
  if (field.type === 'boolean') return clampBool(raw, fallback)
  if (field.type === 'select') {
    const allowed = (field.options || []).map((o) => String(o.value))
    const s = String(raw ?? '').trim().toLowerCase()
    return allowed.includes(s) ? s : fallback
  }
  if (field.type === 'text') {
    const s = String(raw ?? '').trim()
    return s || fallback
  }
  if (field.type === 'number') {
    return clampNumber(raw, field.min ?? -Infinity, field.max ?? Infinity, fallback)
  }
  return fallback
}

export function defaultAdsSettings() {
  return {
    ...DEFAULTS,
    items: [],
  }
}

export function adsSettingFields() {
  return FIELD_GROUPS
}

export function mergeAdsSettings(input) {
  const base = defaultAdsSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  for (const key of Object.keys(base)) {
    if (key === 'items') continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  // Legacy enabled boolean → publishStatus
  if (input && Object.prototype.hasOwnProperty.call(input, 'enabled') && !Object.prototype.hasOwnProperty.call(input, 'publishStatus')) {
    out.publishStatus = clampBool(input.enabled, true) ? 'published' : 'draft'
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'items')) {
    out.items = cloneItems(input.items)
  }

  return out
}
