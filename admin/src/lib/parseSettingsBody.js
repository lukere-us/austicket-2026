/**
 * AdminJS router uses express-formidable, which puts JSON POST bodies in req.fields
 * (not req.body). Accept either shape so settings saves persist correctly.
 */
export function parseSettingsBody(req) {
  const body = req.body
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0) {
    return body
  }

  const fields = req.fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return {}
  }

  const out = {}
  for (const [key, raw] of Object.entries(fields)) {
    const val = Array.isArray(raw) ? raw[0] : raw
    out[key] = val
  }

  return out
}
