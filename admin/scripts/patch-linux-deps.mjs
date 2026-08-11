#!/usr/bin/env node
/**
 * Patches AdminJS-related packages for Node ESM interop on Linux VPS.
 * Run after every `npm ci` on the server: node scripts/patch-linux-deps.mjs
 *
 * Fixes:
 * 1) @adminjs/express imports AdminJS Router via a relative file path
 *    (avoids ERR_PACKAGE_PATH_NOT_EXPORTED).
 * 2) Also adds the subpath to adminjs/package.json exports (belt-and-suspenders).
 * 3) Replaces Node-22-breaking `assert { type: 'json' }` with `with { type: 'json' }`.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.join(__dirname, '..')

const routerSubpath = './lib/backend/utils/router/router.js'
// Relative from @adminjs/express/lib/*.js → adminjs/lib/... (bypasses package exports)
const routerRelativeImport =
  'import { Router as AdminRouter } from "../../../adminjs/lib/backend/utils/router/router.js";'

const expressFiles = [
  'node_modules/@adminjs/express/lib/buildRouter.js',
  'node_modules/@adminjs/express/lib/buildAuthenticatedRouter.js',
]

const routerImportPatterns = [
  /import \{ Router as AdminRouter \} from ["']adminjs["'];/g,
  /import \{ Router as AdminRouter \} from ["']adminjs\/lib\/backend\/utils\/router\/router\.js["'];/g,
  /import \{ Router as AdminRouter \} from ["']\.\.\/\.\.\/\.\.\/adminjs\/lib\/backend\/utils\/router\/router\.js["'];/g,
]

for (const rel of expressFiles) {
  const filePath = path.join(adminRoot, rel)
  if (!fs.existsSync(filePath)) {
    console.warn(`skip (missing): ${rel}`)
    continue
  }
  const before = fs.readFileSync(filePath, 'utf8')
  let after = before
  for (const pattern of routerImportPatterns) {
    after = after.replace(pattern, routerRelativeImport)
  }
  // If file already has a different AdminRouter import line, force-replace first matching line
  if (after === before && /AdminRouter/.test(before)) {
    after = before.replace(
      /^import \{ Router as AdminRouter \} from .+;$/m,
      routerRelativeImport,
    )
  }
  if (after !== before) {
    fs.writeFileSync(filePath, after)
    console.log(`patched: ${rel}`)
  } else if (after.includes(routerRelativeImport)) {
    console.log(`already ok: ${rel}`)
  } else {
    console.warn(`could not patch router import: ${rel}`)
  }
}

const adminjsPkgPath = path.join(adminRoot, 'node_modules/adminjs/package.json')
if (fs.existsSync(adminjsPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(adminjsPkgPath, 'utf8'))
  if (!pkg.exports || typeof pkg.exports !== 'object' || Array.isArray(pkg.exports)) {
    console.warn('skip: adminjs package.json has unexpected exports shape')
  } else if (pkg.exports[routerSubpath]) {
    console.log('already ok: adminjs exports router subpath')
  } else {
    pkg.exports[routerSubpath] = routerSubpath
    fs.writeFileSync(adminjsPkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
    console.log('patched: adminjs/package.json exports')
  }
} else {
  console.warn('skip (missing): node_modules/adminjs/package.json')
}

const adminjsLibDir = path.join(adminRoot, 'node_modules/adminjs/lib')
let assertPatched = 0
if (fs.existsSync(adminjsLibDir)) {
  const stack = [adminjsLibDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        stack.push(full)
        continue
      }
      if (!name.endsWith('.js')) continue
      const before = fs.readFileSync(full, 'utf8')
      if (!before.includes('assert { type:')) continue
      const after = before.replace(/assert \{\s*type:\s*['"]json['"]\s*\}/g, "with { type: 'json' }")
      if (after !== before) {
        fs.writeFileSync(full, after)
        assertPatched += 1
        console.log(`patched assert→with: ${path.relative(adminRoot, full)}`)
      }
    }
  }
}
if (assertPatched === 0) {
  console.log('already ok: no adminjs assert JSON imports found')
}

console.log('Linux dependency patch done.')
