/** Ensure listings rating display flags exist (detail page star rating + ratings/comments section). */
export async function ensureListingsRatingDisplay(pool) {
  const conn = await pool.getConnection()
  try {
    for (const column of ['show_rating', 'show_ratings_comments']) {
      const [rows] = await conn.query(
        `
          SELECT COUNT(*) AS cnt
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = 'listings'
            AND column_name = ?
        `,
        [column],
      )
      const exists = Number(rows?.[0]?.cnt || 0) > 0
      if (exists) continue

      if (column === 'show_rating') {
        await conn.query(`
          ALTER TABLE listings
            ADD COLUMN show_rating TINYINT(1) NOT NULL DEFAULT 1
            AFTER show_sidebar_ads
        `)
      } else {
        await conn.query(`
          ALTER TABLE listings
            ADD COLUMN show_ratings_comments TINYINT(1) NOT NULL DEFAULT 1
            AFTER show_rating
        `)
      }
    }
  } finally {
    conn.release()
  }
}
