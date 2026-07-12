/** AdminJS / MySQL often return Date objects, ISO strings, or `YYYY-MM-DD HH:mm:ss`. */
export function normalizeListingDatetime(value) {
  if (value == null || value === '') return ''

  // Broken serialization (e.g. Date walked into {}) must not become "[object Object]".
  if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) return ''
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d} 00:00:00`
  }

  const raw = String(value).trim()
  if (!raw || raw === '[object Object]') return ''

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(raw)) return raw

  let m = raw.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2})\.\d+/)
  if (m) return `${m[1]} ${m[2]}`

  m = raw.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i)
  if (m) return `${m[1]} ${m[2]}`

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00:00`

  return ''
}

export function listingDateYmd(value) {
  const norm = normalizeListingDatetime(value)
  if (norm) return norm.slice(0, 10)
  const raw = String(value ?? '').trim()
  const cand = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(cand) ? cand : ''
}

export function listingDatePickerIso(value) {
  const ymd = listingDateYmd(value)
  return ymd ? `${ymd}T00:00:00.000Z` : ''
}

export function listingDatePickerBoundary(value) {
  const ymd = listingDateYmd(value)
  return ymd ? new Date(`${ymd}T00:00:00.000Z`) : null
}

export function formatListingDateDisplay(value) {
  const ymd = listingDateYmd(value)
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function listingDatetimeFromPicker(iso) {
  if (!iso) return ''
  const ymd = listingDateYmd(iso)
  return ymd ? `${ymd} 00:00:00` : ''
}
