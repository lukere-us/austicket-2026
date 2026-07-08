import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '..')

dotenv.config({ path: path.join(adminRoot, '.env') })

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096'
}

const { buildAdminJs } = await import('../src/adminjs.js')

const adminJs = await buildAdminJs()
await adminJs.initialize()
// eslint-disable-next-line no-console
console.log('Admin bundle built')
