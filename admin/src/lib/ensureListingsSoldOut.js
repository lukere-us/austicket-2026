/** Ensure listings.is_sold_out exists (1 = disable Buy tickets CTAs on detail page). */
export async function ensureListingsSoldOut(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name = 'is_sold_out'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE listings
        ADD COLUMN is_sold_out TINYINT(1) NOT NULL DEFAULT 0
        AFTER show_ratings_comments
    `)
  } finally {
    conn.release()
  }
}
