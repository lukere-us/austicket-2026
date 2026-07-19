/** Ensure cms_pages table + CRUD permissions + banner/parent columns exist. */
export async function ensureCmsPagesSchema(pool) {
  const conn = await pool.getConnection()
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(220) NOT NULL,
        slug VARCHAR(240) NOT NULL,
        banner_image VARCHAR(255) NULL,
        parent_id INT UNSIGNED NULL,
        body_html MEDIUMTEXT NULL,
        embed_html MEDIUMTEXT NULL,
        status ENUM('draft','published','unpublished') NOT NULL DEFAULT 'draft',
        created_by_admin_id INT UNSIGNED NULL,
        updated_by_admin_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_cms_pages_slug (slug),
        KEY idx_cms_pages_status (status),
        KEY idx_cms_pages_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await ensureColumn(conn, 'cms_pages', 'banner_image', `
      ALTER TABLE cms_pages
        ADD COLUMN banner_image VARCHAR(255) NULL AFTER slug
    `)
    await ensureColumn(conn, 'cms_pages', 'parent_id', `
      ALTER TABLE cms_pages
        ADD COLUMN parent_id INT UNSIGNED NULL AFTER banner_image
    `)

    try {
      await conn.query(`
        ALTER TABLE cms_pages
          ADD KEY idx_cms_pages_parent (parent_id)
      `)
    } catch (err) {
      if (!isIgnorableSchemaError(err)) throw err
    }

    const permissionKeys = [
      'cms_pages.list',
      'cms_pages.show',
      'cms_pages.new',
      'cms_pages.edit',
      'cms_pages.delete',
    ]
    for (const key of permissionKeys) {
      await conn.execute(
        `
          INSERT INTO admin_role_permissions (role_id, permission_key, allowed)
          SELECT r.id, ?, 1
          FROM admin_roles r
          ON DUPLICATE KEY UPDATE allowed = 1, updated_at = CURRENT_TIMESTAMP
        `,
        [key],
      )
    }
  } finally {
    conn.release()
  }
}

async function ensureColumn(conn, table, column, alterSql) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [table, column],
  )
  if (Number(rows?.[0]?.cnt || 0) > 0) return
  await conn.query(alterSql)
}

function isIgnorableSchemaError(err) {
  const code = String(err?.code || '')
  const errno = Number(err?.errno)
  return (
    errno === 1061 ||
    errno === 1060 ||
    errno === 1091 ||
    code === 'ER_DUP_KEYNAME' ||
    code === 'ER_DUP_FIELDNAME' ||
    code === 'ER_CANT_DROP_FIELD_OR_KEY'
  )
}
