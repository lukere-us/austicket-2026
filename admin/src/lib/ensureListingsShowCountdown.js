/** Ensure listings.show_countdown exists (1 = show event countdown card on detail). */
export async function ensureListingsShowCountdown(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name = 'show_countdown'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE listings
        ADD COLUMN show_countdown TINYINT(1) NOT NULL DEFAULT 1
        AFTER organizer_partner_id
    `)
  } finally {
    conn.release()
  }
}
