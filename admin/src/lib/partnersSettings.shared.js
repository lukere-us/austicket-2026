export const PARTNERS_SETTING_KEY = 'home_partners'

const DEFAULTS = {
  enabled: true,
  sectionTitle: 'Our partners',
  speedSeconds: 35,
  pauseOnHover: true,
  logoMaxHeight: 100,
  gapPx: 48,
  showDecorLines: true,
  loadSequence: 'ascending',
  logos: [],
}

export const LOAD_SEQUENCE_OPTIONS = [
  { value: 'random', label: 'Random' },
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
]

export const FIELD_GROUPS = [
  {
    id: 'section',
    label: 'Section',
    fields: [
      { key: 'enabled', label: 'Show partners slider on homepage', type: 'boolean' },
      { key: 'sectionTitle', label: 'Section title', type: 'text' },
      { key: 'showDecorLines', label: 'Show decorative lines beside title', type: 'boolean' },
    ],
  },
  {
    id: 'slider',
    label: 'Slider animation',
    fields: [
      {
        key: 'loadSequence',
        label: 'Loading sequence',
        type: 'select',
        options: LOAD_SEQUENCE_OPTIONS,
        help: 'Order logos appear in the slider. Ascending uses the list order below; descending reverses it; random shuffles on each page load.',
      },
      {
        key: 'speedSeconds',
        label: 'Full scroll duration (seconds)',
        type: 'number',
        min: 8,
        max: 120,
        step: 1,
        help: 'Higher = slower scroll. One full loop of all logos.',
      },
      { key: 'pauseOnHover', label: 'Pause when mouse hovers', type: 'boolean' },
      {
        key: 'logoMaxHeight',
        label: 'Logo max height (px)',
        type: 'number',
        min: 32,
        max: 120,
        step: 1,
      },
      {
        key: 'gapPx',
        label: 'Space between logos (px)',
        type: 'number',
        min: 16,
        max: 120,
        step: 4,
      },
    ],
  },
]

function cloneLogos(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => ({
      id: String(item?.id ?? `partner-${index + 1}`).trim(),
      name: String(item?.name ?? '').trim(),
      imageUrl: String(item?.imageUrl ?? '').trim(),
      linkUrl: String(item?.linkUrl ?? '').trim(),
      enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
    }))
    .filter((item) => item.imageUrl)
}

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

export function defaultPartnersSettings() {
  return {
    ...DEFAULTS,
    logos: [],
  }
}

export function partnersSettingFields() {
  return FIELD_GROUPS
}

export function mergePartnersSettings(input) {
  const base = defaultPartnersSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  for (const key of Object.keys(base)) {
    if (key === 'logos') continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'logos')) {
    out.logos = cloneLogos(input.logos)
  }

  return out
}
