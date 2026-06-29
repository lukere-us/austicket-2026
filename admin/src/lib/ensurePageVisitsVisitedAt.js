/**
 * Ensure page_visits.visited_at exists (used in Admin analytics + dashboard charts).
 */
export async function ensurePageVisitsVisitedAt(pool) {
  const [rows] = await pool.execute(
    `
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'page_visits'
        AND COLUMN_NAME = 'visited_at'
    `,
  )
  if (Number(rows?.[0]?.cnt || 0) > 0) return true

  // eslint-disable-next-line no-console
  console.warn('[db] page_visits.visited_at missing; adding column…')

  await pool.execute(`
    ALTER TABLE page_visits
      ADD COLUMN visited_at DATETIME NULL AFTER user_agent
  `)
  await pool.execute(`
    UPDATE page_visits
    SET visited_at = COALESCE(created_at, NOW())
    WHERE visited_at IS NULL
  `)
  await pool.execute(`
    ALTER TABLE page_visits
      MODIFY COLUMN visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  `)
  await pool.execute(`
    CREATE INDEX idx_page_visits_visited ON page_visits (visited_at)
  `).catch(() => {})

  // eslint-disable-next-line no-console
  console.warn('[db] page_visits.visited_at ready.')
  return true
}
