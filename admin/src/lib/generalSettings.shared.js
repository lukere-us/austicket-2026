export const GENERAL_SETTING_KEY = 'site_general'

const DEFAULTS = {
  analyticsEnabled: true,
  googleAnalyticsId: '',
  googleTagManagerId: '',
  facebookPixelId: '',
  customHeadHtml: '',
  customBodyEndHtml: '',
  trybookingRegion: 'au',
  trybookingApiKey: '',
  trybookingSecretKey: '',
}

export const TRYBOOKING_REGIONS = [
  { value: 'au', label: 'Australia (au)' },
  { value: 'nz', label: 'New Zealand (nz)' },
  { value: 'uk', label: 'United Kingdom (uk)' },
  { value: 'us', label: 'United States (us)' },
]

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
  {
    id: 'trybooking',
    label: 'TryBooking API',
    fields: [
      {
        key: 'trybookingRegion',
        label: 'Account region',
        type: 'select',
        options: TRYBOOKING_REGIONS,
        help: 'Region of your TryBooking account. Used in the API URL (https://api.trybooking.com/{region}/reporting/v1).',
      },
      {
        key: 'trybookingApiKey',
        label: 'API Key',
        type: 'text',
        help: 'Generated in the TryBooking Portal under Integration Tools > API Management.',
      },
      {
        key: 'trybookingSecretKey',
        label: 'Secret Key',
        type: 'password',
        help: 'Secret Key paired with the API Key. Stored server-side only and never sent to the public site.',
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

function normalizeTrybookingRegion(raw) {
  const value = String(raw ?? '').trim().toLowerCase()
  return TRYBOOKING_REGIONS.some((r) => r.value === value) ? value : DEFAULTS.trybookingRegion
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
    trybookingRegion: normalizeTrybookingRegion(src.trybookingRegion),
    trybookingApiKey: normalizeTrackingId(src.trybookingApiKey),
    trybookingSecretKey: normalizeTrackingId(src.trybookingSecretKey),
  }
}

export function generalSettingFields() {
  return FIELD_GROUPS
}
