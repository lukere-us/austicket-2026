import { mergeHomeHeroSettings } from './homeHeroSettings.shared.js'
import { mergeHomeListingsSettings } from './homeListingsSettings.shared.js'
import { mergeFooterSettings } from './footerSettings.shared.js'
import { mergeHeaderSettings } from './headerSettings.shared.js'
import { mergePartnersSettings } from './partnersSettings.shared.js'

function readFieldValue(field, el) {
  if (!el) return undefined

  if (field.type === 'boolean') {
    return Boolean(el.checked)
  }

  if (field.type === 'select') {
    return el.value
  }

  if (field.type === 'number') {
    const raw = String(el.value ?? '').trim()
    if (raw === '' || raw === '-') return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }

  return String(el.value ?? '')
}

/** Read current values from the settings form DOM (source of truth on save). */
export function readSettingsFormValues(formEl, fieldGroups, mergeFn) {
  if (!formEl) return mergeFn({})

  const raw = {}
  for (const group of fieldGroups) {
    for (const field of group.fields) {
      const el = formEl.elements.namedItem(field.key)
      const value = readFieldValue(field, el)
      if (value !== undefined) {
        raw[field.key] = value
      }
    }
  }

  return mergeFn(raw)
}

export function readHomeHeroFormValues(formEl, fieldGroups) {
  return readSettingsFormValues(formEl, fieldGroups, mergeHomeHeroSettings)
}

export function readHomeListingsFormValues(formEl, fieldGroups) {
  return readSettingsFormValues(formEl, fieldGroups, mergeHomeListingsSettings)
}

export function readFooterFormValues(formEl, fieldGroups) {
  return readSettingsFormValues(formEl, fieldGroups, mergeFooterSettings)
}

export function readHeaderFormValues(formEl, fieldGroups) {
  return readSettingsFormValues(formEl, fieldGroups, mergeHeaderSettings)
}

export function readPartnersFormValues(formEl, fieldGroups) {
  return readSettingsFormValues(formEl, fieldGroups, mergePartnersSettings)
}
