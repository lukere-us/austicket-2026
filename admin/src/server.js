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
import { ensureShowTimesTable } from './lib/ensureShowTimesTable.js'
import { ensureBlogsSchema } from './lib/ensureBlogsSchema.js'
import { ensurePageVisitsVisitedAt } from './lib/ensurePageVisitsVisitedAt.js'
import { ensureMainAdminPermissions } from './lib/ensureMainAdminPermissions.js'
import { waitForDatabase } from './lib/waitForDatabase.js'
import {
  homeHeroSettingFields,
  loadHomeHeroSettings,
  saveHomeHeroSettings,
} from './lib/homeHeroSettings.js'
import {
  homeListingsSettingFields,
  loadHomeListingsSettings,
  saveHomeListingsSettings,
} from './lib/homeListingsSettings.js'
import {
  footerSettingFields,
  loadFooterSettings,
  loadFooterCityOptions,
  saveFooterSettings,
} from './lib/footerSettings.js'
import {
  headerSettingFields,
  loadHeaderSettings,
  saveHeaderSettings,
} from './lib/headerSettings.js'
import {
  partnersSettingFields,
  loadPartnersSettings,
  savePartnersSettings,
} from './lib/partnersSettings.js'
import {
  adsSettingFields,
  loadAdsSettings,
  saveAdsSettings,
} from './lib/adsSettings.js'
import {
  youtubeCarouselSettingFields,
  loadYoutubeCarouselSettings,
  saveYoutubeCarouselSettings,
} from './lib/youtubeCarouselSettings.js'
import { parseSettingsBody } from './lib/parseSettingsBody.js'
import { can, canAny, loadAdminPermissions } from './lib/adminPermissions.js'
import { attachAdminSessionRefresh, sessionWithAdminRefresh } from './lib/refreshAdminSession.js'
import { ADMIN_PERMISSION_KEYS } from './lib/adminPermissions.shared.js'
import {
  createRoleWithPermissions,
  fetchRoleById,
  fetchRolePermissionKeys,
  isMainAdminRoleName,
  updateRoleWithPermissions,
} from './lib/rolePermissions.server.js'

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
      SELECT a.id, a.name, a.email, a.password_hash, a.is_active, a.role_id, r.name AS role_name
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

  const permissions = await loadAdminPermissions(pool, admin.role_id, admin.role_name)

  return {
    id: admin.id,
    email: admin.email,
    title: admin.name,
    role: admin.role_name,
    roleId: admin.role_id,
    permissions,
  }
}

async function start() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  }

  const app = express()

  await waitForDatabase()
  await ensureShowTimesTable(dbPool())
  await ensureBlogsSchema(dbPool())
  await ensurePageVisitsVisitedAt(dbPool())
  await ensureMainAdminPermissions(dbPool())

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

  const sessionOptions = {
    store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'change-me',
    name: 'aus_admin',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
    },
  }

  const sessionMiddleware = session(sessionOptions)
  const adminSessionMiddleware = sessionWithAdminRefresh(sessionMiddleware)

  function requireAdminApi(req, res, next) {
    if (req.session?.adminUser) return next()
    res.status(401).json({ error: 'unauthorized' })
  }

  function requirePermission(permissionKey) {
    return (req, res, next) => {
      const admin = req.session?.adminUser
      if (!admin) {
        res.status(401).json({ error: 'unauthorized' })
        return
      }
      if (!can(admin, permissionKey)) {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      next()
    }
  }

  function requireUploadPermission(req, res, next) {
    return requirePermission('uploads.use')(req, res, next)
  }

  function requireAnyPermission(...permissionKeys) {
    return (req, res, next) => {
      const admin = req.session?.adminUser
      if (!admin) {
        res.status(401).json({ error: 'unauthorized' })
        return
      }
      if (!canAny(admin, permissionKeys)) {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      next()
    }
  }

  function jsonNoCache(res, payload) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.status(200).type('json').send(JSON.stringify(payload))
  }

  // Upload endpoint for listing media (banner + gallery)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/listing-media`,
    sessionMiddleware,
    requireUploadPermission,
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
    sessionMiddleware,
    requireUploadPermission,
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

  // Upload endpoint for header logos (SVG or image)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/header-logo`,
    sessionMiddleware,
    requireUploadPermission,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 2 * 1024 * 1024,
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const orig = String(f?.name || 'logo')
        const extRaw = path.extname(orig).toLowerCase()
        const type = String(f?.type || '')
        const isSvg = type === 'image/svg+xml' || extRaw === '.svg'
        if (!isSvg && !type.startsWith('image/')) {
          return res.status(400).json({ error: 'Only SVG or image uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 2 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 2MB' })
        }

        const logosDir = path.join(UPLOAD_DIR, 'logos')
        await fs.mkdir(logosDir, { recursive: true })

        const ext = isSvg ? '.svg' : extRaw.replace(/[^.\w]/g, '') || '.png'
        const name = `logo_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`
        const destAbs = path.join(logosDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`logos/${name}`)}`,
            storedPath: `Upload/logos/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Upload endpoint for partner logos (SVG, PNG, JPEG)
  app.post(
    `${adminJs.options.rootPath}/api/uploads/partner-logo`,
    sessionMiddleware,
    requireUploadPermission,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 2 * 1024 * 1024,
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const orig = String(f?.name || 'logo')
        const extRaw = path.extname(orig).toLowerCase()
        const type = String(f?.type || '')
        const isSvg = type === 'image/svg+xml' || extRaw === '.svg'
        const isJpeg =
          type === 'image/jpeg' || type === 'image/jpg' || extRaw === '.jpg' || extRaw === '.jpeg'
        const isPng = type === 'image/png' || extRaw === '.png'
        if (!isSvg && !isJpeg && !isPng) {
          return res.status(400).json({ error: 'Only SVG, PNG, or JPEG uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 2 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 2MB' })
        }

        const partnersDir = path.join(UPLOAD_DIR, 'partners')
        await fs.mkdir(partnersDir, { recursive: true })

        const ext = isSvg ? '.svg' : isJpeg ? (extRaw === '.jpeg' ? '.jpeg' : '.jpg') : '.png'
        const name = `partner_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`
        const destAbs = path.join(partnersDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`partners/${name}`)}`,
            storedPath: `Upload/partners/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Upload endpoint for ad images
  app.post(
    `${adminJs.options.rootPath}/api/uploads/ad-image`,
    sessionMiddleware,
    requireUploadPermission,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 4 * 1024 * 1024,
      uploadDir: os.tmpdir(),
    }),
    async (req, res) => {
      try {
        const file = req.files?.file ?? req.files?.image ?? req.files?.files ?? null
        const f = Array.isArray(file) ? file[0] : file
        if (!f) return res.status(400).json({ error: 'No file uploaded' })

        const orig = String(f?.name || 'ad')
        const extRaw = path.extname(orig).toLowerCase()
        const type = String(f?.type || '')
        const isSvg = type === 'image/svg+xml' || extRaw === '.svg'
        const isJpeg =
          type === 'image/jpeg' || type === 'image/jpg' || extRaw === '.jpg' || extRaw === '.jpeg'
        const isPng = type === 'image/png' || extRaw === '.png'
        const isWebp = type === 'image/webp' || extRaw === '.webp'
        const isGif = type === 'image/gif' || extRaw === '.gif'
        if (!isSvg && !isJpeg && !isPng && !isWebp && !isGif) {
          return res.status(400).json({ error: 'Only SVG, PNG, JPEG, WebP, or GIF uploads are allowed' })
        }
        const size = Number(f?.size || 0)
        if (size > 4 * 1024 * 1024) {
          return res.status(400).json({ error: 'File must be <= 4MB' })
        }

        const adsDir = path.join(UPLOAD_DIR, 'ads')
        await fs.mkdir(adsDir, { recursive: true })

        const ext = isSvg
          ? '.svg'
          : isJpeg
            ? extRaw === '.jpeg'
              ? '.jpeg'
              : '.jpg'
            : isWebp
              ? '.webp'
              : isGif
                ? '.gif'
                : '.png'
        const name = `ad_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`
        const destAbs = path.join(adsDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`ads/${name}`)}`,
            storedPath: `Upload/ads/${name}`,
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
    sessionMiddleware,
    requireUploadPermission,
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
    sessionMiddleware,
    requireUploadPermission,
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

  app.post(
    `${adminJs.options.rootPath}/api/uploads/blog-cover`,
    sessionMiddleware,
    requireUploadPermission,
    formidableMiddleware({
      multiples: false,
      maxFileSize: 4 * 1024 * 1024,
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

        const blogDir = path.join(UPLOAD_DIR, 'blogs')
        await fs.mkdir(blogDir, { recursive: true })

        const orig = String(f?.name || 'image')
        const ext = path.extname(orig).slice(0, 10) || '.jpg'
        const safeExt = ext.replace(/[^.\w]/g, '')
        const name = `blog_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`
        const destAbs = path.join(blogDir, name)
        const tmp = f?.path
        if (!tmp) return res.status(400).json({ error: 'Invalid upload' })
        await moveFile(tmp, destAbs)

        res.json({
          file: {
            fileName: name,
            publicUrl: `${adminJs.options.rootPath}/uploads-root/${encodeURIComponent(`blogs/${name}`)}`,
            storedPath: `Upload/blogs/${name}`,
          },
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('upload error', e)
        res.status(500).json({ error: e?.message || String(e) })
      }
    }
  )

  // Settings API lives outside AdminJS formidable router so JSON bodies parse correctly.
  const settingsApi = express.Router()
  settingsApi.use(express.json({ limit: '256kb' }))

  settingsApi.get('/home-hero', requirePermission('pages.sliderBanner'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadHomeHeroSettings(pool),
        fields: homeHeroSettingFields(),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/home-hero', requirePermission('pages.sliderBanner'), async (req, res) => {
    try {
      const pool = dbPool()
      const input = parseSettingsBody(req)
      if (!input || typeof input !== 'object' || Object.keys(input).length < 3) {
        res.status(400).json({
          error: 'Empty settings payload. Restart the admin server and hard-refresh the page (Ctrl+Shift+R).',
        })
        return
      }
      const settings = await saveHomeHeroSettings(pool, input)
      jsonNoCache(res, {
        settings,
        fields: homeHeroSettingFields(),
        notice: { message: 'Slider & banner settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get('/home-listings', requirePermission('pages.homeListings'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadHomeListingsSettings(pool),
        fields: homeListingsSettingFields(),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/home-listings', requirePermission('pages.homeListings'), async (req, res) => {
    try {
      const pool = dbPool()
      const settings = await saveHomeListingsSettings(pool, parseSettingsBody(req))
      jsonNoCache(res, {
        settings,
        fields: homeListingsSettingFields(),
        notice: { message: 'Homepage listing settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get('/footer', requireAnyPermission('pages.footer', 'pages.homeListings', 'pages.sliderBanner'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadFooterSettings(pool),
        fields: footerSettingFields(),
        cities: await loadFooterCityOptions(pool),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/footer', requireAnyPermission('pages.footer', 'pages.homeListings', 'pages.sliderBanner'), async (req, res) => {
    try {
      const pool = dbPool()
      const settings = await saveFooterSettings(pool, parseSettingsBody(req))
      jsonNoCache(res, {
        settings,
        fields: footerSettingFields(),
        cities: await loadFooterCityOptions(pool),
        notice: { message: 'Footer settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get('/header', requireAnyPermission('pages.header', 'pages.homeListings', 'pages.sliderBanner'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadHeaderSettings(pool),
        fields: headerSettingFields(),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/header', requireAnyPermission('pages.header', 'pages.homeListings', 'pages.sliderBanner'), async (req, res) => {
    try {
      const pool = dbPool()
      const settings = await saveHeaderSettings(pool, parseSettingsBody(req))
      jsonNoCache(res, {
        settings,
        fields: headerSettingFields(),
        notice: { message: 'Header settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get('/partners', requireAnyPermission('pages.partners', 'pages.homeListings', 'pages.sliderBanner'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadPartnersSettings(pool),
        fields: partnersSettingFields(),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/partners', requireAnyPermission('pages.partners', 'pages.homeListings', 'pages.sliderBanner'), async (req, res) => {
    try {
      const pool = dbPool()
      const settings = await savePartnersSettings(pool, parseSettingsBody(req))
      jsonNoCache(res, {
        settings,
        fields: partnersSettingFields(),
        notice: { message: 'Partners settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get('/ads', requireAnyPermission('pages.ads', 'pages.homeListings', 'pages.sliderBanner'), async (_req, res) => {
    try {
      const pool = dbPool()
      jsonNoCache(res, {
        settings: await loadAdsSettings(pool),
        fields: adsSettingFields(),
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.post('/ads', requireAnyPermission('pages.ads', 'pages.homeListings', 'pages.sliderBanner'), async (req, res) => {
    try {
      const pool = dbPool()
      const settings = await saveAdsSettings(pool, parseSettingsBody(req))
      jsonNoCache(res, {
        settings,
        fields: adsSettingFields(),
        notice: { message: 'Ads settings saved.', type: 'success' },
      })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  settingsApi.get(
    '/youtube-carousel',
    requireAnyPermission('pages.youtubeCarousel', 'pages.homeListings', 'pages.sliderBanner'),
    async (_req, res) => {
      try {
        const pool = dbPool()
        jsonNoCache(res, {
          settings: await loadYoutubeCarouselSettings(pool),
          fields: youtubeCarouselSettingFields(),
        })
      } catch (e) {
        res.status(500).json({ error: e?.message || String(e) })
      }
    },
  )

  settingsApi.post(
    '/youtube-carousel',
    requireAnyPermission('pages.youtubeCarousel', 'pages.homeListings', 'pages.sliderBanner'),
    async (req, res) => {
      try {
        const pool = dbPool()
        const settings = await saveYoutubeCarouselSettings(pool, parseSettingsBody(req))
        jsonNoCache(res, {
          settings,
          fields: youtubeCarouselSettingFields(),
          notice: { message: 'YouTube carousel settings saved.', type: 'success' },
        })
      } catch (e) {
        res.status(500).json({ error: e?.message || String(e) })
      }
    },
  )

  app.use(
    `${adminJs.options.rootPath}/api/settings`,
    adminSessionMiddleware,
    requireAdminApi,
    settingsApi,
  )

  const rolesApi = express.Router()
  rolesApi.use(express.json({ limit: '256kb' }))

  rolesApi.get('/:id', requireAnyPermission('admin_roles.show', 'admin_roles.edit'), async (req, res) => {
    try {
      const pool = dbPool()
      const role = await fetchRoleById(pool, req.params.id)
      if (!role) {
        res.status(404).json({ error: 'Role not found' })
        return
      }
      const isMainAdmin = isMainAdminRoleName(role.name)
      const allowedKeys = isMainAdmin
        ? ADMIN_PERMISSION_KEYS
        : await fetchRolePermissionKeys(pool, role.id)
      jsonNoCache(res, { role, allowedKeys, isMainAdmin })
    } catch (e) {
      res.status(500).json({ error: e?.message || String(e) })
    }
  })

  rolesApi.post('/', requirePermission('admin_roles.new'), async (req, res) => {
    try {
      const pool = dbPool()
      const { name, allowedKeys } = req.body || {}
      const result = await createRoleWithPermissions(pool, name, allowedKeys)
      jsonNoCache(res, result)
    } catch (e) {
      res.status(400).json({ error: e?.message || String(e) })
    }
  })

  rolesApi.put('/:id', requirePermission('admin_roles.edit'), async (req, res) => {
    try {
      const pool = dbPool()
      const { name, allowedKeys } = req.body || {}
      const result = await updateRoleWithPermissions(pool, req.params.id, name, allowedKeys)
      jsonNoCache(res, result)
    } catch (e) {
      res.status(400).json({ error: e?.message || String(e) })
    }
  })

  app.use(
    `${adminJs.options.rootPath}/api/roles`,
    adminSessionMiddleware,
    requireAdminApi,
    rolesApi,
  )

  const adminRouter = buildAuthenticatedRouter(
    adminJs,
    {
      authenticate,
      cookieName: 'aus_admin',
      cookiePassword: process.env.SESSION_SECRET || 'change-me',
    },
    null,
    sessionOptions,
  )
  attachAdminSessionRefresh(adminRouter)

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

  const server = app.listen(PORT)

  server.on('listening', () => {
    // eslint-disable-next-line no-console
    console.log(`AdminJS running on http://localhost:${PORT}${adminJs.options.rootPath}`)
  })

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `Port ${PORT} is already in use (often Next.js on 3001). Set PORT=3003 in admin/.env and restart.`,
      )
      process.exit(1)
    }
    throw err
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
