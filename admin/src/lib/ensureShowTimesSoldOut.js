/** Ensure show_times.is_sold_out exists (1 = disable that time's Buy ticket CTA). */
export async function ensureShowTimesSoldOut(pool) {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(
      `
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'show_times'
          AND column_name = 'is_sold_out'
      `,
    )
    const exists = Number(rows?.[0]?.cnt || 0) > 0
    if (exists) return

    await conn.query(`
      ALTER TABLE show_times
        ADD COLUMN is_sold_out TINYINT(1) NOT NULL DEFAULT 0
        AFTER notes
    `)
  } finally {
    conn.release()
  }
}
