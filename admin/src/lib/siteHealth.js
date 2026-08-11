import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDbConfig } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'Upload')

function checkResult(id, label, status, message, detail = null) {
  return { id, label, status, message, detail }
}

async function checkDatabase(pool) {
  const cfg = getDbConfig()
  const started = Date.now()
  try {
    const [rows] = await pool.query('SELECT 1 AS ok')
    const ok = Number(rows?.[0]?.ok) === 1
    if (!ok) {
      return checkResult('database', 'Database', 'error', 'Database ping failed.', {
        host: cfg.host,
        database: cfg.database,
      })
    }

    const [[listings]] = await pool.query('SELECT COUNT(*) AS cnt FROM listings')
    const [[users]] = await pool.query('SELECT COUNT(*) AS cnt FROM users')
    const [[shows]] = await pool.query('SELECT COUNT(*) AS cnt FROM shows')

    return checkResult('database', 'Database', 'ok', `Connected to ${cfg.database}.`, {
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      latencyMs: Date.now() - started,
      counts: {
        listings: Number(listings?.cnt || 0),
        users: Number(users?.cnt || 0),
        shows: Number(shows?.cnt || 0),
      },
    })
  } catch (e) {
    return checkResult('database', 'Database', 'error', e?.message || String(e), {
      host: cfg.host,
      database: cfg.database,
    })
  }
}

async function checkUploads() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const stat = await fs.stat(UPLOAD_DIR)
    if (!stat.isDirectory()) {
      return checkResult('uploads', 'Upload folder', 'error', 'Upload path exists but is not a directory.', {
        path: UPLOAD_DIR,
      })
    }

    const probe = path.join(UPLOAD_DIR, `.health-${Date.now()}.tmp`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)

    const entries = await fs.readdir(UPLOAD_DIR)
    return checkResult('uploads', 'Upload folder', 'ok', 'Upload folder is readable and writable.', {
      path: UPLOAD_DIR,
      entryCount: entries.length,
    })
  } catch (e) {
    return checkResult('uploads', 'Upload folder', 'error', e?.message || String(e), {
      path: UPLOAD_DIR,
    })
  }
}

function resolvePublicApiBase(req) {
  const fromEnv = String(process.env.PUBLIC_API_BASE || process.env.API_BASE || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const host = req.get('x-forwarded-host') || req.get('host') || '127.0.0.1'
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  // Admin is usually :3003; public PHP API is typically same host without that port.
  const bareHost = String(host).replace(/:3003$/i, '')
  return `${proto}://${bareHost}/api`
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function checkPublicApi(req) {
  const base = resolvePublicApiBase(req)
  const url = `${base}/`
  const started = Date.now()
  try {
    const res = await fetchWithTimeout(url, { method: 'GET', headers: { Accept: 'application/json' } })
    const text = await res.text()
    let body = null
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }

    if (!res.ok) {
      return checkResult('publicApi', 'Public API', 'error', `API returned HTTP ${res.status}.`, {
        url,
        latencyMs: Date.now() - started,
      })
    }

    return checkResult('publicApi', 'Public API', 'ok', 'Public API responded successfully.', {
      url,
      latencyMs: Date.now() - started,
      status: body?.status || null,
      name: body?.name || null,
    })
  } catch (e) {
    return checkResult('publicApi', 'Public API', 'error', e?.message || String(e), { url })
  }
}

async function checkMediaHead(pool, req) {
  const base = resolvePublicApiBase(req)
  let sample = null
  try {
    const [rows] = await pool.query(
      `
        SELECT banner_image
        FROM listings
        WHERE banner_image IS NOT NULL AND TRIM(banner_image) <> ''
        ORDER BY id DESC
        LIMIT 1
      `,
    )
    sample = rows?.[0]?.banner_image || null
  } catch {
    sample = null
  }

  if (!sample) {
    return checkResult(
      'mediaHead',
      'Media / share images',
      'warn',
      'No listing poster found to test media HEAD requests.',
      { apiBase: base },
    )
  }

  let rel = String(sample).trim().replace(/^\/+/, '').replace(/\\/g, '/')
  rel = rel.replace(/^Upload\//i, '')
  const url = `${base}/media/${rel.split('/').map(encodeURIComponent).join('/')}`
  const started = Date.now()

  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD' })
    const contentType = res.headers.get('content-type') || ''
    const contentLength = res.headers.get('content-length')

    if (res.status === 404) {
      return checkResult(
        'mediaHead',
        'Media / share images',
        'error',
        'HEAD /api/media returned 404. Share thumbnails will fail (WhatsApp/Facebook).',
        { url, latencyMs: Date.now() - started },
      )
    }

    if (!res.ok) {
      return checkResult(
        'mediaHead',
        'Media / share images',
        'error',
        `HEAD /api/media returned HTTP ${res.status}.`,
        { url, latencyMs: Date.now() - started },
      )
    }

    if (!contentType.startsWith('image/')) {
      return checkResult(
        'mediaHead',
        'Media / share images',
        'warn',
        `HEAD succeeded but Content-Type is "${contentType || 'missing'}".`,
        { url, contentType, contentLength, latencyMs: Date.now() - started },
      )
    }

    return checkResult(
      'mediaHead',
      'Media / share images',
      'ok',
      'HEAD /api/media works — share crawlers can read posters.',
      { url, contentType, contentLength, latencyMs: Date.now() - started },
    )
  } catch (e) {
    return checkResult('mediaHead', 'Media / share images', 'error', e?.message || String(e), { url })
  }
}

function checkSessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim()
  if (!secret || secret === 'change-me-to-a-long-random-secret' || secret.length < 16) {
    return checkResult(
      'sessionSecret',
      'Session secret',
      'warn',
      'SESSION_SECRET is missing or still using the example value.',
      null,
    )
  }
  return checkResult('sessionSecret', 'Session secret', 'ok', 'SESSION_SECRET is set.', {
    length: secret.length,
  })
}

function checkRuntime() {
  return checkResult('runtime', 'Admin runtime', 'ok', 'Admin process is running.', {
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    uptimeSec: Math.round(process.uptime()),
    pid: process.pid,
  })
}

export async function runSiteHealthChecks(pool, req) {
  const checks = await Promise.all([
    checkDatabase(pool),
    checkUploads(),
    checkPublicApi(req),
    checkMediaHead(pool, req),
    Promise.resolve(checkSessionSecret()),
    Promise.resolve(checkRuntime()),
  ])

  const summary = {
    ok: checks.filter((c) => c.status === 'ok').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    error: checks.filter((c) => c.status === 'error').length,
  }

  const overall = summary.error > 0 ? 'error' : summary.warn > 0 ? 'warn' : 'ok'

  return {
    checkedAt: new Date().toISOString(),
    overall,
    summary,
    checks,
  }
}
