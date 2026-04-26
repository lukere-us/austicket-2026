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

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'AUS Ticket Lanka',
      softwareBrothers: false,
    },
    componentLoader,
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
        resource: db.table('types'),
        options: { navigation: { name: 'Content', icon: 'Catalog' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } },
      },
      {
        resource: db.table('listings'),
        options: {
          navigation: { name: 'Content', icon: 'Movie' },
          listProperties: ['banner_image', 'title', 'slug', 'type_id', 'status', 'publish_at', 'unpublish_at'],
          properties: {
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
            created_by_admin_id: { isVisible: false, reference: 'admins' },
            updated_by_admin_id: { isVisible: false, reference: 'admins' },
            type_id: { reference: 'types' },
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
                return request
              },
              after: async (response, request) => {
                try {
                  const recordId = response?.record?.id
                  const payload = request?._listingShowsPayload
                  if (!recordId || !payload) return response
                  const parsed = JSON.parse(String(payload))
                  const shows = Array.isArray(parsed?.shows) ? parsed.shows : []
                  await upsertListingShows({ listingId: Number(recordId), shows })
                  const galleryPayload = request?._listingGalleryPayload
                  if (galleryPayload) {
                    const gParsed = JSON.parse(String(galleryPayload))
                    const images = Array.isArray(gParsed?.images) ? gParsed.images : []
                    await upsertListingGallery({ listingId: Number(recordId), images })
                  }
                  return response
                } catch (e) {
                  return {
                    ...response,
                    notice: {
                      message: `Listing saved but shows failed to save: ${e?.message || e}`,
                      type: 'error',
                    },
                  }
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
                return request
              },
              after: async (response, request) => {
                try {
                  const recordId = response?.record?.id
                  const payload = request?._listingShowsPayload
                  if (!recordId || !payload) return response
                  const parsed = JSON.parse(String(payload))
                  const shows = Array.isArray(parsed?.shows) ? parsed.shows : []
                  await upsertListingShows({ listingId: Number(recordId), shows })
                  const galleryPayload = request?._listingGalleryPayload
                  if (galleryPayload) {
                    const gParsed = JSON.parse(String(galleryPayload))
                    const images = Array.isArray(gParsed?.images) ? gParsed.images : []
                    await upsertListingGallery({ listingId: Number(recordId), images })
                  }
                  return response
                } catch (e) {
                  return {
                    ...response,
                    notice: {
                      message: `Listing saved but shows failed to save: ${e?.message || e}`,
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
        resource: db.table('listing_gallery_images'),
        options: {
          navigation: { name: 'Content', icon: 'Image' },
          properties: {
            listing_id: { reference: 'listings' },
            image_path: {
              components: {
                list: Components.ImageThumb,
                show: Components.ImageThumb,
              },
            },
            created_at: { isVisible: false },
          },
        },
      },
      {
        resource: db.table('listing_related'),
        options: { navigation: { name: 'Content', icon: 'Link' }, properties: { created_at: { isVisible: false } } },
      },

      { resource: db.table('countries'), options: { navigation: { name: 'Locations', icon: 'Map' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      { resource: db.table('states'), options: { navigation: { name: 'Locations', icon: 'Map' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      { resource: db.table('cities'), options: { navigation: { name: 'Locations', icon: 'Map' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },
      { resource: db.table('places'), options: { navigation: { name: 'Locations', icon: 'Pin' }, properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } } } },

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

