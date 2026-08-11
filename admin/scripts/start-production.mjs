#!/usr/bin/env node
/**
 * Production start for Linux VPS:
 * 1) patch AdminJS Linux/Node issues
 * 2) start src/server.js
 *
 * Usage: node scripts/start-production.mjs
 * Or:    npm run start:prod
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '..')

dotenv.config({ path: path.join(adminRoot, '.env') })

if (!process.env.PORT) process.env.PORT = '3001'
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production'
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096'
}

const patch = spawn(process.execPath, [path.join(__dirname, 'patch-linux-deps.mjs')], {
  cwd: adminRoot,
  stdio: 'inherit',
  env: process.env,
})

patch.on('exit', (code) => {
  if (code && code !== 0) {
    console.error('[start-production] patch failed with code', code)
    process.exit(code)
  }

  const server = spawn(process.execPath, [path.join(adminRoot, 'src', 'server.js')], {
    cwd: adminRoot,
    stdio: 'inherit',
    env: process.env,
  })

  server.on('exit', (serverCode, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(serverCode ?? 1)
  })
})
