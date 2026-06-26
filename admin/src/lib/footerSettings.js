import {
  FOOTER_SETTING_KEY,
  defaultFooterSettings,
  footerSettingFields,
  mergeFooterSettings,
} from './footerSettings.shared.js'

export {
  FOOTER_SETTING_KEY,
  defaultFooterSettings,
  footerSettingFields,
  mergeFooterSettings,
} from './footerSettings.shared.js'

export async function loadFooterSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [FOOTER_SETTING_KEY]
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeFooterSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultFooterSettings()
}

export async function saveFooterSettings(pool, input) {
  const merged = mergeFooterSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [FOOTER_SETTING_KEY, JSON.stringify(merged)]
  )
  return merged
}

export async function loadFooterCityOptions(pool) {
  try {
    const [rows] = await pool.execute(`SELECT id, name FROM cities ORDER BY name ASC LIMIT 300`)
    return (rows || []).map((row) => ({
      id: Number(row.id),
      name: String(row.name),
    }))
  } catch {
    return []
  }
}
