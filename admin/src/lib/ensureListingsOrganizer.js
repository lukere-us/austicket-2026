/** Ensure listings.organizer_partner_id exists (Partners slider logo id). */
export async function ensureListingsOrganizer(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name = 'organizer_partner_id'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE listings
        ADD COLUMN organizer_partner_id VARCHAR(80) NULL DEFAULT NULL
        AFTER trailer_url
    `)
  } finally {
    conn.release()
  }
}
