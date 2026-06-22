import {
  HOME_HERO_SETTING_KEY,
  defaultHomeHeroSettings,
  mergeHomeHeroSettings,
} from './homeHeroSettings.shared.js'

export {
  HOME_HERO_SETTING_KEY,
  defaultHomeHeroSettings,
  homeHeroSettingFields,
  mergeHomeHeroSettings,
} from './homeHeroSettings.shared.js'

export async function loadHomeHeroSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [HOME_HERO_SETTING_KEY]
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeHomeHeroSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultHomeHeroSettings()
}

export async function saveHomeHeroSettings(pool, input) {
  const merged = mergeHomeHeroSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [HOME_HERO_SETTING_KEY, JSON.stringify(merged)]
  )
  return merged
}
