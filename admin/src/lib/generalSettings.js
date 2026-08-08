import {
  GENERAL_SETTING_KEY,
  defaultGeneralSettings,
  generalSettingFields,
  mergeGeneralSettings,
} from './generalSettings.shared.js'

export {
  GENERAL_SETTING_KEY,
  defaultGeneralSettings,
  generalSettingFields,
  mergeGeneralSettings,
} from './generalSettings.shared.js'

export async function loadGeneralSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [GENERAL_SETTING_KEY],
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeGeneralSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultGeneralSettings()
}

export async function saveGeneralSettings(pool, input) {
  const merged = mergeGeneralSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [GENERAL_SETTING_KEY, JSON.stringify(merged)],
  )
  return merged
}
