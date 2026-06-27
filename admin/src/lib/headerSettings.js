import {
  HEADER_SETTING_KEY,
  defaultHeaderSettings,
  headerSettingFields,
  mergeHeaderSettings,
} from './headerSettings.shared.js'

export {
  HEADER_SETTING_KEY,
  defaultHeaderSettings,
  headerSettingFields,
  mergeHeaderSettings,
} from './headerSettings.shared.js'

export async function loadHeaderSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [HEADER_SETTING_KEY]
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeHeaderSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultHeaderSettings()
}

export async function saveHeaderSettings(pool, input) {
  const merged = mergeHeaderSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [HEADER_SETTING_KEY, JSON.stringify(merged)]
  )
  return merged
}
