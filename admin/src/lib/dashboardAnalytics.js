const DAY_MS = 24 * 60 * 60 * 1000

const timeColumnCache = new Map()

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function formatDayKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function formatShortDayLabel(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

export function normalizeDayKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  return formatDayKey(value)
}

async function resolveTimeColumn(pool, tableName) {
  const cacheKey = tableName
  if (timeColumnCache.has(cacheKey)) return timeColumnCache.get(cacheKey)

  let expr = 'created_at'
  if (tableName === 'page_visits') {
    const [rows] = await pool.execute(
      `
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'page_visits'
          AND COLUMN_NAME = 'visited_at'
      `,
    )
    expr = Number(rows?.[0]?.cnt || 0) > 0 ? 'COALESCE(visited_at, created_at)' : 'created_at'
  }

  timeColumnCache.set(cacheKey, expr)
  return expr
}

/** @param {import('mysql2/promise').Pool} pool */
export async function fetchDailyAnalyticsSeries(pool, tableName, days = 30) {
  const allowed = new Set(['page_visits', 'booking_clicks'])
  if (!allowed.has(tableName)) {
    throw new Error(`Unsupported analytics table: ${tableName}`)
  }

  const timeColumn = await resolveTimeColumn(pool, tableName)
  const span = Math.max(7, Math.min(90, Number(days) || 30))

  let rows = []
  let anchorDay = formatDayKey(new Date())
  try {
    const [[anchorRow]] = await pool.execute(`SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS day`)
    if (anchorRow?.day) anchorDay = normalizeDayKey(anchorRow.day)

    const [result] = await pool.execute(
      `
        SELECT DATE_FORMAT(${timeColumn}, '%Y-%m-%d') AS day, COUNT(*) AS cnt
        FROM ${tableName}
        WHERE ${timeColumn} >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE_FORMAT(${timeColumn}, '%Y-%m-%d')
        ORDER BY day ASC
      `,
      [span - 1],
    )
    rows = Array.isArray(result) ? result : []
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[analytics] ${tableName} daily series failed:`, err?.message || err)
    rows = []
  }

  const countByDay = new Map(
    rows.map((row) => [normalizeDayKey(row.day), Number(row.cnt || 0)]),
  )

  const series = []
  const anchor = new Date(`${anchorDay}T12:00:00`)

  for (let offset = span - 1; offset >= 0; offset -= 1) {
    const day = new Date(anchor.getTime() - offset * DAY_MS)
    const key = formatDayKey(day)
    series.push({
      date: key,
      label: formatShortDayLabel(day),
      count: countByDay.get(key) || 0,
    })
  }

  const total = series.reduce((sum, item) => sum + item.count, 0)
  return { days: span, series, total, resourceId: tableName }
}

/** @param {import('mysql2/promise').Pool} pool */
export async function fetchDashboardAnalytics(pool, days = 30) {
  const [pageVisits, bookingClicks] = await Promise.all([
    fetchDailyAnalyticsSeries(pool, 'page_visits', days),
    fetchDailyAnalyticsSeries(pool, 'booking_clicks', days),
  ])

  return {
    analyticsDays: pageVisits.days,
    pageVisitsByDate: pageVisits.series,
    pageVisitsTotal: pageVisits.total,
    bookingClicksByDate: bookingClicks.series,
    bookingClicksTotal: bookingClicks.total,
  }
}
