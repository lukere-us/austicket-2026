import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { HeaderLogoUpload } from './HeaderLogoUpload.jsx'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readHeaderFormValues } from '../lib/readSettingsForm.js'
import {
  defaultHeaderSettings,
  headerSettingFields,
  mergeHeaderSettings,
} from '../lib/headerSettings.shared.js'

const rowInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d4d4d8',
  fontSize: 14,
}

function NavLinkRowsEditor({ rows, onChange }) {
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
      <H4 mb="md">Navigation links</H4>
      <Text variant="sm" color="grey60" mb="md">
        Optional links shown in the header (e.g. Blog, About). Use paths like /blogs or full URLs.
      </Text>
      {rows.map((row, index) => (
        <Box
          key={`nav-${index}`}
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
                placeholder="/blogs or https://..."
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
        Add navigation link
      </Button>
    </Box>
  )
}

export default function HeaderSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultHeaderSettings())
  const [fields] = useState(() => headerSettingFields())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next) => {
    const merged = mergeHeaderSettings(next)
    setSettings(merged)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/header', {
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
      const scalar = readHeaderFormValues(formRef.current, fields)
      const payload = mergeHeaderSettings({
        ...scalar,
        navLinks: settings.navLinks,
        logoAuUrl: settings.logoAuUrl,
        logoNzUrl: settings.logoNzUrl,
      })

      const res = await fetch('/admin/api/settings/header', {
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
      else sendNotice({ type: 'success', message: 'Header settings saved.' })
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
      <H2>Header settings</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="xl">
        Customize the site header: brand name, tagline, logo, navigation links, and which controls are
        visible.
      </Text>

      <FormSaveChrome onSave={onSave} saving={saving} saveLabel="Save header" savingLabel="Saving…">
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

              {group.id === 'brand' ? (
                <>
                  <HeaderLogoUpload
                    label="Australia logo (SVG or image)"
                    help="Shown when visitors select Australia. SVG recommended."
                    value={settings.logoAuUrl || ''}
                    onChange={(logoAuUrl) => setSettings((prev) => ({ ...prev, logoAuUrl }))}
                  />
                  <HeaderLogoUpload
                    label="New Zealand logo (SVG or image)"
                    help="Shown when visitors select New Zealand. SVG recommended."
                    value={settings.logoNzUrl || ''}
                    onChange={(logoNzUrl) => setSettings((prev) => ({ ...prev, logoNzUrl }))}
                  />
                </>
              ) : null}

              {group.id === 'auth' ? (
                <NavLinkRowsEditor
                  rows={settings.navLinks || []}
                  onChange={(navLinks) => setSettings((prev) => ({ ...prev, navLinks }))}
                />
              ) : null}
            </Box>
          ))}
        </form>
      </FormSaveChrome>
    </Box>
  )
}
