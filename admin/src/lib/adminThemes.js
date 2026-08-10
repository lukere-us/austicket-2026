import { dark as adminDark, light as adminLight } from '@adminjs/themes'

/** Cookie / session theme ids — must match availableThemes[].id */
export const ADMIN_THEME_LIGHT = 'light'
export const ADMIN_THEME_DARK = 'dark'
export const ADMIN_THEME_COOKIE = 'aus_admin_theme'

const LIGHT_COLORS = {
  primary100: '#0F2744',
  primary80: '#163456',
  primary60: '#1E4A6E',
  primary40: '#94A3B8',
  primary20: '#E2E8F0',
  accent: '#D97706',
  love: '#D97706',
  filterBg: '#F1F5F9',
  hoverBg: '#FFFBEB',
  border: '#E2E8F0',
  inputBorder: '#CBD5E1',
  separator: '#E2E8F0',
  highlight: '#FFFBEB',
  filterInputBorder: '#CBD5E1',
  filter: '#64748B',
  bg: '#F5F7FA',
  grey20: '#F8FAFC',
  grey40: '#E2E8F0',
  grey60: '#64748B',
  grey80: '#334155',
  grey100: '#0F172A',
}

const DARK_COLORS = {
  primary100: '#F59E0B',
  primary80: '#D97706',
  primary60: '#B45309',
  primary40: '#78716C',
  primary20: '#292524',
  accent: '#F59E0B',
  love: '#F59E0B',
  // Surfaces — Box variant="white" uses colors.white
  white: '#111827',
  bg: '#0B1220',
  border: '#1E293B',
  text: '#F8FAFC',
  container: '#111827',
  sidebar: '#0A0F1A',
  grey100: '#E2E8F0',
  grey80: '#CBD5E1',
  grey60: '#94A3B8',
  grey40: '#1E293B',
  grey20: '#0F172A',
  filterBg: '#111827',
  hoverBg: '#1E293B',
  inputBorder: 'rgba(148, 163, 184, 0.35)',
  separator: '#1E293B',
  highlight: '#1C1917',
  filterInputBorder: 'rgba(148, 163, 184, 0.35)',
  filter: '#94A3B8',
  errorLight: '#C20012',
  successLight: '#007D7F',
  warningLight: '#A14F17',
  infoLight: '#0E7490',
}

export const adminLightTheme = {
  ...adminLight,
  id: ADMIN_THEME_LIGHT,
  name: 'Light',
  overrides: {
    ...(adminLight.overrides || {}),
    colors: {
      ...((adminLight.overrides && adminLight.overrides.colors) || {}),
      ...LIGHT_COLORS,
    },
  },
}

export const adminDarkTheme = {
  ...adminDark,
  id: ADMIN_THEME_DARK,
  name: 'Dark',
  overrides: {
    ...(adminDark.overrides || {}),
    colors: {
      ...((adminDark.overrides && adminDark.overrides.colors) || {}),
      ...DARK_COLORS,
    },
    borders: {
      default: '1px solid #1E293B',
      input: '1px solid #1E293B',
      ...((adminDark.overrides && adminDark.overrides.borders) || {}),
    },
    shadows: {
      login: '0 15px 24px 0 rgba(0, 0, 0, 0.45)',
      cardHover: '0 4px 12px 0 rgba(0, 0, 0, 0.35)',
      drawer: '-2px 0 8px 0 rgba(0, 0, 0, 0.35)',
      card: '0 1px 6px 0 rgba(0, 0, 0, 0.35)',
      ...((adminDark.overrides && adminDark.overrides.shadows) || {}),
    },
  },
}

export const adminAvailableThemes = [adminLightTheme, adminDarkTheme]

export function normalizeAdminTheme(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
  return value === ADMIN_THEME_DARK ? ADMIN_THEME_DARK : ADMIN_THEME_LIGHT
}

export function readAdminThemeFromCookieHeader(cookieHeader) {
  const raw = String(cookieHeader || '')
  const match = raw.match(/(?:^|;\s*)aus_admin_theme=([^;]*)/)
  if (!match) return null
  try {
    return normalizeAdminTheme(decodeURIComponent(match[1]))
  } catch {
    return normalizeAdminTheme(match[1])
  }
}

export function adminThemeCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  }
}
