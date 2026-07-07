#!/usr/bin/env node
/**
 * Patches AdminJS-related packages for Node ESM interop on Linux VPS.
 * Run after `npm ci` on the server: node scripts/patch-linux-deps.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '..')

const routerImport =
  'import { Router as AdminRouter } from "adminjs/lib/backend/utils/router/router.js";'

const expressFiles = [
  'node_modules/@adminjs/express/lib/buildRouter.js',
  'node_modules/@adminjs/express/lib/buildAuthenticatedRouter.js',
]

for (const rel of expressFiles) {
  const filePath = path.join(adminRoot, rel)
  if (!fs.existsSync(filePath)) {
    console.warn(`skip (missing): ${rel}`)
    continue
  }
  const before = fs.readFileSync(filePath, 'utf8')
  const after = before.replace(
    /import \{ Router as AdminRouter \} from ["']adminjs["'];/g,
    routerImport,
  )
  if (after !== before) {
    fs.writeFileSync(filePath, after)
    console.log(`patched: ${rel}`)
  } else {
    console.log(`already ok: ${rel}`)
  }
}

console.log('Linux dependency patch done.')
