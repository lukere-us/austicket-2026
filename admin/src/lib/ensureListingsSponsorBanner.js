/** Ensure listings.sponsor_banner_image + sponsor_banner_url exist. */
export async function ensureListingsSponsorBanner(pool) {
  const conn = await pool.getConnection()
  try {
    await ensureColumn(conn, 'sponsor_banner_image', `
      ALTER TABLE listings
        ADD COLUMN sponsor_banner_image VARCHAR(255) NULL DEFAULT NULL
        AFTER trailer_url
    `)
    await ensureColumn(conn, 'sponsor_banner_url', `
      ALTER TABLE listings
        ADD COLUMN sponsor_banner_url VARCHAR(500) NULL DEFAULT NULL
        AFTER sponsor_banner_image
    `)
  } finally {
    conn.release()
  }
}

async function ensureColumn(conn, column, alterSql) {
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
  if (Number(rows?.[0]?.cnt || 0) > 0) return
  await conn.query(alterSql)
}
