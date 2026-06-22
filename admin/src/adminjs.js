import path from 'path'
import { fileURLToPath } from 'url'
import { AdminJS, ComponentLoader } from 'adminjs'
import Adapter, { Database, Resource } from '@adminjs/sql'
import { dbPool } from './db.js'

AdminJS.registerAdapter({ Database, Resource })

export async function buildAdminJs() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const componentLoader = new ComponentLoader()
  const Components = {
    ListingTabbedForm: componentLoader.add(
      'ListingTabbedForm',
      path.join(__dirname, 'components', 'ListingTabbedForm.jsx')
    ),
    ImageThumb: componentLoader.add('ImageThumb', path.join(__dirname, 'components', 'ImageThumb.jsx')),
    CodePreview: componentLoader.add('CodePreview', path.join(__dirname, 'components', 'CodePreview.jsx')),
    DuplicateListingAction: componentLoader.add(
      'DuplicateListingAction',
      path.join(__dirname, 'components', 'DuplicateListingAction.jsx')
    ),
    PlaceGoogleMapLink: componentLoader.add(
      'PlaceGoogleMapLink',
      path.join(__dirname, 'components', 'PlaceGoogleMapLink.jsx')
    ),
    ListingGalleryGrid: componentLoader.add(
      'ListingGalleryGrid',
      path.join(__dirname, 'components', 'ListingGalleryGrid.jsx')
    ),
    GalleryImageUpload: componentLoader.add(
      'GalleryImageUpload',
      path.join(__dirname, 'components', 'GalleryImageUpload.jsx')
    ),
    CastImageUpload: componentLoader.add(
      'CastImageUpload',
      path.join(__dirname, 'components', 'CastImageUpload.jsx')
    ),
    CastNameWithDuplicateHint: componentLoader.add(
      'CastNameWithDuplicateHint',
      path.join(__dirname, 'components', 'CastNameWithDuplicateHint.jsx')
    ),
    PlaceNameWithDuplicateHint: componentLoader.add(
      'PlaceNameWithDuplicateHint',
      path.join(__dirname, 'components', 'PlaceNameWithDuplicateHint.jsx')
    ),
    FlagImageUpload: componentLoader.add(
      'FlagImageUpload',
      path.join(__dirname, 'components', 'FlagImageUpload.jsx')
    ),
    ListingStatusBadge: componentLoader.add(
      'ListingStatusBadge',
      path.join(__dirname, 'components', 'ListingStatusBadge.jsx')
    ),
    ListingPublishDate: componentLoader.add(
      'ListingPublishDate',
      path.join(__dirname, 'components', 'ListingPublishDate.jsx')
    ),
    ListingUnpublishDate: componentLoader.add(
      'ListingUnpublishDate',
      path.join(__dirname, 'components', 'ListingUnpublishDate.jsx')
    ),
    ListingTitleLarge: componentLoader.add(
      'ListingTitleLarge',
      path.join(__dirname, 'components', 'ListingTitleLarge.jsx')
    ),
    DashboardTiles: componentLoader.add(
      'DashboardTiles',
      path.join(__dirname, 'components', 'DashboardTiles.jsx')
    ),
    SliderBannerSettings: componentLoader.add(
      'SliderBannerSettings',
      path.join(__dirname, 'components', 'SliderBannerSettings.jsx')
    ),
    HomeListingsSettings: componentLoader.add(
      'HomeListingsSettings',
      path.join(__dirname, 'components', 'HomeListingsSettings.jsx')
    ),
  }

  const databaseName = process.env.DB_NAME || 'aus-booking'
  const db = await new Adapter('mysql', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: databaseName,
  }).init()

  /** Not a DB column — only for the custom form; must be removed before SQL insert/update. */
  function stashListingShowsPayload(request) {
    if (!request) return
    const fromPayload = request.payload && Object.prototype.hasOwnProperty.call(request.payload, 'shows_payload')
      ? request.payload.shows_payload
      : undefined
    const fromFields = request.fields && Object.prototype.hasOwnProperty.call(request.fields, 'shows_payload')
      ? request.fields.shows_payload
      : undefined
    const raw = fromPayload !== undefined ? fromPayload : fromFields
    if (raw === undefined || raw === null) return
    request._listingShowsPayload = typeof raw === 'string' ? raw : String(raw)
    if (request.payload) delete request.payload.shows_payload
    if (request.fields) delete request.fields.shows_payload
  }

  /** Not a DB column — gallery list from the custom form; must be removed before SQL insert/update. */
  function stashListingGalleryPayload(request) {
    if (!request) return
    const fromPayload =
      request.payload && Object.prototype.hasOwnProperty.call(request.payload, 'gallery_payload')
        ? request.payload.gallery_payload
        : undefined
    const fromFields =
      request.fields && Object.prototype.hasOwnProperty.call(request.fields, 'gallery_payload')
        ? request.fields.gallery_payload
        : undefined
    const raw = fromPayload !== undefined ? fromPayload : fromFields
    if (raw === undefined || raw === null) return
    request._listingGalleryPayload = typeof raw === 'string' ? raw : String(raw)
    if (request.payload) delete request.payload.gallery_payload
    if (request.fields) delete request.fields.gallery_payload
  }

  /** Not a DB column — cast ids list from the custom form; must be removed before SQL insert/update. */
  function stashListingCastsPayload(request) {
    if (!request) return
    const fromPayload =
      request.payload && Object.prototype.hasOwnProperty.call(request.payload, 'casts_payload')
        ? request.payload.casts_payload
        : undefined
    const fromFields =
      request.fields && Object.prototype.hasOwnProperty.call(request.fields, 'casts_payload')
        ? request.fields.casts_payload
        : undefined
    const raw = fromPayload !== undefined ? fromPayload : fromFields
    if (raw === undefined || raw === null) return
    request._listingCastsPayload = typeof raw === 'string' ? raw : String(raw)
    if (request.payload) delete request.payload.casts_payload
    if (request.fields) delete request.fields.casts_payload
  }

  /** Express / JSON.stringify cannot serialize BigInt; mysql2 may surface BIGINT values as bigint. */
  function stripBigIntDeep(value) {
    if (typeof value === 'bigint') return value.toString()
    if (Array.isArray(value)) return value.map(stripBigIntDeep)
    if (value && typeof value === 'object') {
      const out = {}
      for (const [k, v] of Object.entries(value)) {
        out[k] = stripBigIntDeep(v)
      }
      return out
    }
    return value
  }

  /**
   * Refresh `record` from `context.record` after hooks so POST /edit responses always include full
   * RecordJSON (`recordActions`, etc.). Without this, ApiController can throw ConfigurationError after
   * the listing row was already committed, producing HTTP 500 despite a successful save.
   */
  function attachFreshListingRecordJson(response, context) {
    if (!response || typeof response !== 'object') return response
    const live = context?.record
    const currentAdmin = context?.currentAdmin
    if (!live || typeof live.toJSON !== 'function') return response
    try {
      const recordJson = live.toJSON(currentAdmin)
      return {
        ...response,
        record: stripBigIntDeep(recordJson),
      }
    } catch {
      return response
    }
  }

  function mysqlNow() {
    // YYYY-MM-DD HH:mm:ss in UTC
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  /** Ensure created_at/updated_at get sensible values on create/edit. */
  function ensureListingTimestamps(request, { isNew }) {
    if (!request) return
    const now = mysqlNow()

    const payload = request.payload && typeof request.payload === 'object' ? request.payload : null
    const fields = request.fields && typeof request.fields === 'object' ? request.fields : null

    const setIfMissing = (obj, key, value) => {
      if (!obj) return
      if (!(key in obj) || obj[key] === '' || obj[key] === null || typeof obj[key] === 'undefined') {
        obj[key] = value
      }
    }

    if (isNew) {
      setIfMissing(payload, 'created_at', now)
      setIfMissing(fields, 'created_at', now)
    }
    setIfMissing(payload, 'updated_at', now)
    setIfMissing(fields, 'updated_at', now)
  }

  function ensureListingAuditAdmins(request, context, { isNew }) {
    const adminId = context?.currentAdmin?.id
    if (!adminId) return

    const payload = request?.payload && typeof request.payload === 'object' ? request.payload : null
    const fields = request?.fields && typeof request.fields === 'object' ? request.fields : null

    const setIfMissing = (obj, key, value) => {
      if (!obj) return
      if (!(key in obj) || obj[key] === '' || obj[key] === null || typeof obj[key] === 'undefined') {
        obj[key] = value
      }
    }

    if (isNew) {
      setIfMissing(payload, 'created_by_admin_id', adminId)
      setIfMissing(fields, 'created_by_admin_id', adminId)
    }
    if (payload) payload.updated_by_admin_id = adminId
    if (fields) fields.updated_by_admin_id = adminId
  }

  function hideAuditProperties(extra = {}) {
    return {
      created_at: { isVisible: false },
      updated_at: { isVisible: false },
      ...extra,
    }
  }

  async function upsertListingGallery({ listingId, images }) {
    const pool = dbPool()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute(`DELETE FROM listing_gallery_images WHERE listing_id = ?`, [listingId])
      const limited = Array.isArray(images) ? images.slice(0, 10) : []
      let sort = 0
      for (const img of limited) {
        const p = img?.image_path ? String(img.image_path) : null
        if (!p) continue
        const sortOrder = Number.isFinite(Number(img?.sort_order)) ? Number(img.sort_order) : sort
        await conn.execute(
          `INSERT INTO listing_gallery_images (listing_id, image_path, sort_order) VALUES (?, ?, ?)`,
          [listingId, p, sortOrder]
        )
        sort += 1
      }
      await conn.commit()
    } catch (e) {
      try {
        await conn.rollback()
      } catch {
        // ignore
      }
      throw e
    } finally {
      conn.release()
    }
  }

  async function upsertListingShows({ listingId, shows }) {
    const pool = dbPool()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const [existingShows] = await conn.execute(`SELECT id FROM shows WHERE listing_id = ?`, [listingId])
      const existingShowIds = Array.isArray(existingShows) ? existingShows.map((r) => r.id) : []
      if (existingShowIds.length > 0) {
        await conn.execute(`DELETE FROM show_times WHERE show_id IN (${existingShowIds.map(() => '?').join(',')})`, [
          ...existingShowIds,
        ])
      }
      await conn.execute(`DELETE FROM shows WHERE listing_id = ?`, [listingId])

      for (const show of shows) {
        const placeId = Number(show.place_id)
        if (!Number.isFinite(placeId) || placeId <= 0) continue

        const startDate = show.start_date ? String(show.start_date) : null
        const endDate = show.end_date ? String(show.end_date) : null
        const publishAt = show.publish_at ? String(show.publish_at) : null
        const unpublishAt = show.unpublish_at ? String(show.unpublish_at) : null
        const bookingUrl = show.booking_url ? String(show.booking_url) : null
        const ticketCost =
          show.ticket_cost === '' || show.ticket_cost === null || show.ticket_cost === undefined
            ? null
            : Number(show.ticket_cost)
        const normalizedTicketCost = Number.isFinite(ticketCost) ? ticketCost : null

        const [showInsert] = await conn.execute(
          `
            INSERT INTO shows
              (listing_id, place_id, start_date, end_date, publish_at, unpublish_at, booking_url, ticket_cost)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [listingId, placeId, startDate, endDate, publishAt, unpublishAt, bookingUrl, normalizedTicketCost]
        )
        const showId = showInsert?.insertId
        if (!showId) continue

        const times = Array.isArray(show.times) ? show.times : []
        for (const t of times) {
          const showTime = t?.show_time ? String(t.show_time) : null
          if (!showTime) continue
          const notes = t?.notes ? String(t.notes) : null
          await conn.execute(`INSERT INTO show_times (show_id, show_time, notes) VALUES (?, ?, ?)`, [
            showId,
            showTime,
            notes,
          ])
        }
      }

      await conn.commit()
    } catch (e) {
      try {
        await conn.rollback()
      } catch {
        // ignore
      }
      throw e
    } finally {
      conn.release()
    }
  }

  async function upsertListingCasts({ listingId, castIds }) {
    const pool = dbPool()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.execute(`DELETE FROM listing_casts WHERE listing_id = ?`, [listingId])
      const ids = Array.isArray(castIds) ? castIds.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0) : []
      let sort = 0
      for (const castId of ids) {
        await conn.execute(
          `INSERT INTO listing_casts (listing_id, cast_id, sort_order) VALUES (?, ?, ?)`,
          [listingId, castId, sort]
        )
        sort += 1
      }
      await conn.commit()
    } catch (e) {
      try {
        await conn.rollback()
      } catch {
        // ignore
      }
      throw e
    } finally {
      conn.release()
    }
  }

  async function makeUniqueListingSlug(conn, sourceSlug) {
    const maxLen = 220
    const safeRoot = sourceSlug.length <= 180 ? sourceSlug : sourceSlug.slice(0, 180)
    let candidate = `${safeRoot}-copy`
    let n = 2
    for (; ;) {
      const slug = candidate.length > maxLen ? candidate.slice(0, maxLen) : candidate
      const [rows] = await conn.execute(`SELECT id FROM listings WHERE slug = ? LIMIT 1`, [slug])
      if (!Array.isArray(rows) || rows.length === 0) return slug
      candidate = `${safeRoot}-copy-${n}`
      n += 1
    }
  }

  async function duplicateListing({ sourceListingId, currentAdmin }) {
    const pool = dbPool()
    const conn = await pool.getConnection()
    const now = mysqlNow()
    const adminId = currentAdmin?.id != null ? Number(currentAdmin.id) : null

    try {
      await conn.beginTransaction()

      const [srcRows] = await conn.execute(
        `
          SELECT type_id, title, slug, description_html, banner_image, trailer_url,
                 status, publish_at, unpublish_at
          FROM listings WHERE id = ?
        `,
        [sourceListingId]
      )
      const src = Array.isArray(srcRows) && srcRows[0] ? srcRows[0] : null
      if (!src) {
        throw new Error('Listing not found')
      }

      const newSlug = await makeUniqueListingSlug(conn, String(src.slug))
      const newTitle = `${String(src.title)} (copy)`

      const [ins] = await conn.execute(
        `
          INSERT INTO listings
            (type_id, title, slug, description_html, banner_image, trailer_url,
             status, publish_at, unpublish_at, created_by_admin_id, updated_by_admin_id,
             created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          src.type_id,
          newTitle,
          newSlug,
          src.description_html,
          src.banner_image,
          src.trailer_url,
          src.status,
          src.publish_at,
          src.unpublish_at,
          Number.isFinite(adminId) ? adminId : null,
          Number.isFinite(adminId) ? adminId : null,
          now,
          now,
        ]
      )
      const newListingId = ins?.insertId
      if (!newListingId) throw new Error('Failed to create duplicate listing')

      const [galleryRows] = await conn.execute(
        `SELECT image_path, sort_order FROM listing_gallery_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC`,
        [sourceListingId]
      )
      for (const row of Array.isArray(galleryRows) ? galleryRows : []) {
        await conn.execute(
          `INSERT INTO listing_gallery_images (listing_id, image_path, sort_order) VALUES (?, ?, ?)`,
          [newListingId, row.image_path, row.sort_order]
        )
      }

      const [relatedRows] = await conn.execute(
        `SELECT related_listing_id FROM listing_related WHERE listing_id = ?`,
        [sourceListingId]
      )
      for (const row of Array.isArray(relatedRows) ? relatedRows : []) {
        await conn.execute(`INSERT INTO listing_related (listing_id, related_listing_id) VALUES (?, ?)`, [
          newListingId,
          row.related_listing_id,
        ])
      }

      const [showRows] = await conn.execute(
        `
          SELECT id, place_id, start_date, end_date, publish_at, unpublish_at, booking_url, ticket_cost
          FROM shows WHERE listing_id = ?
        `,
        [sourceListingId]
      )

      for (const show of Array.isArray(showRows) ? showRows : []) {
        const [showIns] = await conn.execute(
          `
            INSERT INTO shows
              (listing_id, place_id, start_date, end_date, publish_at, unpublish_at, booking_url, ticket_cost,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newListingId,
            show.place_id,
            show.start_date,
            show.end_date,
            show.publish_at,
            show.unpublish_at,
            show.booking_url,
            show.ticket_cost,
            now,
            now,
          ]
        )
        const newShowId = showIns?.insertId
        if (!newShowId) continue

        const [timeRows] = await conn.execute(
          `SELECT show_time, notes FROM show_times WHERE show_id = ? ORDER BY id ASC`,
          [show.id]
        )
        for (const t of Array.isArray(timeRows) ? timeRows : []) {
          await conn.execute(`INSERT INTO show_times (show_id, show_time, notes) VALUES (?, ?, ?)`, [
            newShowId,
            t.show_time,
            t.notes,
          ])
        }
      }

      await conn.commit()
      return { newListingId: Number(newListingId) }
    } catch (e) {
      try {
        await conn.rollback()
      } catch {
        // ignore
      }
      throw e
    } finally {
      conn.release()
    }
  }

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'AUS Ticket Lanka',
      softwareBrothers: false,
    },
    locale: {
      language: 'en',
      translations: {
        en: {
          labels: {
            pages: 'Site settings',
          },
          pages: {
            sliderBanner: 'Slider & Banner',
            homeListings: 'Homepage listings',
          },
        },
      },
    },
    assets: {
      styles: ['/admin/assets/admin-custom.css'],
    },
    dashboard: {
      component: Components.DashboardTiles,
      handler: async () => {
        const pool = dbPool()
        const [[l]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM listings`)
        const [[u]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM users`)
        const [[c]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM comments`)
        const [recent] = await pool.execute(
          `
            SELECT
              l.id, l.title, l.status, l.publish_at, l.created_at,
              t.name AS type_name
            FROM listings l
            JOIN types t ON t.id = l.type_id
            ORDER BY l.created_at DESC, l.id DESC
            LIMIT 8
          `
        )
        return {
          listingCount: Number(l?.cnt || 0),
          userCount: Number(u?.cnt || 0),
          commentCount: Number(c?.cnt || 0),
          recentListings: Array.isArray(recent) ? recent : [],
        }
      },
    },
    componentLoader,
    pages: {
      sliderBanner: {
        icon: 'Image',
        component: Components.SliderBannerSettings,
      },
      homeListings: {
        icon: 'List',
        component: Components.HomeListingsSettings,
      },
    },
    resources: [
      {
        resource: db.table('admins'),
        options: {
          navigation: { name: 'Admin', icon: 'User' },
          properties: {
            password_hash: { isVisible: false },
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
          },
          actions: {
            new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
          },
        },
      },
      {
        resource: db.table('admin_roles'),
        options: {
          navigation: { name: 'Admin', icon: 'Settings' },
          properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
          actions: {
            new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
          },
        },
      },
      {
        resource: db.table('admin_role_permissions'),
        options: {
          navigation: { name: 'Admin', icon: 'Settings' },
          properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
          actions: {
            new: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            edit: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
            delete: { isAccessible: ({ currentAdmin }) => currentAdmin?.role === 'main_admin' },
          },
        },
      },
      {
        resource: db.table('users'),
        options: {
          navigation: { name: 'Users', icon: 'User' },
          properties: {
            password_hash: { isVisible: false },
            is_blocked: { type: 'boolean' },
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('casts'),
        options: {
          navigation: { name: 'Users', icon: 'User' },
          sort: { sortBy: 'created_at', direction: 'desc' },
          listProperties: ['image_path', 'name', 'position', 'facebook_url', 'instagram_url', 'tiktok_url', 'wikipedia_url'],
          properties: hideAuditProperties({
            image_path: {
              components: {
                list: Components.CastImageUpload,
                show: Components.CastImageUpload,
                edit: Components.CastImageUpload,
              },
            },
            name: {
              components: {
                edit: Components.CastNameWithDuplicateHint,
              },
            },
            description: { type: 'textarea', props: { rows: 8 } },
          }),
        },
      },
      {
        resource: db.table('listing_casts'),
        options: {
          navigation: null,
          properties: {
            listing_id: { reference: 'listings' },
            cast_id: { reference: 'casts' },
            created_at: { isVisible: false },
          },
          actions: {
            list: { isVisible: false },
            show: { isVisible: false },
            new: { isVisible: false },
            edit: { isVisible: false },
            delete: { isVisible: false },
            bulkDelete: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('types'),
        options: { navigation: { name: 'Content', icon: 'Catalog' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } },
      },
      {
        resource: db.table('listings'),
        options: {
          navigation: { name: 'Content', icon: 'Movie' },
          sort: { sortBy: 'created_at', direction: 'desc' },
          listProperties: ['banner_image', 'title', 'slug', 'type_id', 'status', 'publish_at', 'unpublish_at'],
          properties: {
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
            created_by_admin_id: { isVisible: false, reference: 'admins' },
            updated_by_admin_id: { isVisible: false, reference: 'admins' },
            type_id: { reference: 'types' },
            title: {
              components: { edit: Components.ListingTitleLarge },
            },
            status: {
              components: {
                list: Components.ListingStatusBadge,
                show: Components.ListingStatusBadge,
              },
            },
            publish_at: {
              type: 'date',
              components: { edit: Components.ListingPublishDate },
            },
            unpublish_at: {
              type: 'date',
              components: { edit: Components.ListingUnpublishDate },
            },
            description_html: { type: 'textarea', props: { rows: 12 } },
            banner_image: {
              isVisible: { list: true, show: true, edit: false, filter: false },
              components: {
                list: Components.ImageThumb,
                show: Components.ImageThumb,
              },
            },
          },
          actions: {
            new: {
              component: Components.ListingTabbedForm,
              before: async (request, context) => {
                ensureListingTimestamps(request, { isNew: true })
                ensureListingAuditAdmins(request, context, { isNew: true })
                stashListingShowsPayload(request)
                stashListingGalleryPayload(request)
                stashListingCastsPayload(request)
                return request
              },
              after: async (response, request, context) => {
                try {
                  const recordId = response?.record?.id
                  const payload = request?._listingShowsPayload
                  if (!recordId || !payload) return attachFreshListingRecordJson(response, context)
                  const parsed = JSON.parse(String(payload))
                  const shows = Array.isArray(parsed?.shows) ? parsed.shows : []
                  await upsertListingShows({ listingId: Number(recordId), shows })
                  const galleryPayload = request?._listingGalleryPayload
                  if (galleryPayload) {
                    const gParsed = JSON.parse(String(galleryPayload))
                    const images = Array.isArray(gParsed?.images) ? gParsed.images : []
                    await upsertListingGallery({ listingId: Number(recordId), images })
                  }
                  const castsPayload = request?._listingCastsPayload
                  if (castsPayload) {
                    const cParsed = JSON.parse(String(castsPayload))
                    const castIds = Array.isArray(cParsed?.cast_ids) ? cParsed.cast_ids : []
                    await upsertListingCasts({ listingId: Number(recordId), castIds })
                  }
                  return attachFreshListingRecordJson(response, context)
                } catch (e) {
                  return attachFreshListingRecordJson(
                    {
                      ...response,
                      notice: {
                        message: `Listing saved but shows failed to save: ${e?.message || e}`,
                        type: 'error',
                      },
                    },
                    context
                  )
                }
              },
            },
            edit: {
              component: Components.ListingTabbedForm,
              before: async (request, context) => {
                ensureListingTimestamps(request, { isNew: false })
                ensureListingAuditAdmins(request, context, { isNew: false })
                stashListingShowsPayload(request)
                stashListingGalleryPayload(request)
                stashListingCastsPayload(request)
                return request
              },
              after: async (response, request, context) => {
                try {
                  const recordId = response?.record?.id
                  const payload = request?._listingShowsPayload
                  if (!recordId || !payload) return attachFreshListingRecordJson(response, context)
                  const parsed = JSON.parse(String(payload))
                  const shows = Array.isArray(parsed?.shows) ? parsed.shows : []
                  await upsertListingShows({ listingId: Number(recordId), shows })
                  const galleryPayload = request?._listingGalleryPayload
                  if (galleryPayload) {
                    const gParsed = JSON.parse(String(galleryPayload))
                    const images = Array.isArray(gParsed?.images) ? gParsed.images : []
                    await upsertListingGallery({ listingId: Number(recordId), images })
                  }
                  const castsPayload = request?._listingCastsPayload
                  if (castsPayload) {
                    const cParsed = JSON.parse(String(castsPayload))
                    const castIds = Array.isArray(cParsed?.cast_ids) ? cParsed.cast_ids : []
                    await upsertListingCasts({ listingId: Number(recordId), castIds })
                  }
                  return attachFreshListingRecordJson(response, context)
                } catch (e) {
                  return attachFreshListingRecordJson(
                    {
                      ...response,
                      notice: {
                        message: `Listing saved but shows failed to save: ${e?.message || e}`,
                        type: 'error',
                      },
                    },
                    context
                  )
                }
              },
            },
            duplicate: {
              actionType: 'record',
              icon: 'Copy',
              component: Components.DuplicateListingAction,
              handler: async (request, _response, context) => {
                const { record, resource, currentAdmin, h } = context
                if (!request.params.recordId || !record) {
                  throw new Error(['You have to pass "recordId" to duplicate listing'].join('\n'))
                }
                if (request.method === 'get') {
                  return {
                    record: record.toJSON(currentAdmin),
                  }
                }
                try {
                  const { newListingId } = await duplicateListing({
                    sourceListingId: Number(request.params.recordId),
                    currentAdmin,
                  })
                  const newRecord = await resource.findOne(String(newListingId))
                  if (!newRecord) {
                    return {
                      record: record.toJSON(currentAdmin),
                      notice: {
                        message: 'Listing duplicated but could not load the new record.',
                        type: 'error',
                      },
                    }
                  }
                  const resourceId = resource._decorated?.id() || resource.id()
                  return {
                    record: newRecord.toJSON(currentAdmin),
                    redirectUrl: h.editUrl(resourceId, String(newListingId)),
                    notice: {
                      message: `Duplicated as "${newRecord.params?.title ?? 'copy'}".`,
                      type: 'success',
                    },
                  }
                } catch (e) {
                  return {
                    record: record.toJSON(currentAdmin),
                    notice: {
                      message: e?.message || String(e),
                      type: 'error',
                    },
                  }
                }
              },
            },
          },
        },
      },
      {
        resource: db.table('promotions'),
        options: {
          navigation: { name: 'Content', icon: 'Gift' },
          listProperties: [
            'image_path',
            'title',
            'slug',
            'promo_type',
            'youtube_url',
            'embed_html',
            'status',
            'publish_at',
            'unpublish_at',
            'sort_order',
          ],
          properties: {
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
            created_by_admin_id: { isVisible: false, reference: 'admins' },
            updated_by_admin_id: { isVisible: false, reference: 'admins' },
            promo_type: {
              availableValues: [
                { value: 'image', label: 'Image' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'html', label: 'Embed HTML' },
              ],
            },
            youtube_url: {
              props: { placeholder: 'https://youtube.com/watch?v=...' },
              components: {
                list: Components.CodePreview,
                show: Components.CodePreview,
              },
            },
            image_path: {
              components: {
                list: Components.ImageThumb,
                show: Components.ImageThumb,
              },
            },
            embed_html: {
              type: 'textarea',
              props: { rows: 10 },
              components: {
                list: Components.CodePreview,
                show: Components.CodePreview,
              },
            },
          },
          actions: {
            new: {
              before: async (request, context) => {
                ensureListingTimestamps(request, { isNew: true })
                ensureListingAuditAdmins(request, context, { isNew: true })
                return request
              },
            },
            edit: {
              before: async (request, context) => {
                ensureListingTimestamps(request, { isNew: false })
                ensureListingAuditAdmins(request, context, { isNew: false })
                return request
              },
            },
          },
        },
      },
      {
        resource: db.table('listing_gallery_images'),
        options: {
          navigation: { name: 'Content', icon: 'Image' },
          sort: { sortBy: 'created_at', direction: 'desc' },
          properties: {
            listing_id: { reference: 'listings' },
            image_path: {
              components: {
                list: Components.ImageThumb,
                show: Components.ImageThumb,
                edit: Components.GalleryImageUpload,
              },
            },
            created_at: { isVisible: false },
          },
          actions: {
            list: { component: Components.ListingGalleryGrid, perPage: 20 },
          },
        },
      },
      {
        resource: db.table('listing_related'),
        options: { navigation: { name: 'Content', icon: 'Link' }, properties: { created_at: { isVisible: false } } },
      },

      {
        resource: db.table('countries'),
        options: {
          navigation: { name: 'Locations', icon: 'Map' },
          listProperties: ['flag_image_path', 'name', 'code'],
          properties: {
            flag_image_path: {
              components: {
                list: Components.FlagImageUpload,
                show: Components.FlagImageUpload,
                edit: Components.FlagImageUpload,
              },
            },
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
          },
        },
      },
      { resource: db.table('states'), options: { navigation: { name: 'Locations', icon: 'Map' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      { resource: db.table('cities'), options: { navigation: { name: 'Locations', icon: 'Map' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      {
        resource: db.table('places'),
        options: {
          navigation: { name: 'Locations', icon: 'Pin' },
          listProperties: ['name', 'city_id', 'address', 'google_map_link'],
          properties: {
            name: {
              components: {
                edit: Components.PlaceNameWithDuplicateHint,
              },
            },
            city_id: { reference: 'cities' },
            google_map_link: {
              props: { placeholder: 'https://maps.google.com/?q=...' },
              components: {
                list: Components.PlaceGoogleMapLink,
                show: Components.PlaceGoogleMapLink,
                edit: Components.PlaceGoogleMapLink,
              },
            },
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
          },
        },
      },

      {
        resource: db.table('shows'),
        options: {
          navigation: null,
          properties: {
            listing_id: { reference: 'listings' },
            place_id: { reference: 'places' },
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
          },
          actions: { list: { isVisible: false }, show: { isVisible: false }, new: { isVisible: false }, edit: { isVisible: false }, delete: { isVisible: false } },
        },
      },
      {
        resource: db.table('show_times'),
        options: {
          navigation: null,
          properties: {
            show_id: { reference: 'shows' },
            created_at: { isVisible: false },
          },
          actions: { list: { isVisible: false }, show: { isVisible: false }, new: { isVisible: false }, edit: { isVisible: false }, delete: { isVisible: false } },
        },
      },

      { resource: db.table('comments'), options: { navigation: { name: 'Moderation', icon: 'Chat' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      { resource: db.table('ratings'), options: { navigation: { name: 'Moderation', icon: 'Star' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },

      { resource: db.table('login_events'), options: { navigation: { name: 'Analytics', icon: 'Activity' }, properties: { created_at: { isVisible: false } } } },
      { resource: db.table('page_visits'), options: { navigation: { name: 'Analytics', icon: 'Activity' }, properties: { created_at: { isVisible: false } } } },
      { resource: db.table('booking_clicks'), options: { navigation: { name: 'Analytics', icon: 'Activity' }, properties: { created_at: { isVisible: false } } } },
      { resource: db.table('refresh_tokens'), options: { navigation: { name: 'Auth', icon: 'Locked' }, properties: { created_at: { isVisible: false } } } },
    ],
  })

  return admin
}

