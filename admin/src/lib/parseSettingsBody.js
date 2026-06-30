/**
 * AdminJS router uses express-formidable, which puts JSON POST bodies in req.fields
 * (not req.body). Accept either shape so settings saves persist correctly.
 */
export function parseSettingsBody(req) {
  const body = req.body
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length > 0) {
    return normalizeNestedSettingsFields(body)
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

  if (typeof out.payload === 'string') {
    try {
      const parsed = JSON.parse(out.payload)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeNestedSettingsFields(parsed)
      }
    } catch {
      // fall through
    }
  }

  return normalizeNestedSettingsFields(out)
}

function normalizeNestedSettingsFields(input) {
  const out = { ...input }
  for (const key of ['videos', 'logos', 'navLinks', 'footerLinks', 'cities']) {
    if (typeof out[key] === 'string') {
      try {
        out[key] = JSON.parse(out[key])
      } catch {
        // keep raw string
      }
    }
  }
  return out
}
