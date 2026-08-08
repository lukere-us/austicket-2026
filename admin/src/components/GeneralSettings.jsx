import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readGeneralFormValues } from '../lib/readSettingsForm.js'
import {
  defaultGeneralSettings,
  generalSettingFields,
  mergeGeneralSettings,
} from '../lib/generalSettings.shared.js'

export default function GeneralSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultGeneralSettings())
  const [fields] = useState(() => generalSettingFields())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next) => {
    const merged = mergeGeneralSettings(next)
    setSettings(merged)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/general', {
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
      const payload = readGeneralFormValues(formRef.current, fields)
      const res = await fetch('/admin/api/settings/general', {
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
      if (!res.ok) throw new Error(`Failed to save (${res.status})`)
      const data = await res.json()
      if (data?.settings) applySettings(data.settings)
      sendNotice({
        type: 'success',
        message: data?.notice?.message || 'General settings saved.',
      })
    } catch (e) {
      sendNotice({ type: 'error', message: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  const onReset = () => {
    applySettings(defaultGeneralSettings())
  }

  return (
    <Box variant="grey" p="xxl">
      <H2>General</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="xl">
        Site-wide analytics and tracking. Paste Google Analytics, Tag Manager, Meta Pixel IDs, or custom embed
        snippets. Scripts appear on every public page when enabled.
      </Text>

      {loading ? (
        <Loader />
      ) : (
        <form
          key={formKey}
          id="general-settings-form"
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault()
            void onSave()
          }}
        >
          <FormSaveChrome
            formId="general-settings-form"
            saving={saving}
            saveLabel="Save settings"
            savingLabel="Saving…"
            extraActions={
              <Button type="button" variant="text" onClick={onReset} disabled={saving}>
                Reset to defaults
              </Button>
            }
          >
            <Box
              display="grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24,
              }}
            >
              {fields.map((group) => (
                <Box
                  key={group.id}
                  p="xl"
                  borderRadius="lg"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <H4 mb="lg">{group.label}</H4>
                  {group.fields.map((field) => (
                    <SettingsFieldRow
                      key={field.key}
                      field={field}
                      value={settings[field.key]}
                      onChange={onChange}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          </FormSaveChrome>
        </form>
      )}
    </Box>
  )
}
