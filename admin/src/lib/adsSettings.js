import {
  ADS_SETTING_KEY,
  defaultAdsSettings,
  mergeAdsSettings,
  adsSettingFields,
} from './adsSettings.shared.js'

export {
  ADS_SETTING_KEY,
  defaultAdsSettings,
  mergeAdsSettings,
  adsSettingFields,
} from './adsSettings.shared.js'

export async function loadAdsSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [ADS_SETTING_KEY],
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeAdsSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultAdsSettings()
}

export async function saveAdsSettings(pool, input) {
  const merged = mergeAdsSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [ADS_SETTING_KEY, JSON.stringify(merged)],
  )
  return merged
}
