export const HOME_LISTINGS_SETTING_KEY = 'home_listings'

const DEFAULTS = {
  columnsMobile: 2,
  columnsTablet: 3,
  columnsDesktop: 4,
  maxListings: 0,
  gridGapX: 16,
  gridGapY: 32,
  showCityTabs: true,
  locationTabsMode: 'cities',
  showSectionDecorLines: true,
  sectionTitle: 'Top Events in {location}',
  sectionSubtitle: 'Find Events in Your City.',
  showTypeBadge: true,
  showHoverCta: true,
  showTitleBelowCard: true,
  cardHoverLift: true,
  cardImageAspect: '2/3',
  animationEnabled: true,
  animationStaggerMs: 50,
  skeletonCount: 8,
  emptyStateShowAdminLink: true,
}

export const FIELD_GROUPS = [
  {
    id: 'grid',
    label: 'Listing grid',
    fields: [
      { key: 'columnsMobile', label: 'Columns per row — mobile', type: 'number', min: 1, max: 4, step: 1 },
      { key: 'columnsTablet', label: 'Columns per row — tablet (640px+)', type: 'number', min: 1, max: 6, step: 1 },
      { key: 'columnsDesktop', label: 'Columns per row — desktop (1024px+)', type: 'number', min: 1, max: 8, step: 1 },
      {
        key: 'maxListings',
        label: 'Listings per page',
        type: 'number',
        min: 0,
        max: 96,
        step: 1,
        help: '0 = default page size (3 rows). Set a number for listings per page.',
      },
      { key: 'gridGapX', label: 'Horizontal gap (px)', type: 'number', min: 0, max: 64, step: 4 },
      { key: 'gridGapY', label: 'Vertical gap (px)', type: 'number', min: 0, max: 96, step: 4 },
      { key: 'skeletonCount', label: 'Skeleton cards while loading', type: 'number', min: 4, max: 24, step: 1 },
    ],
  },
  {
    id: 'section',
    label: 'Section header',
    fields: [
      { key: 'showCityTabs', label: 'Show location tabs', type: 'boolean' },
      {
        key: 'locationTabsMode',
        label: 'Location tabs show',
        type: 'select',
        options: [
          { value: 'cities', label: 'Cities' },
          { value: 'states', label: 'States' },
        ],
        help: 'Homepage Top Events navigation: filter by city or by state. Clicking a tab loads matching events.',
      },
      { key: 'showSectionDecorLines', label: 'Show decorative lines beside title', type: 'boolean' },
      {
        key: 'sectionTitle',
        label: 'Section title',
        type: 'text',
        help: 'Use {location} for the city, state, or country name.',
      },
      { key: 'sectionSubtitle', label: 'Section subtitle', type: 'text' },
    ],
  },
  {
    id: 'cards',
    label: 'Event cards',
    fields: [
      { key: 'showTypeBadge', label: 'Show type badge on poster', type: 'boolean' },
      { key: 'showHoverCta', label: 'Show “View details” on hover', type: 'boolean' },
      { key: 'showTitleBelowCard', label: 'Show title below poster', type: 'boolean' },
      { key: 'cardHoverLift', label: 'Lift card on hover', type: 'boolean' },
      {
        key: 'cardImageAspect',
        label: 'Poster aspect ratio',
        type: 'select',
        options: [
          { value: '2/3', label: '2:3 (portrait)' },
          { value: '3/4', label: '3:4' },
          { value: '1/1', label: '1:1 (square)' },
        ],
      },
      { key: 'animationEnabled', label: 'Staggered fade-in animation', type: 'boolean' },
      { key: 'animationStaggerMs', label: 'Animation stagger (ms)', type: 'number', min: 0, max: 200, step: 10 },
    ],
  },
  {
    id: 'empty',
    label: 'Empty state',
    fields: [
      { key: 'emptyStateShowAdminLink', label: 'Show link to admin panel when empty', type: 'boolean' },
    ],
  },
]

export function defaultHomeListingsSettings() {
  return { ...DEFAULTS }
}

export function homeListingsSettingFields() {
  return FIELD_GROUPS
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
  if (field.type === 'select') {
    const allowed = new Set((field.options || []).map((o) => o.value))
    return allowed.has(raw) ? raw : fallback
  }
  if (field.type === 'text') {
    const s = String(raw ?? '').trim()
    return s || fallback
  }
  if (field.type === 'number') {
    if (raw === '' || raw === '-') return fallback
    const n = clampNumber(raw, field.min ?? -Infinity, field.max ?? Infinity)
    return n === null ? fallback : n
  }
  return fallback
}

export function mergeHomeListingsSettings(input) {
  const base = defaultHomeListingsSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }
  for (const key of Object.keys(base)) {
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }
  return out
}
