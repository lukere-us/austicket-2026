import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readFooterFormValues } from '../lib/readSettingsForm.js'
import {
  defaultFooterSettings,
  footerSettingFields,
  mergeFooterSettings,
} from '../lib/footerSettings.shared.js'

const rowInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d4d4d8',
  fontSize: 14,
}

function LinkRowsEditor({ title, rows, onChange, addLabel = 'Add link' }) {
  const updateRow = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index) => {
    onChange(rows.filter((_, i) => i !== index))
  }

  const addRow = () => {
    onChange([...rows, { label: '', url: '', enabled: true }])
  }

  return (
    <Box mb="xxl">
      <H4 mb="md">{title}</H4>
      {rows.map((row, index) => (
        <Box
          key={`link-${index}`}
          mb="md"
          p="md"
          borderRadius="lg"
          style={{ border: '1px solid #e4e4e7', background: '#fafafa' }}
        >
          <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr auto', gap: 12 }} alignItems="end">
            <Box>
              <Text variant="sm" mb="sm">
                Label
              </Text>
              <input
                style={rowInputStyle}
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
              />
            </Box>
            <Box>
              <Text variant="sm" mb="sm">
                URL
              </Text>
              <input
                style={rowInputStyle}
                value={row.url}
                onChange={(e) => updateRow(index, { url: e.target.value })}
                placeholder="/about or https://..."
              />
            </Box>
            <Box display="flex" gap="sm" alignItems="center" pb="xs">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={Boolean(row.enabled)}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                />
                Show
              </label>
              <Button type="button" size="sm" variant="text" onClick={() => removeRow(index)}>
                Remove
              </Button>
            </Box>
          </Box>
        </Box>
      ))}
      <Button type="button" variant="text" onClick={addRow}>
        {addLabel}
      </Button>
    </Box>
  )
}

function SocialIconPreview({ platform, iconUrl, label }) {
  const src = iconUrl?.trim()
  if (src) {
    const href = /^https?:\/\//i.test(src) ? src : src
    return (
      <img
        src={href}
        alt=""
        width={20}
        height={20}
        style={{ borderRadius: 4, objectFit: 'contain' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  return (
    <span style={{ fontSize: 11, color: '#71717a', textTransform: 'capitalize' }}>{platform || label}</span>
  )
}

function SocialRowsEditor({ rows, onChange }) {
  const updateRow = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <Box mb="xxl">
      <H4 mb="md">Social media links</H4>
      <Text variant="sm" color="grey60" mb="md">
        Set profile URLs, optional custom icon images, and toggle visibility. Leave icon URL empty to use the
        default platform icon on the site.
      </Text>
      {rows.map((row, index) => (
        <Box key={row.platform} mb="md" p="md" borderRadius="lg" style={{ border: '1px solid #e4e4e7' }}>
          <Box display="grid" style={{ gridTemplateColumns: '120px 1fr 1fr auto', gap: 12 }} alignItems="end">
            <Box>
              <Text variant="sm" mb="sm">
                Platform
              </Text>
              <Box display="flex" alignItems="center" gap="sm" minHeight={40}>
                <SocialIconPreview platform={row.platform} iconUrl={row.iconUrl} label={row.label} />
                <Text variant="sm" style={{ textTransform: 'capitalize' }}>
                  {row.platform}
                </Text>
              </Box>
            </Box>
            <Box>
              <Text variant="sm" mb="sm">
                Label
              </Text>
              <input
                style={rowInputStyle}
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
              />
            </Box>
            <Box>
              <Text variant="sm" mb="sm">
                Profile URL
              </Text>
              <input
                style={rowInputStyle}
                value={row.url}
                onChange={(e) => updateRow(index, { url: e.target.value })}
                placeholder="https://..."
              />
            </Box>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
              <input
                type="checkbox"
                checked={Boolean(row.enabled)}
                onChange={(e) => updateRow(index, { enabled: e.target.checked })}
              />
              Show
            </label>
          </Box>
          <Box mt="md">
            <Text variant="sm" mb="sm">
              Custom icon URL (optional)
            </Text>
            <input
              style={rowInputStyle}
              value={row.iconUrl || ''}
              onChange={(e) => updateRow(index, { iconUrl: e.target.value })}
              placeholder="https://... or Upload/social/facebook.svg"
            />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default function FooterSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultFooterSettings())
  const [fields] = useState(() => footerSettingFields())
  const [cityOptions, setCityOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next) => {
    const merged = mergeFooterSettings(next)
    setSettings(merged)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/footer', {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)
        const data = await res.json()
        if (!alive) return
        if (data?.settings) applySettings(data.settings)
        if (Array.isArray(data?.cities)) setCityOptions(data.cities)
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

  const addCityFromOption = (city) => {
    const url = `/?city=${encodeURIComponent(city.name)}`
    setSettings((prev) => {
      const exists = (prev.cityLinks || []).some((link) => link.label === city.name)
      if (exists) return prev
      return {
        ...prev,
        cityLinks: [...(prev.cityLinks || []), { label: city.name, url, enabled: true }],
      }
    })
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const scalar = readFooterFormValues(formRef.current, fields)
      const payload = mergeFooterSettings({
        ...scalar,
        usefulLinks: settings.usefulLinks,
        socialLinks: settings.socialLinks,
        cityLinks: settings.cityLinks,
      })

      const res = await fetch('/admin/api/settings/footer', {
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
      if (data?.settings) applySettings(data.settings)

      const notice = data?.notice
      if (notice) sendNotice(notice)
      else sendNotice({ type: 'success', message: 'Footer settings saved.' })
    } catch (e) {
      sendNoticeRef.current({ type: 'error', message: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box variant="white" p="xxl">
        <Loader />
      </Box>
    )
  }

  return (
    <Box variant="white" p="xxl">
      <H2>Footer settings</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="xl">
        Edit the full-width site footer shown on every page (4 columns: About, Popular cities, Useful links,
        Contact).
      </Text>

      <FormSaveChrome onSave={onSave} saving={saving} saveLabel="Save footer" savingLabel="Saving…">
        <form ref={formRef} key={formKey}>
          {fields.map((group) => (
            <Box key={group.id} mb="xxl">
              <H4 mb="lg">{group.label}</H4>
              {group.fields.map((field) => (
                <SettingsFieldRow
                  key={field.key}
                  field={field}
                  value={settings[field.key]}
                  onChange={onChange}
                />
              ))}

              {group.id === 'cities' ? (
                <>
                  <LinkRowsEditor
                    title="Custom popular city links"
                    rows={settings.cityLinks || []}
                    onChange={(cityLinks) => setSettings((prev) => ({ ...prev, cityLinks }))}
                    addLabel="Add city link"
                  />
                  {cityOptions.length > 0 ? (
                    <Box mb="lg">
                      <Text variant="sm" color="grey60" mb="sm">
                        Quick add from database cities:
                      </Text>
                      <Box display="flex" flexWrap="wrap" gap="sm">
                        {cityOptions.slice(0, 40).map((city) => (
                          <Button
                            key={city.id}
                            type="button"
                            size="sm"
                            variant="text"
                            onClick={() => addCityFromOption(city)}
                          >
                            + {city.name}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  ) : null}
                </>
              ) : null}

              {group.id === 'links' ? (
                <LinkRowsEditor
                  title="Useful links"
                  rows={settings.usefulLinks || []}
                  onChange={(usefulLinks) => setSettings((prev) => ({ ...prev, usefulLinks }))}
                  addLabel="Add useful link"
                />
              ) : null}

              {group.id === 'contact' ? (
                <SocialRowsEditor
                  rows={settings.socialLinks || []}
                  onChange={(socialLinks) => setSettings((prev) => ({ ...prev, socialLinks }))}
                />
              ) : null}
            </Box>
          ))}
        </form>
      </FormSaveChrome>
    </Box>
  )
}
