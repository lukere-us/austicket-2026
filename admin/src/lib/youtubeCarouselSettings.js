import {
  YOUTUBE_CAROUSEL_SETTING_KEY,
  defaultYoutubeCarouselSettings,
  mergeYoutubeCarouselSettings,
  youtubeCarouselSettingFields,
} from './youtubeCarouselSettings.shared.js'

export {
  YOUTUBE_CAROUSEL_SETTING_KEY,
  defaultYoutubeCarouselSettings,
  mergeYoutubeCarouselSettings,
  youtubeCarouselSettingFields,
} from './youtubeCarouselSettings.shared.js'

export async function loadYoutubeCarouselSettings(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [YOUTUBE_CAROUSEL_SETTING_KEY],
    )
    const raw = rows?.[0]?.setting_value
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return mergeYoutubeCarouselSettings(parsed)
    }
  } catch {
    // table may not exist yet
  }
  return defaultYoutubeCarouselSettings()
}

export async function saveYoutubeCarouselSettings(pool, input) {
  const merged = mergeYoutubeCarouselSettings(input)
  await pool.execute(
    `
      INSERT INTO site_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [YOUTUBE_CAROUSEL_SETTING_KEY, JSON.stringify(merged)],
  )
  return merged
}
