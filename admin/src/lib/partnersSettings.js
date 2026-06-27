import {
  PARTNERS_SETTING_KEY,
  defaultPartnersSettings,
  mergePartnersSettings,
  partnersSettingFields,
} from './partnersSettings.shared.js'

export {
  PARTNERS_SETTING_KEY,
  defaultPartnersSettings,
  mergePartnersSettings,
  partnersSettingFields,
} from './partnersSettings.shared.js'

export async function loadPartnersSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [PARTNERS_SETTING_KEY]
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergePartnersSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultPartnersSettings()
}

export async function savePartnersSettings(pool, input) {
  const merged = mergePartnersSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [PARTNERS_SETTING_KEY, JSON.stringify(merged)]
  )
  return merged
}
