import React, { useEffect, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'
import { SettingsFieldRow } from './SettingsFieldRow.jsx'
import { readHomeListingsFormValues } from '../lib/readSettingsForm.js'
import {
  defaultHomeListingsSettings,
  homeListingsSettingFields,
  mergeHomeListingsSettings,
} from '../lib/homeListingsSettings.shared.js'

export default function HomeListingsSettings() {
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const formRef = useRef(null)
  const [settings, setSettings] = useState(() => defaultHomeListingsSettings())
  const [fields] = useState(() => homeListingsSettingFields())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const fetchStartedRef = useRef(false)

  const applySettings = (next) => {
    const merged = mergeHomeListingsSettings(next)
    setSettings(merged)
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true

    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/home-listings', {
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
      const payload = readHomeListingsFormValues(formRef.current, fields)
      const res = await fetch('/admin/api/settings/home-listings', {
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

      const reload = await fetch('/admin/api/settings/home-listings', {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      if (reload.ok) {
        const fresh = await reload.json()
        if (fresh?.settings) applySettings(fresh.settings)
        else if (data?.settings) applySettings(data.settings)
      } else if (data?.settings) {
        applySettings(data.settings)
      }

      const notice = data?.notice
      if (notice) sendNotice(notice)
      else sendNotice({ type: 'success', message: 'Homepage listing settings saved.' })
    } catch (e) {
      sendNotice({ type: 'error', message: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  const onReset = () => {
    applySettings(defaultHomeListingsSettings())
  }

  return (
    <Box variant="grey" p="xxl">
      <H2>Homepage listings</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="xl">
        Controls the event grid below the hero: columns per row, spacing, cards, and section text.
      </Text>

      {loading ? (
        <Loader />
      ) : (
        <form
          key={formKey}
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault()
            void onSave()
          }}
        >
          <Box
            display="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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

          <Box mt="xl" display="flex" gap="md">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
            <Button type="button" variant="text" onClick={onReset} disabled={saving}>
              Reset to defaults
            </Button>
          </Box>
        </form>
      )}
    </Box>
  )
}
