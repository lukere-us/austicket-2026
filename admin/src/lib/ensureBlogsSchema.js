/** Drop schedule/sort columns from blogs — publishing is status-only for blog posts. */
export async function ensureBlogsSchema(pool) {
  const conn = await pool.getConnection()
  try {
    const columns = ['publish_at', 'unpublish_at', 'sort_order']

    for (const col of columns) {
      const [rows] = await conn.query(
        `
          SELECT COUNT(*) AS cnt
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = 'blogs'
            AND column_name = ?
        `,
        [col],
      )

      const exists = Number(rows?.[0]?.cnt || 0) > 0
      if (!exists) continue

      try {
        await conn.query(`ALTER TABLE blogs DROP COLUMN \`${col}\``)
      } catch (err) {
        const code = String(err?.code || '')
        const errno = Number(err?.errno)
        if (errno === 1091 || code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          continue
        }
        throw err
      }
    }
  } finally {
    conn.release()
  }
}
