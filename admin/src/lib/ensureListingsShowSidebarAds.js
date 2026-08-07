/** Ensure listings.show_sidebar_ads exists (1 = show Site Settings ads in detail sidebar). */
export async function ensureListingsShowSidebarAds(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name = 'show_sidebar_ads'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE listings
        ADD COLUMN show_sidebar_ads TINYINT(1) NOT NULL DEFAULT 1
        AFTER show_countdown
    `)
  } finally {
    conn.release()
  }
}
