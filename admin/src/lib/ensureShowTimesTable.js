/**
 * Recreate show_times when MySQL reports error 1932 (table metadata exists but InnoDB engine file is missing).
 */
export async function ensureShowTimesTable(pool) {
  try {
    await pool.query('SELECT 1 FROM show_times LIMIT 1')
    return true
  } catch (err) {
    const code = String(err?.code || '')
    const errno = Number(err?.errno)
    const message = String(err?.message || '')
    const broken =
      errno === 1932 || code === 'ER_NO_SUCH_TABLE' || message.includes("doesn't exist in engine")

    if (!broken) {
      throw err
    }

    // eslint-disable-next-line no-console
    console.warn('[db] show_times table missing or corrupted; recreating…')

    const conn = await pool.getConnection()
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0')
      await conn.query('DROP TABLE IF EXISTS show_times')
      await conn.query(`
        CREATE TABLE show_times (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          show_id BIGINT UNSIGNED NOT NULL,
          show_time DATETIME NOT NULL,
          notes VARCHAR(255) NULL,
          is_sold_out TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_show_times_show (show_id),
          KEY idx_show_times_time (show_time),
          CONSTRAINT fk_show_times_show
            FOREIGN KEY (show_id) REFERENCES shows(id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      await conn.query('SET FOREIGN_KEY_CHECKS = 1')
      // eslint-disable-next-line no-console
      console.warn('[db] show_times table recreated.')
      return true
    } finally {
      conn.release()
    }
  }
}
