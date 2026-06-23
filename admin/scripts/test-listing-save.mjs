import { buildAdminJs } from '../src/adminjs.js'
import { dbPool } from '../src/db.js'

const pool = dbPool()
const [types] = await pool.execute('SELECT id FROM types LIMIT 1')
const typeId = types?.[0]?.id
if (!typeId) {
  console.error('No types in DB')
  process.exit(1)
}

import ViewHelpers from '../node_modules/adminjs/lib/backend/utils/view-helpers/view-helpers.js'

const admin = await buildAdminJs()
const resource = admin.findResource('listings')
const h = new ViewHelpers(admin)

const slug = `test-save-${Date.now()}`
const request = {
  method: 'post',
  payload: {
    type_id: String(typeId),
    title: 'Test Listing Save',
    slug,
    status: 'draft',
    description_html: '<p>test</p>',
    is_featured: '',
    shows_payload: JSON.stringify({ shows: [] }),
    gallery_payload: JSON.stringify({ images: [] }),
    casts_payload: JSON.stringify({ cast_ids: [] }),
  },
}

const context = {
  resource,
  currentAdmin: { id: 1, email: 'test@test.com' },
  h,
  _admin: admin,
}

const decorated = resource.decorate()
const newAction = decorated.actions.new
try {
  const response = await newAction.handler(request, {}, context)
  console.log('handler id:', response?.record?.id)
  if (newAction.after) {
    const final = await newAction.after(response, request, context)
    console.log('after id:', final?.record?.id)
    console.log('recordActions:', final?.record?.recordActions?.length)
    console.log('created_at type:', typeof final?.record?.params?.created_at, final?.record?.params?.created_at)
    console.log('after ok, record id:', final?.record?.id)
    console.log('recordActions count:', final?.record?.recordActions?.length)
    console.log('redirectUrl:', final?.redirectUrl)
    if (final?.record?.id) {
      await pool.execute('DELETE FROM listings WHERE id = ?', [final.record.id])
      console.log('cleaned up test row')
    }
  }
} catch (e) {
  console.error('SAVE FAILED:', e?.message || e)
  console.error(e?.stack)
}

await pool.end()
process.exit(0)
