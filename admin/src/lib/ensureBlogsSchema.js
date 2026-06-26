/** Drop schedule/sort columns from blogs — publishing is status-only for blog posts. */
export async function ensureBlogsSchema(pool) {
  const conn = await pool.getConnection()
  try {
    const statements = [
      'ALTER TABLE blogs DROP COLUMN IF EXISTS publish_at',
      'ALTER TABLE blogs DROP COLUMN IF EXISTS unpublish_at',
      'ALTER TABLE blogs DROP COLUMN IF EXISTS sort_order',
    ]

    for (const sql of statements) {
      try {
        await conn.query(sql)
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
