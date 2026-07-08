import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '..')

dotenv.config({ path: path.join(adminRoot, '.env') })

if (!process.env.PORT) {
  process.env.PORT = '3003'
}

if (!process.env.DB_USER) {
  process.env.DB_USER = 'root'
}

if (process.env.DB_PASSWORD === undefined) {
  process.env.DB_PASSWORD = ''
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096'
}

const secret = process.env.SESSION_SECRET || ''
if (!secret || secret === 'change-me' || secret === 'change-me-to-a-long-random-secret') {
  // eslint-disable-next-line no-console
  console.warn('[warn] SESSION_SECRET is still the default — set a long random value in admin/.env')
}

const serverPath = path.join(adminRoot, 'src', 'server.js')
const child = spawn(process.execPath, [serverPath], {
  cwd: adminRoot,
  stdio: 'inherit',
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
