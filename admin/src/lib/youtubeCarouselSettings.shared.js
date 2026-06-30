export const YOUTUBE_CAROUSEL_SETTING_KEY = 'home_youtube_carousel'

const DEFAULTS = {
  enabled: true,
  sectionTitle: 'Our Streaming',
  showDecorLines: true,
  autoplayCarousel: false,
  scrollSeconds: 8,
  videos: [],
}

export const FIELD_GROUPS = [
  {
    id: 'section',
    label: 'Section',
    fields: [
      { key: 'enabled', label: 'Show YouTube carousel on homepage', type: 'boolean' },
      { key: 'sectionTitle', label: 'Section title', type: 'text' },
      { key: 'showDecorLines', label: 'Show decorative lines beside title', type: 'boolean' },
    ],
  },
  {
    id: 'carousel',
    label: 'Carousel',
    fields: [
      { key: 'autoplayCarousel', label: 'Auto-advance slides', type: 'boolean' },
      {
        key: 'scrollSeconds',
        label: 'Seconds between auto-advance',
        type: 'number',
        min: 3,
        max: 60,
        step: 1,
        help: 'Only applies when auto-advance is enabled.',
      },
    ],
  },
]

export function extractYoutubeVideoId(url) {
  const raw = String(url ?? '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    if (host === 'youtu.be') {
      return parsed.pathname.replace(/^\//, '').split('/')[0] || ''
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.replace('/embed/', '').split('/')[0] || ''
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.replace('/shorts/', '').split('/')[0] || ''
      }
      return parsed.searchParams.get('v') || ''
    }
  } catch {
    return ''
  }
  return ''
}

function cloneVideos(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item, index) => {
      const youtubeUrl = String(item?.youtubeUrl ?? '').trim()
      const videoId = extractYoutubeVideoId(youtubeUrl)
      return {
        id: String(item?.id ?? `video-${index + 1}`).trim(),
        title: String(item?.title ?? '').trim(),
        youtubeUrl,
        videoId,
        enabled: item?.enabled !== false && item?.enabled !== 0 && item?.enabled !== '0',
      }
    })
    .filter((item) => item.videoId)
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
  if (field.type === 'text') {
    const s = String(raw ?? '').trim()
    return s || fallback
  }
  if (field.type === 'number') {
    return clampNumber(raw, field.min ?? -Infinity, field.max ?? Infinity, fallback)
  }
  return fallback
}

export function defaultYoutubeCarouselSettings() {
  return {
    ...DEFAULTS,
    videos: [],
  }
}

export function youtubeCarouselSettingFields() {
  return FIELD_GROUPS
}

export function mergeYoutubeCarouselSettings(input) {
  const base = defaultYoutubeCarouselSettings()
  const out = { ...base }
  const fieldByKey = new Map()
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) fieldByKey.set(field.key, field)
  }

  for (const key of Object.keys(base)) {
    if (key === 'videos') continue
    if (input && Object.prototype.hasOwnProperty.call(input, key)) {
      const field = fieldByKey.get(key)
      out[key] = field ? coerceValue(field, input[key], base[key]) : input[key]
    }
  }

  if (input && Object.prototype.hasOwnProperty.call(input, 'videos')) {
    out.videos = cloneVideos(input.videos)
  }

  return out
}
