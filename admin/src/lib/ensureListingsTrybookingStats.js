/** Ensure listings.show_trybooking_stats exists (1 = show live TryBooking seats & sales on the detail page). */
export async function ensureListingsTrybookingStats(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name = 'show_trybooking_stats'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE listings
        ADD COLUMN show_trybooking_stats TINYINT(1) NOT NULL DEFAULT 1
        AFTER show_ratings_comments
    `)
  } finally {
    conn.release()
  }
}
