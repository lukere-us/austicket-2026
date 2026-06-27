import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { PartnerLogoUpload } from './PartnerLogoUpload.jsx'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readPartnersFormValues } from '../lib/readSettingsForm.js'
import {
  defaultPartnersSettings,
  partnersSettingFields,
  mergePartnersSettings,
} from '../lib/partnersSettings.shared.js'

const rowInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d4d4d8',
  fontSize: 14,
}

function newLogoId() {
  return `partner-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function PartnerLogoRowsEditor({ rows, onChange }) {
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
    onChange([
      ...rows,
      { id: newLogoId(), name: '', imageUrl: '', linkUrl: '', enabled: true },
    ])
  }

  return (
    <Box mb="xxl">
      <H4 mb="md">Partner logos</H4>
      <Text variant="sm" color="grey60" mb="md">
        Upload SVG, PNG, or JPEG logos. They appear in an infinite scroll on the homepage between listings
        and the blog section. Max display height is controlled by the slider setting below.
      </Text>
      {rows.map((row, index) => (
        <Box
          key={row.id || `partner-row-${index}`}
          mb="md"
          p="md"
          borderRadius="lg"
          style={{ border: '1px solid #e4e4e7', background: '#fafafa' }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb="md" flexWrap="wrap" gap="sm">
            <Text variant="sm" fontWeight="bold">
              Logo {index + 1}
            </Text>
            <Box display="flex" gap="sm" alignItems="center">
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

          <PartnerLogoUpload
            value={row.imageUrl}
            onChange={(imageUrl) => updateRow(index, { imageUrl })}
          />

          <Box display="grid" style={{ gridTemplateColumns: '1fr 1fr auto', gap: 12 }} alignItems="end" mt="md">
            <Box>
              <Text variant="sm" mb="sm">
                Name (optional)
              </Text>
              <input
                style={rowInputStyle}
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="Partner name"
              />
            </Box>
            <Box>
              <Text variant="sm" mb="sm">
                Link URL (optional)
              </Text>
              <input
                style={rowInputStyle}
                value={row.linkUrl}
                onChange={(e) => updateRow(index, { linkUrl: e.target.value })}
                placeholder="https://..."
              />
            </Box>
            <Box pb="xs">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={Boolean(row.enabled)}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                />
                Show
              </label>
            </Box>
          </Box>
        </Box>
      ))}
      <Button type="button" variant="text" onClick={addRow}>
        Add partner logo
      </Button>
    </Box>
  )
}

export default function PartnersSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultPartnersSettings())
  const [fields] = useState(() => partnersSettingFields())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next) => {
    const merged = mergePartnersSettings(next)
    setSettings(merged)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/partners', {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)
        const data = await res.json()
        if (!alive) return
        if (data?.settings) applySettings(data.settings)
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
      const scalar = readPartnersFormValues(formRef.current, fields)
      const payload = mergePartnersSettings({
        ...scalar,
        logos: settings.logos,
      })

      const res = await fetch('/admin/api/settings/partners', {
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
      else sendNotice({ type: 'success', message: 'Partners settings saved.' })
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
      <H2>Partners slider</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="xl">
        Manage the &quot;Our partners&quot; logo carousel on the homepage. Upload partner logos and adjust
        scroll speed, spacing, and display options.
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

        <PartnerLogoRowsEditor
          rows={settings.logos?.length ? settings.logos : []}
          onChange={(logos) => setSettings((prev) => ({ ...prev, logos }))}
        />

        <FormSaveChrome saving={saving} onSave={onSave} />
      </form>
    </Box>
  )
}
