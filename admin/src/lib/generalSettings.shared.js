export const GENERAL_SETTING_KEY = 'site_general'

const DEFAULTS = {
  analyticsEnabled: true,
  googleAnalyticsId: '',
  googleTagManagerId: '',
  facebookPixelId: '',
  customHeadHtml: '',
  customBodyEndHtml: '',
}

export const FIELD_GROUPS = [
  {
    id: 'analytics',
    label: 'Analytics & tracking',
    fields: [
      {
        key: 'analyticsEnabled',
        label: 'Enable analytics scripts',
        type: 'boolean',
        help: 'Master switch. When off, none of the tracking codes below are output on the public site.',
      },
      {
        key: 'googleAnalyticsId',
        label: 'Google Analytics Measurement ID',
        type: 'text',
        help: 'Example: G-XXXXXXXXXX (GA4). Leave blank if unused.',
      },
      {
        key: 'googleTagManagerId',
        label: 'Google Tag Manager Container ID',
        type: 'text',
        help: 'Example: GTM-XXXXXXX. Leave blank if unused.',
      },
      {
        key: 'facebookPixelId',
        label: 'Facebook / Meta Pixel ID',
        type: 'text',
        help: 'Numeric Pixel ID from Meta Events Manager. Leave blank if unused.',
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom embed code',
    fields: [
      {
        key: 'customHeadHtml',
        label: 'Custom code in <head>',
        type: 'textarea',
        rows: 8,
        help: 'Optional raw HTML/JS for the document head (extra pixels, verification tags, etc.). Only paste trusted code.',
      },
      {
        key: 'customBodyEndHtml',
        label: 'Custom code before </body>',
        type: 'textarea',
        rows: 8,
        help: 'Optional raw HTML/JS inserted at the end of the page body.',
      },
    ],
  },
]

function cloneText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function clampBool(raw, fallback) {
  if (typeof raw === 'boolean') return raw
  if (raw === 1 || raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true
  if (raw === 0 || raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return fallback
}

/** Normalize GA / GTM / Pixel IDs (trim, strip accidental quotes). */
function normalizeTrackingId(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
}

export function defaultGeneralSettings() {
  return { ...DEFAULTS }
}

export function mergeGeneralSettings(input) {
  const src = input && typeof input === 'object' ? input : {}
  return {
    analyticsEnabled: clampBool(src.analyticsEnabled, DEFAULTS.analyticsEnabled),
    googleAnalyticsId: normalizeTrackingId(src.googleAnalyticsId),
    googleTagManagerId: normalizeTrackingId(src.googleTagManagerId),
    facebookPixelId: normalizeTrackingId(src.facebookPixelId),
    customHeadHtml: cloneText(src.customHeadHtml, ''),
    customBodyEndHtml: cloneText(src.customBodyEndHtml, ''),
  }
}

export function generalSettingFields() {
  return FIELD_GROUPS
}
