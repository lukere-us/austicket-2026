import path from 'path'
import { fileURLToPath } from 'url'
import { AdminJS, ComponentLoader } from 'adminjs'
import NewAction from '../node_modules/adminjs/lib/backend/actions/new/new-action.js'
import EditAction from '../node_modules/adminjs/lib/backend/actions/edit/edit-action.js'
import { Adapter, Database, Resource } from './lib/adminjsSql.js'
import { dbPool, getDbConfig } from './db.js'
import { normalizeListingDatetime } from './components/listingDateUtils.js'
import { fetchDailyAnalyticsSeries, fetchDashboardAnalytics } from './lib/dashboardAnalytics.js'
import { applyPermissionsToResourceOptions, can, canAny, canAccessPage, isMainAdminRole } from './lib/adminPermissions.js'
import { loadHeaderSettings } from './lib/headerSettings.js'
import { resolveAdminBrandLogoFromHeader } from './lib/adminBrandLogo.js'
import { ADMIN_PERMISSION_KEYS } from './lib/adminPermissions.shared.js'
import {
  fetchRoleById,
  fetchRolePermissionKeys,
  isMainAdminRoleName,
} from './lib/rolePermissions.server.js'

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
    ListingScheduleDate: componentLoader.add(
      'ListingScheduleDate',
      path.join(__dirname, 'components', 'ListingScheduleDate.jsx')
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
    FooterSettings: componentLoader.add(
      'FooterSettings',
      path.join(__dirname, 'components', 'FooterSettings.jsx')
    ),
    HeaderSettings: componentLoader.add(
      'HeaderSettings',
      path.join(__dirname, 'components', 'HeaderSettings.jsx')
    ),
    PartnersSettings: componentLoader.add(
      'PartnersSettings',
      path.join(__dirname, 'components', 'PartnersSettings.jsx')
    ),
    AdsSettings: componentLoader.add('AdsSettings', path.join(__dirname, 'components', 'AdsSettings.jsx')),
    YoutubeCarouselSettings: componentLoader.add(
      'YoutubeCarouselSettings',
      path.join(__dirname, 'components', 'YoutubeCarouselSettings.jsx')
    ),
    BlogCoverUpload: componentLoader.add(
      'BlogCoverUpload',
      path.join(__dirname, 'components', 'BlogCoverUpload.jsx')
    ),
    BlogTitleWithSlug: componentLoader.add(
      'BlogTitleWithSlug',
      path.join(__dirname, 'components', 'BlogTitleWithSlug.jsx')
    ),
    BlogEditForm: componentLoader.add('BlogEditForm', path.join(__dirname, 'components', 'BlogEditForm.jsx')),
    PageEditForm: componentLoader.add('PageEditForm', path.join(__dirname, 'components', 'PageEditForm.jsx')),
    PageBannerUpload: componentLoader.add(
      'PageBannerUpload',
      path.join(__dirname, 'components', 'PageBannerUpload.jsx')
    ),
    RolePermissionsForm: componentLoader.add(
      'RolePermissionsForm',
      path.join(__dirname, 'components', 'RolePermissionsForm.jsx')
    ),
    AdminHelp: componentLoader.add('AdminHelp', path.join(__dirname, 'components', 'AdminHelp.jsx')),
  }

  const cfg = getDbConfig()
  const databaseName = cfg.database
  const db = await new Adapter('mysql2', {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: databaseName,
  }).init()

  let adminRoleChoices = []
  try {
    const pool = dbPool()
    const [rows] = await pool.execute(`SELECT id, name FROM admin_roles ORDER BY name ASC`)
    adminRoleChoices = (rows || []).map((row) => ({
      value: Number(row.id),
      label: String(row.name),
    }))
  } catch {
    adminRoleChoices = []
  }

  /** Attach permission keys to role edit record JSON (avoids client fetch loop). */
  async function enrichRolePermissionsRecord(response, context) {
    if (!response?.record) return response

    let recordJson = response.record
    if (recordJson && typeof recordJson.toJSON === 'function') {
      try {
        recordJson = recordJson.toJSON(context.currentAdmin)
      } catch {
        recordJson = { ...recordJson }
      }
    }

    const roleId =
      recordJson?.id ??
      recordJson?.params?.id ??
      context?.record?.id ??
      context?.request?.params?.recordId

    if (!roleId) return response

    const pool = dbPool()
    const role = await fetchRoleById(pool, roleId)
    if (!role) return response

    const isMain = isMainAdminRoleName(role.name)
    const allowedKeys = isMain
      ? ADMIN_PERMISSION_KEYS
      : await fetchRolePermissionKeys(pool, roleId)

    return {
      ...response,
      record: {
        ...recordJson,
        params: {
          ...(recordJson.params || {}),
          name: role.name,
          _roleAllowedKeys: JSON.stringify(allowedKeys),
          _roleIsMainAdmin: isMain ? '1' : '0',
        },
      },
    }
  }

  function res(tableName, options, extraActions = []) {
    return {
      resource: db.table(tableName),
      options: applyPermissionsToResourceOptions(options, tableName, extraActions),
    }
  }

  function analyticsDailyChartAction(tableName) {
    return {
      actionType: 'resource',
      isVisible: false,
      isAccessible: ({ currentAdmin }) => can(currentAdmin, `${tableName}.list`),
      handler: async (request) => {
        const rawDays = request?.query?.days ?? request?.params?.days
        const days = Number(rawDays) || 30
        return fetchDailyAnalyticsSeries(dbPool(), tableName, days)
      },
    }
  }

  /** Legacy table — permissions are edited on the Roles form; keep resource registered but fully hidden. */
  function resHidden(tableName) {
    const block = { isAccessible: () => false, isVisible: false }
    return {
      resource: db.table(tableName),
      options: {
        navigation: false,
        actions: {
          list: block,
          show: block,
          new: block,
          edit: block,
          delete: block,
          bulkDelete: block,
        },
      },
    }
  }

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

  const LISTING_VIRTUAL_PAYLOAD_KEYS = ['shows_payload', 'gallery_payload', 'casts_payload']

  const LISTING_NULLABLE_FIELDS = [
    'description_html',
    'banner_image',
    'detail_banner_image',
    'trailer_url',
    'publish_at',
    'unpublish_at',
    'created_by_admin_id',
    'updated_by_admin_id',
  ]

  const LISTING_READONLY_ON_SAVE = ['id', 'created_at', 'updated_at']

  const LISTING_REFERENCE_FIELDS = ['type_id', 'created_by_admin_id', 'updated_by_admin_id']

  function coerceListingReferenceId(value) {
    if (value == null || value === '') return value
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = value.params?.id ?? value.id
      if (nested != null && nested !== '') return nested
    }
    return value
  }

  function listingEmptyFormValue(value) {
    if (value === '' || value == null) return true
    if (value instanceof Date) return Number.isNaN(value.getTime())
    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).length === 0
    }
    return false
  }

  /** Strip virtual form fields and normalize empty strings before SQL insert/update. */
  function prepareListingRequest(request) {
    if (!request) return
    stashListingShowsPayload(request)
    stashListingGalleryPayload(request)
    stashListingCastsPayload(request)

    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
      for (const key of LISTING_VIRTUAL_PAYLOAD_KEYS) {
        delete obj[key]
      }
      for (const key of LISTING_READONLY_ON_SAVE) {
        delete obj[key]
      }
      for (const key of LISTING_REFERENCE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj[key] = coerceListingReferenceId(obj[key])
        }
      }
      for (const key of LISTING_NULLABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && listingEmptyFormValue(obj[key])) {
          obj[key] = null
        }
      }
      for (const key of ['publish_at', 'unpublish_at']) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
        const normalized = normalizeListingDatetime(obj[key])
        obj[key] = normalized || null
      }
      if (!Object.prototype.hasOwnProperty.call(obj, 'is_featured') || listingEmptyFormValue(obj.is_featured)) {
        obj.is_featured = 0
      } else if (obj.is_featured === true || obj.is_featured === 'true' || obj.is_featured === '1' || obj.is_featured === 1) {
        obj.is_featured = 1
      } else {
        obj.is_featured = 0
      }
    }

    normalize(request.payload)
    normalize(request.fields)
  }

  async function persistListingRelatedData(request, recordId) {
    const payload = request?._listingShowsPayload
    if (payload) {
      const parsed = JSON.parse(String(payload))
      const shows = Array.isArray(parsed?.shows) ? parsed.shows : []
      await upsertListingShows({ listingId: Number(recordId), shows })
    }
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
  }

  /** @adminjs/sql create() does not return insertId — resolve id from response, context, or slug. */
  async function resolveListingRecordId(response, request, context) {
    const fromParams = request?.params?.recordId
    if (fromParams != null && fromParams !== '') return Number(fromParams)

    const direct =
      response?.record?.id ??
      response?.record?.params?.id ??
      (typeof context?.record?.id === 'function' ? context.record.id() : context?.record?.id)
    if (direct != null && direct !== '') return Number(direct)

    const slug = String(
      request?.payload?.slug ?? request?.fields?.slug ?? response?.record?.params?.slug ?? ''
    ).trim()
    if (!slug) return null

    try {
      const pool = dbPool()
      const [rows] = await pool.execute(
        'SELECT id FROM listings WHERE slug = ? ORDER BY id DESC LIMIT 1',
        [slug]
      )
      const id = rows?.[0]?.id
      return id != null ? Number(id) : null
    } catch {
      return null
    }
  }

  async function finalizeListingRecordResponse(response, request, context, { isNew = false } = {}) {
    if (!response || typeof response !== 'object') return response
    const recordId = await resolveListingRecordId(response, request, context)
    const { resource, currentAdmin, h } = context || {}

    if (recordId && resource?.findOne) {
      try {
        const fresh = await resource.findOne(String(recordId))
        if (fresh && typeof fresh.toJSON === 'function') {
          const recordJson = stripBigIntDeep(fresh.toJSON(currentAdmin))
          const resourceId = resource._decorated?.id?.() || resource.id?.() || 'listings'
          const out = stripBigIntDeep({
            ...response,
            record: recordJson,
          })
          if (isNew && h?.editUrl && !out.redirectUrl) {
            out.redirectUrl = h.editUrl(resourceId, String(recordId))
          }
          return out
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[listings] finalizeListingRecordResponse', e)
      }
    }

    return attachFreshListingRecordJson(response, context)
  }

  async function completeListingAfterSave(response, request, context, { isNew = false } = {}) {
    if (response?.notice?.type === 'error') {
      return stripBigIntDeep(response)
    }
    const recordId = await resolveListingRecordId(response, request, context)
    if (!recordId) {
      return finalizeListingRecordResponse(response, request, context, { isNew })
    }

    try {
      await persistListingRelatedData(request, recordId)
      return finalizeListingRecordResponse(response, request, context, { isNew })
    } catch (e) {
      return finalizeListingRecordResponse(
        {
          ...response,
          notice: {
            message: `Listing saved but related data failed to save: ${e?.message || e}`,
            type: 'error',
          },
        },
        request,
        context,
        { isNew }
      )
    }
  }

  async function listingEditHandler(request, response, context) {
    try {
      return await EditAction.handler(request, response, context)
    } catch (e) {
      const { record, currentAdmin } = context
      let recordJson = { params: {}, errors: {}, populated: {} }
      if (record && typeof record.toJSON === 'function') {
        try {
          recordJson = stripBigIntDeep(record.toJSON(currentAdmin))
        } catch {
          // keep empty shell
        }
      }
      const msg = String(e?.message || e)
      if (e?.code === 'ER_DUP_ENTRY' && msg.includes('uq_listings_slug')) {
        const slug = String(request?.payload?.slug ?? request?.fields?.slug ?? '').trim()
        return {
          record: {
            ...recordJson,
            errors: {
              slug: { message: slug ? `Slug "${slug}" is already in use.` : 'This slug is already in use.' },
            },
          },
          notice: { message: 'thereWereValidationErrors', type: 'error' },
        }
      }
      return {
        record: recordJson,
        notice: { message: msg.slice(0, 500), type: 'error' },
      }
    }
  }

  async function listingNewHandler(request, response, context) {
    try {
      return await NewAction.handler(request, response, context)
    } catch (e) {
      const msg = String(e?.message || e)
      if (e?.code === 'ER_DUP_ENTRY' && msg.includes('uq_listings_slug')) {
        const slug = String(request?.payload?.slug ?? request?.fields?.slug ?? '').trim()
        return {
          record: {
            params: {
              ...(request?.payload && typeof request.payload === 'object' ? request.payload : {}),
            },
            errors: {
              slug: { message: slug ? `Slug "${slug}" is already in use.` : 'This slug is already in use.' },
            },
            populated: {},
            baseError: null,
          },
          notice: { message: 'thereWereValidationErrors', type: 'error' },
        }
      }
      throw e
    }
  }

  /** Express / JSON.stringify cannot serialize BigInt; mysql2 may surface BIGINT values as bigint. */
  function stripBigIntDeep(value) {
    if (typeof value === 'bigint') return value.toString()
    // Date is typeof 'object' — never walk it with Object.entries (that becomes {}).
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null
      const y = value.getFullYear()
      const m = String(value.getMonth() + 1).padStart(2, '0')
      const d = String(value.getDate()).padStart(2, '0')
      const hh = String(value.getHours()).padStart(2, '0')
      const mm = String(value.getMinutes()).padStart(2, '0')
      const ss = String(value.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
    }
    if (Buffer.isBuffer?.(value)) return value.toString('utf8')
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
    if (!live || typeof live.toJSON !== 'function') return stripBigIntDeep(response)
    try {
      const recordJson = live.toJSON(currentAdmin)
      return stripBigIntDeep({
        ...response,
        record: recordJson,
      })
    } catch {
      return stripBigIntDeep(response)
    }
  }

  function mysqlNow() {
    // YYYY-MM-DD HH:mm:ss in UTC
    return new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  /** Let MySQL defaults manage timestamps; only strip empty values so inserts stay valid. */
  function ensureListingTimestamps(request) {
    if (!request) return
    const payload = request.payload && typeof request.payload === 'object' ? request.payload : null
    const fields = request.fields && typeof request.fields === 'object' ? request.fields : null
    for (const obj of [payload, fields]) {
      if (!obj) continue
      for (const key of ['created_at', 'updated_at']) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && (obj[key] === '' || obj[key] == null)) {
          delete obj[key]
        }
      }
    }
  }

  function slugifyBlogTitle(title) {
    return String(title || '')
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 220)
  }

  function ensureBlogSlug(request) {
    if (!request?.payload || typeof request.payload !== 'object') return
    const title = String(request.payload.title || '').trim()
    const slug = String(request.payload.slug || '').trim()
    if (!slug && title) {
      request.payload.slug = slugifyBlogTitle(title)
    }
    if (request.fields && typeof request.fields === 'object') {
      const fieldsSlug = String(request.fields.slug || '').trim()
      if (!fieldsSlug && title) {
        request.fields.slug = slugifyBlogTitle(title)
      }
    }
  }

  const BLOG_REMOVED_FIELDS = ['publish_at', 'unpublish_at', 'sort_order']

  function prepareBlogRequest(request) {
    if (!request) return
    const strip = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
      for (const key of BLOG_REMOVED_FIELDS) {
        delete obj[key]
      }
      if (!Object.prototype.hasOwnProperty.call(obj, 'is_featured') || listingEmptyFormValue(obj.is_featured)) {
        obj.is_featured = 0
      } else if (
        obj.is_featured === true ||
        obj.is_featured === 'true' ||
        obj.is_featured === '1' ||
        obj.is_featured === 1
      ) {
        obj.is_featured = 1
      } else {
        obj.is_featured = 0
      }
    }
    strip(request.payload)
    strip(request.fields)
  }

  function prepareCmsPageRequest(request) {
    if (!request) return
    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
      if (!obj.status) obj.status = 'draft'
      if (typeof obj.body_html === 'undefined') obj.body_html = ''
      delete obj.embed_html
      if (
        !Object.prototype.hasOwnProperty.call(obj, 'parent_id') ||
        obj.parent_id === '' ||
        obj.parent_id === 'null' ||
        obj.parent_id == null
      ) {
        obj.parent_id = null
      } else {
        const n = Number(obj.parent_id)
        obj.parent_id = Number.isFinite(n) && n > 0 ? n : null
      }
      if (obj.banner_image === undefined) obj.banner_image = null
    }
    normalize(request.payload)
    normalize(request.fields)
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
        const bookingUrl = show.booking_url ? String(show.booking_url) : null
        const ticketCost =
          show.ticket_cost === '' || show.ticket_cost === null || show.ticket_cost === undefined
            ? null
            : Number(show.ticket_cost)
        const normalizedTicketCost = Number.isFinite(ticketCost) ? ticketCost : null

        const [showInsert] = await conn.execute(
          `
            INSERT INTO shows
              (listing_id, place_id, start_date, end_date, booking_url, ticket_cost)
            VALUES
              (?, ?, ?, ?, ?, ?)
          `,
          [listingId, placeId, startDate, endDate, bookingUrl, normalizedTicketCost]
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
          SELECT type_id, title, slug, description_html, banner_image, detail_banner_image, trailer_url,
                 organizer_partner_id, status, publish_at, unpublish_at
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
            (type_id, title, slug, description_html, banner_image, detail_banner_image, trailer_url,
             organizer_partner_id, status, publish_at, unpublish_at, created_by_admin_id, updated_by_admin_id,
             created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          src.type_id,
          newTitle,
          newSlug,
          src.description_html,
          src.banner_image,
          src.detail_banner_image,
          src.trailer_url,
          src.organizer_partner_id ?? null,
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
          SELECT id, place_id, start_date, end_date, booking_url, ticket_cost
          FROM shows WHERE listing_id = ?
        `,
        [sourceListingId]
      )

      for (const show of Array.isArray(showRows) ? showRows : []) {
        const [showIns] = await conn.execute(
          `
            INSERT INTO shows
              (listing_id, place_id, start_date, end_date, booking_url, ticket_cost,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newListingId,
            show.place_id,
            show.start_date,
            show.end_date,
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

  componentLoader.override('SidebarPages', path.join(__dirname, 'components', 'SidebarPages.jsx'))
  componentLoader.override('SidebarBranding', path.join(__dirname, 'components', 'AdminSidebarBranding.jsx'))
  componentLoader.override('Login', path.join(__dirname, 'components', 'AdminLogin.jsx'))

  let brandLogo = null
  try {
    brandLogo = resolveAdminBrandLogoFromHeader(await loadHeaderSettings(dbPool()), '/admin')
  } catch {
    brandLogo = null
  }

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'AUS Ticket Lanka',
      ...(brandLogo ? { logo: brandLogo } : {}),
      softwareBrothers: false,
      withMadeWithLove: false,
    },
    locale: {
      language: 'en',
      translations: {
        en: {
          labels: {
            pages: 'Site settings',
            cms_pages: 'Pages',
            admins: 'Admin users',
            admin_roles: 'Roles',
            admin_role_permissions: 'Role permissions (legacy)',
          },
          pages: {
            sliderBanner: 'Slider & Banner',
            homeListings: 'Homepage listings',
            footer: 'Footer settings',
            header: 'Header settings',
            partners: 'Partners slider',
            ads: 'Ads',
            youtubeCarousel: 'YouTube carousel',
            help: 'Help',
          },
        },
      },
    },
    assets: {
      styles: ['/admin/assets/react-datepicker.min.css', '/admin/assets/admin-custom.css'],
      scripts: ['/admin/assets/admin-form-actions.js'],
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
        const analytics = await fetchDashboardAnalytics(pool, 30)
        return {
          listingCount: Number(l?.cnt || 0),
          userCount: Number(u?.cnt || 0),
          commentCount: Number(c?.cnt || 0),
          recentListings: Array.isArray(recent) ? recent : [],
          ...analytics,
        }
      },
    },
    componentLoader,
    pages: {
      sliderBanner: {
        icon: 'Slideshow',
        component: Components.SliderBannerSettings,
        isAccessible: ({ currentAdmin }) => canAccessPage(currentAdmin, 'sliderBanner'),
      },
      homeListings: {
        icon: 'ViewList',
        component: Components.HomeListingsSettings,
        isAccessible: ({ currentAdmin }) => canAccessPage(currentAdmin, 'homeListings'),
      },
      footer: {
        icon: 'Menu',
        component: Components.FooterSettings,
        isAccessible: ({ currentAdmin }) =>
          canAny(currentAdmin, ['pages.footer', 'pages.homeListings', 'pages.sliderBanner']),
      },
      header: {
        icon: 'Settings',
        component: Components.HeaderSettings,
        isAccessible: ({ currentAdmin }) =>
          canAny(currentAdmin, ['pages.header', 'pages.homeListings', 'pages.sliderBanner']),
      },
      partners: {
        icon: 'Image',
        component: Components.PartnersSettings,
        isAccessible: ({ currentAdmin }) =>
          canAny(currentAdmin, ['pages.partners', 'pages.homeListings', 'pages.sliderBanner']),
      },
      ads: {
        icon: 'Campaign',
        component: Components.AdsSettings,
        isAccessible: ({ currentAdmin }) =>
          canAny(currentAdmin, ['pages.ads', 'pages.homeListings', 'pages.sliderBanner']),
      },
      youtubeCarousel: {
        icon: 'Video',
        component: Components.YoutubeCarouselSettings,
        isAccessible: ({ currentAdmin }) =>
          canAny(currentAdmin, ['pages.youtubeCarousel', 'pages.homeListings', 'pages.sliderBanner']),
      },
      help: {
        icon: 'Help',
        component: Components.AdminHelp,
        isAccessible: ({ currentAdmin }) => Boolean(currentAdmin),
      },
    },
    resources: [
      res('admins', {
        navigation: { name: 'Admin', icon: 'User' },
        listProperties: ['name', 'email', 'role_id', 'is_active'],
        properties: {
          password_hash: { isVisible: false },
          created_at: { isVisible: false },
          updated_at: { isVisible: false },
          is_active: { type: 'boolean' },
          role_id: {
            availableValues: adminRoleChoices,
            isRequired: true,
          },
        },
      }),
      res('admin_roles', {
        navigation: { name: 'Admin', icon: 'Shield' },
        listProperties: ['name'],
        properties: {
          name: {
            isTitle: true,
            isVisible: { list: true, show: true, edit: false, new: false, filter: true },
          },
          created_at: { isVisible: false },
          updated_at: { isVisible: false },
        },
        actions: {
          list: { isVisible: true },
          show: {
            isAccessible: ({ currentAdmin }) => can(currentAdmin, 'admin_roles.list'),
            isVisible: false,
          },
          show: {
            isVisible: false,
          },
          new: {
            isVisible: true,
            component: Components.RolePermissionsForm,
            handler: async (request, response, context) => {
              if (String(request.method || '').toLowerCase() === 'get') {
                return NewAction.handler(request, response, context)
              }
              return response
            },
          },
          edit: {
            isVisible: true,
            component: Components.RolePermissionsForm,
            handler: async (request, response, context) => {
              if (String(request.method || '').toLowerCase() === 'get') {
                const result = await EditAction.handler(request, response, context)
                return enrichRolePermissionsRecord(result, context)
              }
              return response
            },
          },
          delete: {
            isAccessible: ({ currentAdmin, record }) => {
              if (!can(currentAdmin, 'admin_roles.delete')) return false
              const name = String(record?.params?.name ?? record?.title ?? '').trim()
              return !isMainAdminRole(name)
            },
          },
        },
      }),
      resHidden('admin_role_permissions'),
      res('users', {
        navigation: { name: 'Users', icon: 'User' },
        properties: {
          password_hash: { isVisible: false },
          is_blocked: { type: 'boolean' },
          created_at: { isVisible: false },
          updated_at: { isVisible: false },
        },
      }),
      res('casts', {
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
      }),
      res('listing_casts', {
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
      }),
      res('types', {
        navigation: { name: 'Content', icon: 'Catalog' },
        properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
      }),
      res(
        'listings',
        {
          navigation: { name: 'Content', icon: 'Movie' },
          sort: { sortBy: 'created_at', direction: 'desc' },
          listProperties: ['banner_image', 'title', 'slug', 'type_id', 'status', 'publish_at', 'unpublish_at'],
          filterProperties: ['title', 'slug', 'type_id', 'status', 'is_featured', 'publish_at', 'unpublish_at'],
          properties: {
            created_at: { isVisible: false },
            updated_at: { isVisible: false },
            created_by_admin_id: { isVisible: false, reference: 'admins' },
            updated_by_admin_id: { isVisible: false, reference: 'admins' },
            type_id: { reference: 'types' },
            title: {
              isTitle: true,
              components: { edit: Components.ListingTitleLarge },
            },
            status: {
              availableValues: [
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'unpublished', label: 'Unpublished' },
              ],
              components: {
                list: Components.ListingStatusBadge,
                show: Components.ListingStatusBadge,
              },
            },
            is_featured: {
              type: 'boolean',
              isRequired: false,
              props: { label: 'Featured item' },
            },
            organizer_partner_id: {
              type: 'string',
              isVisible: { list: false, filter: false, show: true, edit: true },
              props: { label: 'Organizer (Partner)' },
            },
            publish_at: {
              type: 'datetime',
              components: {
                edit: Components.ListingPublishDate,
                list: Components.ListingScheduleDate,
                show: Components.ListingScheduleDate,
              },
            },
            unpublish_at: {
              type: 'datetime',
              components: {
                edit: Components.ListingUnpublishDate,
                list: Components.ListingScheduleDate,
                show: Components.ListingScheduleDate,
              },
            },
            description_html: { type: 'textarea', props: { rows: 12 } },
            banner_image: {
              isVisible: { list: true, show: true, edit: false, filter: false },
              components: {
                list: Components.ImageThumb,
                show: Components.ImageThumb,
              },
            },
            detail_banner_image: {
              isVisible: { list: false, show: true, edit: false, filter: false },
              components: {
                show: Components.ImageThumb,
              },
            },
          },
          actions: {
            new: {
              component: Components.ListingTabbedForm,
              handler: listingNewHandler,
              before: async (request, context) => {
                prepareListingRequest(request)
                ensureListingTimestamps(request)
                ensureListingAuditAdmins(request, context, { isNew: true })
                return request
              },
              after: async (response, request, context) => {
                // AdminJS runs `after` on GET too — only persist related rows on save.
                if (String(request?.method || '').toLowerCase() !== 'post') {
                  return stripBigIntDeep(response)
                }
                return completeListingAfterSave(response, request, context, { isNew: true })
              },
            },
            edit: {
              component: Components.ListingTabbedForm,
              handler: listingEditHandler,
              before: async (request, context) => {
                prepareListingRequest(request)
                ensureListingTimestamps(request)
                ensureListingAuditAdmins(request, context, { isNew: false })
                return request
              },
              after: async (response, request, context) => {
                if (String(request?.method || '').toLowerCase() !== 'post') {
                  return stripBigIntDeep(response)
                }
                return completeListingAfterSave(response, request, context, { isNew: false })
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
        ['duplicate']
      ),
      res('promotions', {
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
                ensureListingTimestamps(request)
                ensureListingAuditAdmins(request, context, { isNew: true })
                return request
              },
            },
            edit: {
              before: async (request, context) => {
                ensureListingTimestamps(request)
                ensureListingAuditAdmins(request, context, { isNew: false })
                return request
              },
            },
          },
      }),
      res('blogs', {
        navigation: { name: 'Content', icon: 'Article' },
        listProperties: [
          'cover_image',
          'title',
          'slug',
          'author_name',
          'status',
          'is_featured',
        ],
        editProperties: [
          'title',
          'excerpt',
          'body_html',
          'cover_image',
          'author_name',
          'tags',
          'status',
          'is_featured',
        ],
        newProperties: [
          'title',
          'excerpt',
          'body_html',
          'cover_image',
          'author_name',
          'tags',
          'status',
          'is_featured',
        ],
        showProperties: [
          'cover_image',
          'title',
          'slug',
          'excerpt',
          'body_html',
          'author_name',
          'tags',
          'status',
          'is_featured',
        ],
        filterProperties: ['status', 'is_featured', 'author_name'],
        properties: {
          created_at: { isVisible: { list: false, show: false, edit: false, new: false, filter: false } },
          updated_at: { isVisible: { list: false, show: false, edit: false, new: false, filter: false } },
          created_by_admin_id: {
            isVisible: { list: false, show: false, edit: false, new: false, filter: false },
            reference: 'admins',
          },
          updated_by_admin_id: {
            isVisible: { list: false, show: false, edit: false, new: false, filter: false },
            reference: 'admins',
          },
          title: {
            components: {
              edit: Components.BlogTitleWithSlug,
              new: Components.BlogTitleWithSlug,
            },
          },
          slug: {
            isVisible: { list: true, show: true, edit: false, new: false, filter: false },
          },
          excerpt: { type: 'textarea', props: { rows: 3 } },
          body_html: { type: 'richtext' },
          tags: {
            props: { placeholder: 'Design, Research, Interviews' },
            description: 'Comma-separated tags shown on the blog card and detail page.',
          },
          author_name: { props: { defaultValue: 'Admin' } },
          is_featured: { type: 'boolean', props: { defaultValue: true } },
          cover_image: {
            components: {
              list: Components.BlogCoverUpload,
              show: Components.BlogCoverUpload,
              edit: Components.BlogCoverUpload,
            },
          },
        },
        actions: {
          show: {
            isVisible: false,
          },
          new: {
            component: Components.BlogEditForm,
            hideActionHeader: true,
            layout: [],
            handler: async (request, response, context) => NewAction.handler(request, response, context),
            before: async (request, context) => {
              prepareBlogRequest(request)
              ensureListingTimestamps(request)
              ensureBlogSlug(request)
              ensureListingAuditAdmins(request, context, { isNew: true })
              return request
            },
          },
          edit: {
            component: Components.BlogEditForm,
            hideActionHeader: true,
            layout: [],
            handler: async (request, response, context) => EditAction.handler(request, response, context),
            before: async (request, context) => {
              prepareBlogRequest(request)
              ensureListingTimestamps(request)
              ensureListingAuditAdmins(request, context, { isNew: false })
              return request
            },
          },
        },
      }),
      res('cms_pages', {
        navigation: { name: 'Content', icon: 'Document' },
        listProperties: ['banner_image', 'title', 'slug', 'parent_id', 'status', 'updated_at'],
        editProperties: ['title', 'parent_id', 'banner_image', 'body_html', 'status'],
        newProperties: ['title', 'parent_id', 'banner_image', 'body_html', 'status'],
        showProperties: [
          'banner_image',
          'title',
          'slug',
          'parent_id',
          'body_html',
          'status',
          'created_at',
          'updated_at',
        ],
        filterProperties: ['title', 'slug', 'parent_id', 'status'],
        sort: { sortBy: 'updated_at', direction: 'desc' },
        properties: {
          created_at: { isVisible: { list: true, show: true, edit: false, new: false, filter: false } },
          updated_at: { isVisible: { list: true, show: true, edit: false, new: false, filter: false } },
          created_by_admin_id: {
            isVisible: { list: false, show: false, edit: false, new: false, filter: false },
            reference: 'admins',
          },
          updated_by_admin_id: {
            isVisible: { list: false, show: false, edit: false, new: false, filter: false },
            reference: 'admins',
          },
          embed_html: {
            isVisible: { list: false, show: false, edit: false, new: false, filter: false },
          },
          parent_id: {
            reference: 'cms_pages',
            isVisible: { list: true, show: true, edit: false, new: false, filter: true },
          },
          title: {
            isTitle: true,
            components: {
              edit: Components.BlogTitleWithSlug,
              new: Components.BlogTitleWithSlug,
            },
          },
          slug: {
            isVisible: { list: true, show: true, edit: false, new: false, filter: true },
          },
          banner_image: {
            components: {
              list: Components.PageBannerUpload,
              show: Components.PageBannerUpload,
              edit: Components.PageBannerUpload,
            },
          },
          body_html: { type: 'richtext' },
          status: {
            availableValues: [
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'unpublished', label: 'Unpublished' },
            ],
          },
        },
        actions: {
          show: {
            isVisible: false,
          },
          new: {
            component: Components.PageEditForm,
            hideActionHeader: true,
            layout: [],
            handler: async (request, response, context) => NewAction.handler(request, response, context),
            before: async (request, context) => {
              prepareCmsPageRequest(request)
              ensureListingTimestamps(request)
              ensureBlogSlug(request)
              ensureListingAuditAdmins(request, context, { isNew: true })
              return request
            },
          },
          edit: {
            component: Components.PageEditForm,
            hideActionHeader: true,
            layout: [],
            handler: async (request, response, context) => EditAction.handler(request, response, context),
            before: async (request, context) => {
              prepareCmsPageRequest(request)
              ensureListingTimestamps(request)
              ensureListingAuditAdmins(request, context, { isNew: false })
              return request
            },
          },
        },
      }),
      res('listing_gallery_images', {
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
      }),
      res('listing_related', {
        navigation: { name: 'Content', icon: 'Link' },
        properties: { created_at: { isVisible: false } },
      }),
      res('countries', {
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
      }),
      res('states', {
        navigation: { name: 'Locations', icon: 'Map' },
        properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
      }),
      res('cities', {
        navigation: { name: 'Locations', icon: 'Map' },
        properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
      }),
      res('places', {
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
      }),
      res('shows', {
        navigation: null,
        properties: {
          listing_id: { reference: 'listings' },
          place_id: { reference: 'places' },
          created_at: { isVisible: false },
          updated_at: { isVisible: false },
        },
        actions: {
          list: { isVisible: false },
          show: { isVisible: false },
          new: { isVisible: false },
          edit: { isVisible: false },
          delete: { isVisible: false },
        },
      }),
      res('show_times', {
        navigation: null,
        properties: {
          show_id: { reference: 'shows' },
          created_at: { isVisible: false },
        },
        actions: {
          list: { isVisible: false },
          show: { isVisible: false },
          new: { isVisible: false },
          edit: { isVisible: false },
          delete: { isVisible: false },
        },
      }),
      res('comments', {
        navigation: { name: 'Moderation', icon: 'Chat' },
        properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
      }),
      res('ratings', {
        navigation: { name: 'Moderation', icon: 'Star' },
        properties: { created_at: { isVisible: false }, updated_at: { isVisible: false } },
      }),
      res('login_events', {
        navigation: { name: 'Analytics', icon: 'Activity' },
        properties: { created_at: { isVisible: false } },
      }),
      res('page_visits', {
        navigation: { name: 'Analytics', icon: 'Activity' },
        sort: { sortBy: 'visited_at', direction: 'desc' },
        listProperties: ['visited_at', 'path', 'listing_id', 'user_id', 'referrer', 'ip_address'],
        properties: {
          visited_at: {
            isTitle: false,
            props: { disabled: true },
          },
          listing_id: { reference: 'listings' },
          user_id: { reference: 'users' },
          created_at: { isVisible: false },
        },
        actions: {
          dailyChart: analyticsDailyChartAction('page_visits'),
        },
      }),
      res('booking_clicks', {
        navigation: { name: 'Analytics', icon: 'Activity' },
        properties: { created_at: { isVisible: false } },
        actions: {
          dailyChart: analyticsDailyChartAction('booking_clicks'),
        },
      }),
      res('refresh_tokens', {
        navigation: { name: 'Auth', icon: 'Locked' },
        properties: { created_at: { isVisible: false } },
      }),
    ],
  })

  return admin
}

