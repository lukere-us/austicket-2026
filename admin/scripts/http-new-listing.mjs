/**
 * Login + POST new listing via AdminJS API (reproduces browser save).
 */
import axios from 'axios'

const BASE = 'http://localhost:3001/admin'

const client = axios.create({
  baseURL: BASE,
  withCredentials: true,
  maxRedirects: 0,
  validateStatus: (s) => s < 500 || s === 500,
})

async function main() {
  // Login page to get session cookie
  await client.get('/login')

  const loginRes = await client.post('/login', {
    email: 'admin@austicketlanka.local',
    password: 'Admin@12345',
  })
  console.log('login status', loginRes.status, loginRes.headers.location || '')

  const slug = `test-listing-${Date.now()}`
  const payload = {
    type_id: '1',
    title: 'Test Listing',
    slug,
    status: 'draft',
    is_featured: '',
    shows_payload: JSON.stringify({ shows: [] }),
    gallery_payload: JSON.stringify({ images: [] }),
    casts_payload: JSON.stringify({ cast_ids: [] }),
  }

  const res = await client.post('/api/resources/listings/actions/new', payload, {
    headers: { 'Content-Type': 'application/json' },
  })
  console.log('new listing status', res.status)
  console.log('body', JSON.stringify(res.data, null, 2).slice(0, 3000))
}

main().catch((e) => {
  console.error(e.response?.status, e.response?.data || e.message)
  process.exit(1)
})
