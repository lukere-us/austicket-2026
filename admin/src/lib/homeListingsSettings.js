import {
  HOME_LISTINGS_SETTING_KEY,
  defaultHomeListingsSettings,
  mergeHomeListingsSettings,
} from './homeListingsSettings.shared.js'

export {
  HOME_LISTINGS_SETTING_KEY,
  defaultHomeListingsSettings,
  homeListingsSettingFields,
  mergeHomeListingsSettings,
} from './homeListingsSettings.shared.js'

export async function loadHomeListingsSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [HOME_LISTINGS_SETTING_KEY]
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeHomeListingsSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultHomeListingsSettings()
}

export async function saveHomeListingsSettings(pool, input) {
  const merged = mergeHomeListingsSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [HOME_LISTINGS_SETTING_KEY, JSON.stringify(merged)]
  )
  return merged
}
