export const HOME_HERO_SETTING_KEY = 'home_hero'

const DEFAULTS = {
  autoplayEnabled: true,
  autoplayIntervalMs: 5000,
  pauseOnHover: true,
  transitionDurationMs: 700,
  maxSlides: 7,
  swipeThresholdPx: 40,
  showNavButtons: true,
  showDots: true,
  showReflection: false,
  posterHeightMobileActive: 250,
  posterHeightDesktopActive: 450,
  posterHeightMobileInactive: 200,
  posterHeightDesktopInactive: 360,
  stageHeightMobile: 400,
  stageHeightDesktop: 520,
  slideGap: -30,
  spreadMobile: -30,
  spreadDesktop: -30,
  inactiveBlurPx: 3,
  inactiveOpacity: 0.88,
  inactiveScale: 0.64,
  activeScale: 1,
  rotateYMobile: 32,
  rotateYDesktop: 40,
  translateZActive: 50,
  translateZInactive: -90,
  backgroundBlurPx: 8,
  backgroundFadeMs: 700,
  backgroundTransition: 'fade',
  useTrailerVideo: true,
  backgroundObjectPosition: 'top center',
  backgroundScalePercent: 105,
  backgroundSaturationPercent: 125,
  scrimBaseOpacity: 35,
  scrimGradientTopOpacity: 20,
  scrimGradientMidOpacity: 45,
  scrimGradientBottomOpacity: 90,
  scrimSideOpacity: 55,
}

export const FIELD_GROUPS = [
  {
    id: 'autoplay',
    label: 'Autoplay & interaction',
    fields: [
      { key: 'autoplayEnabled', label: 'Autoplay enabled', type: 'boolean', help: 'Automatically advance slides.' },
      { key: 'autoplayIntervalMs', label: 'Autoplay interval (ms)', type: 'number', min: 2000, max: 60000, step: 500 },
      { key: 'pauseOnHover', label: 'Pause on hover', type: 'boolean' },
      { key: 'transitionDurationMs', label: 'Slide transition (ms)', type: 'number', min: 200, max: 3000, step: 50 },
      { key: 'maxSlides', label: 'Max featured slides', type: 'number', min: 1, max: 12, step: 1 },
      { key: 'swipeThresholdPx', label: 'Swipe threshold (px)', type: 'number', min: 10, max: 200, step: 5 },
      { key: 'showNavButtons', label: 'Show prev/next buttons', type: 'boolean' },
      { key: 'showDots', label: 'Show dot indicators', type: 'boolean' },
      { key: 'showReflection', label: 'Show poster reflection', type: 'boolean' },
    ],
  },
  {
    id: 'layout',
    label: 'Carousel layout (3D)',
    fields: [
      {
        key: 'slideGap',
        label: 'Slide gap (px)',
        type: 'number',
        min: -80,
        max: 500,
        step: 1,
        help: 'Horizontal distance between slide centers. Use negative values to overlap slides (e.g. -30).',
      },
      { key: 'inactiveBlurPx', label: 'Inactive slide blur (px)', type: 'number', min: 0, max: 20, step: 1 },
      { key: 'inactiveOpacity', label: 'Inactive slide opacity', type: 'number', min: 0, max: 1, step: 0.01 },
      { key: 'inactiveScale', label: 'Inactive slide scale', type: 'number', min: 0.2, max: 1, step: 0.01 },
      { key: 'activeScale', label: 'Active slide scale', type: 'number', min: 0.5, max: 1.2, step: 0.01 },
      { key: 'rotateYMobile', label: 'Rotate Y — mobile (deg)', type: 'number', min: 0, max: 90, step: 1 },
      { key: 'rotateYDesktop', label: 'Rotate Y — desktop (deg)', type: 'number', min: 0, max: 90, step: 1 },
      { key: 'translateZActive', label: 'Active translate Z (px)', type: 'number', min: -200, max: 200, step: 1 },
      { key: 'translateZInactive', label: 'Inactive translate Z (px)', type: 'number', min: -300, max: 100, step: 1 },
    ],
  },
  {
    id: 'posters',
    label: 'Poster sizes',
    fields: [
      { key: 'posterHeightMobileActive', label: 'Active poster height — mobile (px)', type: 'number', min: 120, max: 600, step: 10 },
      { key: 'posterHeightDesktopActive', label: 'Active poster height — desktop (px)', type: 'number', min: 200, max: 800, step: 10 },
      { key: 'posterHeightMobileInactive', label: 'Inactive poster height — mobile (px)', type: 'number', min: 100, max: 500, step: 10 },
      { key: 'posterHeightDesktopInactive', label: 'Inactive poster height — desktop (px)', type: 'number', min: 150, max: 700, step: 10 },
      { key: 'stageHeightMobile', label: 'Carousel stage height — mobile (px)', type: 'number', min: 200, max: 700, step: 10 },
      { key: 'stageHeightDesktop', label: 'Carousel stage height — desktop (px)', type: 'number', min: 300, max: 900, step: 10 },
    ],
  },
  {
    id: 'banner',
    label: 'Hero banner background',
    fields: [
      { key: 'backgroundBlurPx', label: 'Background blur (px)', type: 'number', min: 0, max: 40, step: 1 },
      { key: 'backgroundFadeMs', label: 'Background fade duration (ms)', type: 'number', min: 200, max: 3000, step: 50 },
      {
        key: 'backgroundTransition',
        label: 'Background transition',
        type: 'select',
        options: [
          { value: 'fade', label: 'Fade in / out' },
          { value: 'slide', label: 'Horizontal slide' },
        ],
      },
      { key: 'useTrailerVideo', label: 'Use YouTube trailer as background when available', type: 'boolean' },
      { key: 'backgroundObjectPosition', label: 'Background image position', type: 'text' },
      { key: 'backgroundScalePercent', label: 'Background image scale (%)', type: 'number', min: 100, max: 150, step: 1 },
      { key: 'backgroundSaturationPercent', label: 'Background saturation (%)', type: 'number', min: 50, max: 200, step: 5 },
    ],
  },
  {
    id: 'scrims',
    label: 'Overlay scrims (0–100%)',
    fields: [
      { key: 'scrimBaseOpacity', label: 'Base overlay', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'scrimGradientTopOpacity', label: 'Gradient top', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'scrimGradientMidOpacity', label: 'Gradient middle', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'scrimGradientBottomOpacity', label: 'Gradient bottom', type: 'number', min: 0, max: 100, step: 1 },
      { key: 'scrimSideOpacity', label: 'Side vignette', type: 'number', min: 0, max: 100, step: 1 },
    ],
  },
]

export function defaultHomeHeroSettings() {
  return { ...DEFAULTS }
}

export function homeHeroSettingFields() {
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

export function mergeHomeHeroSettings(input) {
  const base = defaultHomeHeroSettings()
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

  if (input && input.slideGap === undefined) {
    if (input.spreadDesktop !== undefined) out.slideGap = out.spreadDesktop
    else if (input.spreadMobile !== undefined) out.slideGap = out.spreadMobile
  }

  if (typeof out.slideGap === 'number') {
    out.spreadMobile = out.slideGap
    out.spreadDesktop = out.slideGap
  }

  return out
}
