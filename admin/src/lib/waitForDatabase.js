import { getDbConfig, dbPool } from '../db.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDbError(err, cfg) {
  const code = String(err?.code || '')
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST') {
    return `Cannot reach MySQL at ${cfg.host}:${cfg.port}. Start XAMPP MySQL, then restart admin.`
  }
  return String(err?.message || err)
}

export async function waitForDatabase(opts = {}) {
  const retries = Number(opts.retries ?? 20)
  const delayMs = Number(opts.delayMs ?? 1500)
  const cfg = getDbConfig()

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const pool = dbPool()
      await pool.query('SELECT 1')

      const [rows] = await pool.query(
        `
          SELECT COUNT(*) AS cnt
          FROM information_schema.tables
          WHERE table_schema = ? AND table_name = 'admins'
        `,
        [cfg.database]
      )

      if (Number(rows?.[0]?.cnt || 0) === 0) {
        throw new Error(
          [
            `Database "${cfg.database}" is connected but core tables are missing.`,
            'From the repo root, start MySQL in XAMPP then run:',
            '  powershell -ExecutionPolicy Bypass -File .\\scripts\\bootstrap-db.ps1',
          ].join('\n')
        )
      }

      return true
    } catch (err) {
      const message = formatDbError(err, cfg)
      if (attempt >= retries) {
        throw new Error(message)
      }
      // eslint-disable-next-line no-console
      console.warn(`[db] attempt ${attempt}/${retries} failed: ${message}`)
      await sleep(delayMs)
    }
  }

  return false
}
