import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import express from 'express'
import formidableMiddleware from 'express-formidable'
import session from 'express-session'
import Sequelize from 'sequelize'
import SequelizeStoreFactory from 'connect-session-sequelize'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import os from 'os'

import { buildAuthenticatedRouter } from '@adminjs/express'
import { buildAdminJs } from './adminjs.js'
import { dbPool, getDbConfig } from './db.js'

dotenv.config()

const PORT = Number(process.env.PORT || 3001)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'Upload')

async function moveFile(tmpAbs, destAbs) {
  // In some setups, packages still attempt `rename()` under the hood which can fail on Windows
  // when temp folder is on C: and project is on another drive (EXDEV). Always fall back to copy+unlink.
  try {
    await fs.rename(tmpAbs, destAbs)
    return
  } catch (e) {
    if (e?.code !== 'EXDEV') {
      // for any other rename error, still try copy fallback
    }
  }
  await fs.copyFile(tmpAbs, destAbs)
  await fs.unlink(tmpAbs).catch(() => {})
}

/** Same layout as `adminjs` (`ADMIN_JS_TMP_DIR` + `bundle.js`), relative to `process.cwd()` and next to this server. */
function userComponentsBundlePaths() {
  const tmp = process.env.ADMIN_JS_TMP_DIR || '.adminjs'
  return [path.join(process.cwd(), tmp, 'bundle.js'), path.join(__dirname, '..', tmp, 'bundle.js')]
}

/** Serve the Rollup output without `res.sendFile` (avoids Windows 404/500 edge cases) and the same path AdminJS uses. */
async function readUserComponentsBundleOrThrow() {
  for (const p of userComponentsBundlePaths()) {
    try {
      return await fs.readFile(p, 'utf8')
    } catch {
      // try next
    }
  }
  const tried = userComponentsBundlePaths().join(' | ')
  throw new Error(`user components bundle not found. Tried: ${tried}`)
}

async function authenticate(email, password) {
  const pool = dbPool()
  const [rows] = await pool.execute(
    `
      SELECT a.id, a.name, a.email, a.password_hash, a.is_active, r.name AS role_name
      FROM admins a
      JOIN admin_roles r ON r.id = a.role_id
      WHERE a.email = ?
      LIMIT 1
    `,
    [String(email).toLowerCase()]
  )

  const admin = rows?.[0]
  if (!admin) return null
  if (Number(admin.is_active) !== 1) return null
  if (!bcrypt.compareSync(String(password), String(admin.password_hash))) return null

  return {
    id: admin.id,
    email: admin.email,
    title: admin.name,
    role: admin.role_name,
  }
}

async function start() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  }

  const app = express()

  app.use((req, res, next) => {
    const startAt = Date.now()
    res.on('finish', () => {
      // eslint-disable-next-line no-console
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startAt}ms)`)
    })
    next()
  })

  const adminJs = await buildAdminJs()
  // Bundling is triggered from `@adminjs/express` via `admin.initialize()` without `await`, so the browser
  // can request `components.bundle.js` before the file exists. Run it once, then skip the duplicate in the plugin.
  await adminJs.initialize()
  process.env.ADMIN_JS_SKIP_BUNDLE = 'true'

  if (process.env.NODE_ENV === 'production') {
    const bundleUrl = `${adminJs.options.rootPath}/frontend/assets/components.bundle.js`
    app.get(bundleUrl, async (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      try {
        res.send(await readUserComponentsBundleOrThrow())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('components.bundle.js:', e)
        res.status(503).type('text/plain').send('User components bundle is not available. Check server log.')
      }
    })
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  // Serve uploaded media from repo-root /Upload
  app.use(`${adminJs.options.rootPath}/uploads-root`, express.static(UPLOAD_DIR))

  // Upload endpoint for listing media (banner + gallery)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/listing-media`,
    formidableMiddleware({
      multiples: true,
      maxFileSize: 4 * 1024 * 1024, // 4MB
      // Always keep temp on system drive to avoid cross-device rename issues.
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const filesField = req.files?.files ?? req.files?.file ?? req.files?.image ?? null
        const files = Array.isArray(filesField) ? filesField : filesField ? [filesField] : []
        if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' })
        if (files.length > 10) return res.status(400).json({ error: 'Maximum 10 images allowed' })

        const saved = []
        for (const f of files) {
          const type = String(f?.type || '')
          if (!type.startsWith('image/')) {
            return res.status(400).json({ error: 'Only image uploads are allowed' })
          }
          const size = Number(f?.size || 0)
          if (size > 4 * 1024 * 1024) {
            return res.status(400).json({ error: 'Each file must be <= 4MB' })
          }

          const orig = String(f?.name || 'image')
          const ext = path.extname(orig).slice(0, 10) || '.jpg'
          const safeExt = ext.replace(/[^.\w]/g, '')
          const name = `listing_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`
          const destAbs = path.join(UPLOAD_DIR, name)
          const tmp = f?.path
          if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
          await moveFile(tmp, destAbs)

          saved.push({
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(name)}`,
            storedPath: `Upload/${name}`,
          })
        }

        res.json({ files: saved })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Upload endpoint for cast image (single)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/cast-image`,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 4 * 1024 * 1024, // 4MB
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const type = String(f?.type || '')
        if (!type.startsWith('image/')) {
          return res.status(400).json({ error: 'Only image uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 4 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 4MB' })
        }

        const castDir = path.join(UPLOAD_DIR, 'cast')
        await fs.mkdir(castDir, { recursive: true })

        const orig = String(f?.name || 'image')
        const ext = path.extname(orig).slice(0, 10) || '.jpg'
        const safeExt = ext.replace(/[^.\w]/g, '')
        const name = `cast_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`
        const destAbs = path.join(castDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`cast/${name}`)}`,
            storedPath: `Upload/cast/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Upload endpoint for country flags (single)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/flag-image`,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 4 * 1024 * 1024, // 4MB
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const type = String(f?.type || '')
        if (!type.startsWith('image/')) {
          return res.status(400).json({ error: 'Only image uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 4 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 4MB' })
        }

        const flagsDir = path.join(UPLOAD_DIR, 'flags')
        await fs.mkdir(flagsDir, { recursive: true })

        const orig = String(f?.name || 'flag')
        const ext = path.extname(orig).slice(0, 10) || '.png'
        const safeExt = ext.replace(/[^.\w]/g, '')
        const name = `flag_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`
        const destAbs = path.join(flagsDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`flags/${name}`)}`,
            storedPath: `Upload/flags/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Upload endpoint for promotion image (single)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/promotion-image`,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 4 * 1024 * 1024, // 4MB
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const type = String(f?.type || '')
        if (!type.startsWith('image/')) {
          return res.status(400).json({ error: 'Only image uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 4 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 4MB' })
        }

        const orig = String(f?.name || 'image')
        const ext = path.extname(orig).slice(0, 10) || '.jpg'
        const safeExt = ext.replace(/[^.\w]/g, '')
        const name = `promo_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`
        const destAbs = path.join(UPLOAD_DIR, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(name)}`,
            storedPath: `Upload/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  const cfg = getDbConfig()
  const sequelize = new Sequelize(cfg.database, cfg.user, cfg.password, {
    host: cfg.host,
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
  })

  const SequelizeStore = SequelizeStoreFactory(session.Store)
  const store = new SequelizeStore({ db: sequelize })
  await store.sync()

  const adminRouter = buildAuthenticatedRouter(
    adminJs,
    {
      authenticate,
      cookieName: 'aus_admin',
      cookiePassword: process.env.SESSION_SECRET || 'change-me',
    },
    null,
    {
      store,
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || 'change-me',
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
      },
    }
  )

  app.use(adminJs.options.rootPath, adminRouter)
  app.use(`${adminJs.options.rootPath}/assets`, express.static(path.join(__dirname, '..', 'public', 'assets')))
  app.use(`${adminJs.options.rootPath}/uploads`, express.static(path.join(__dirname, '..', 'public', 'uploads')))

  app.get('/', (_req, res) => res.redirect(adminJs.options.rootPath))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error', err)
    res.status(500).send('Internal Server Error')
  })

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`AdminJS running on http://localhost:${PORT}${adminJs.options.rootPath}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
