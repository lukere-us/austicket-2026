/** Ensure listings.trybooking_api_key / trybooking_secret_key exist (per-event TryBooking credentials). */
export async function ensureListingsTrybookingKeys(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT column_name AS name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'listings'
          AND column_name IN ('trybooking_api_key', 'trybooking_secret_key')
      `,
    )
    const existing = new Set((rows || []).map((r) => String(r.name || r.NAME || r.COLUMN_NAME || '').toLowerCase()))

    if (!existing.has('trybooking_api_key')) {
      await conn.query(`
        ALTER TABLE listings
          ADD COLUMN trybooking_api_key VARCHAR(255) NULL DEFAULT NULL
          AFTER show_trybooking_stats
      `)
    }
    if (!existing.has('trybooking_secret_key')) {
      await conn.query(`
        ALTER TABLE listings
          ADD COLUMN trybooking_secret_key VARCHAR(255) NULL DEFAULT NULL
          AFTER trybooking_api_key
      `)
    }
  } finally {
    conn.release()
  }
}
