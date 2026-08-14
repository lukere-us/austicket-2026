import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { AdImageUpload } from './AdImageUpload.jsx'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readAdsFormValues } from '../lib/readSettingsForm.js'
import {
  AD_TYPE_OPTIONS,
  adsSettingFields,
  defaultAdsSettings,
  mergeAdsSettings,
} from '../lib/adsSettings.shared.js'

function newAdId() {
  return `ad-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function emptyAd() {
  return {
    id: newAdId(),
    adType: 'image',
    title: '',
    imageUrl: '',
    linkUrl: '',
    youtubeUrl: '',
    embedHtml: '',
    iframeUrl: '',
    enabled: true,
    showOnDetailsPage: false,
  }
}

function AdItemsEditor({ rows, onChange }) {
  const updateRow = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index))
  }

  const moveRow = (index, dir) => {
    const next = [...rows]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    onChange(next)
  }

  const addRow = () => {
    onChange([...rows, emptyAd()])
  }

  return (
    <Box mb="xxl" className="ads-settings__section">
      <H4 mb="md">Ads</H4>
      <Text variant="sm" mb="md" className="ads-settings__help">
        Add any number of ads. Types: Image (optional click link), YouTube video, Embed HTML, or Iframe URL.
        Check <strong>Show in Details page</strong> to place an ad only in the listing detail sidebar; leave it
        unchecked for homepage and blog sidebar.
      </Text>

      {rows.map((row, index) => (
        <Box key={row.id || `ad-row-${index}`} mb="md" p="md" borderRadius="lg" className="ads-settings__card">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb="md" flexWrap="wrap" gap="sm">
            <Text variant="sm" fontWeight="bold" className="ads-settings__card-title">
              Ad {index + 1}
            </Text>
            <Box display="flex" gap="sm" alignItems="center" flexWrap="wrap">
              <label className="ads-settings__check">
                <input
                  type="checkbox"
                  checked={Boolean(row.enabled)}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                />
                Enabled
              </label>
              <label className="ads-settings__check">
                <input
                  type="checkbox"
                  checked={Boolean(row.showOnDetailsPage)}
                  onChange={(e) => updateRow(index, { showOnDetailsPage: e.target.checked })}
                />
                Show in Details page
              </label>
              <Button type="button" size="sm" variant="text" disabled={index === 0} onClick={() => moveRow(index, -1)}>
                Up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="text"
                disabled={index === rows.length - 1}
                onClick={() => moveRow(index, 1)}
              >
                Down
              </Button>
              <Button type="button" size="sm" variant="text" onClick={() => removeRow(index)}>
                Remove
              </Button>
            </Box>
          </Box>

          <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }} mb="md">
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                Ad type
              </Text>
              <select
                className="ads-settings__input ads-settings__select"
                value={row.adType || 'image'}
                onChange={(e) => updateRow(index, { adType: e.target.value })}
              >
                {AD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Box>
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                Title / label (optional)
              </Text>
              <input
                className="ads-settings__input"
                value={row.title || ''}
                onChange={(e) => updateRow(index, { title: e.target.value })}
                placeholder="Alt text or label"
              />
            </Box>
          </Box>

          {row.adType === 'image' ? (
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                Image
              </Text>
              <AdImageUpload value={row.imageUrl || ''} onChange={(imageUrl) => updateRow(index, { imageUrl })} />
              <Box mt="md">
                <Text variant="sm" mb="sm" className="ads-settings__label">
                  Link URL (optional — opens when the image is clicked)
                </Text>
                <input
                  className="ads-settings__input"
                  value={row.linkUrl || ''}
                  onChange={(e) => updateRow(index, { linkUrl: e.target.value })}
                  placeholder="https://… or /path"
                />
              </Box>
            </Box>
          ) : null}

          {row.adType === 'youtube' ? (
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                YouTube URL
              </Text>
              <input
                className="ads-settings__input"
                value={row.youtubeUrl || ''}
                onChange={(e) => updateRow(index, { youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
              />
            </Box>
          ) : null}

          {row.adType === 'html' ? (
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                Embed HTML
              </Text>
              <textarea
                className="ads-settings__input ads-settings__textarea"
                value={row.embedHtml || ''}
                onChange={(e) => updateRow(index, { embedHtml: e.target.value })}
                placeholder="<div>…</div>"
              />
            </Box>
          ) : null}

          {row.adType === 'iframe' ? (
            <Box>
              <Text variant="sm" mb="sm" className="ads-settings__label">
                Iframe URL
              </Text>
              <input
                className="ads-settings__input"
                value={row.iframeUrl || ''}
                onChange={(e) => updateRow(index, { iframeUrl: e.target.value })}
                placeholder="https://…"
              />
            </Box>
          ) : null}
        </Box>
      ))}

      <Button type="button" variant="text" onClick={addRow}>
        Add ad
      </Button>
    </Box>
  )
}

export default function AdsSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultAdsSettings())
  const [fields, setFields] = useState(() => adsSettingFields())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next, nextFields) => {
    const merged = mergeAdsSettings(next)
    setSettings(merged)
    if (Array.isArray(nextFields) && nextFields.length) setFields(nextFields)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true
    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/ads', {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)
        const data = await res.json()
        if (!alive) return
        applySettings(data?.settings || {}, data?.fields)
      } catch (e) {
        if (!alive) return
        sendNoticeRef.current({ type: 'error', message: e?.message || String(e) })
      } finally {
        if (alive) setLoading(false)
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  const onChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const scalar = readAdsFormValues(formRef.current, fields)
      const payload = mergeAdsSettings({
        ...scalar,
        items: settings.items,
      })

      const res = await fetch('/admin/api/settings/ads', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Failed to save settings (${res.status})`)
      const data = await res.json()
      applySettings(data?.settings || payload, data?.fields)

      const notice = data?.notice
      if (notice) sendNotice(notice)
      else sendNotice({ type: 'success', message: 'Ads settings saved.' })
    } catch (e) {
      sendNoticeRef.current({ type: 'error', message: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box variant="white" p="xxl" className="ads-settings">
        <Loader />
      </Box>
    )
  }

  return (
    <Box variant="white" p="xxl" className="ads-settings">
      <H2>Ads</H2>
      <Text variant="sm" mt="sm" mb="xl" className="ads-settings__help">
        Manage homepage, blog, and listing-detail ads. Use <strong>Show in Details page</strong> on each ad to
        place it only in the listing detail sidebar; unchecked ads appear on the homepage and blog sidebars.
      </Text>

      <form ref={formRef} key={formKey} onSubmit={(e) => e.preventDefault()}>
        {fields.map((group) => (
          <Box key={group.id} mb="xxl">
            <H4 mb="md">{group.label}</H4>
            {group.fields.map((field) => (
              <SettingsFieldRow key={field.key} field={field} value={settings[field.key]} onChange={onChange} />
            ))}
          </Box>
        ))}

        <AdItemsEditor
          rows={settings.items?.length ? settings.items : []}
          onChange={(items) => setSettings((prev) => ({ ...prev, items }))}
        />

        <FormSaveChrome saving={saving} onSave={onSave} saveLabel="Save ads" savingLabel="Saving…" />
      </form>
    </Box>
  )
}
