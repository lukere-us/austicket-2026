import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, H2, Input, Label, Text } from '@adminjs/design-system'
import FormSaveChrome from './FormSaveChrome.jsx'
import { ADMIN_PERMISSION_GROUPS, ADMIN_PERMISSION_KEYS } from '../lib/adminPermissions.shared.js'

function taskLabel(permission) {
  return permission.label || permission.key
}

function GroupCard({ group, selected, disabled, onToggleKey, onToggleGroup }) {
  const keys = group.permissions.map((p) => p.key)
  const checkedCount = keys.filter((key) => selected.has(key)).length
  const allChecked = keys.length > 0 && checkedCount === keys.length
  const someChecked = checkedCount > 0 && !allChecked
  const groupSelectRef = useRef(null)

  useEffect(() => {
    if (groupSelectRef.current) {
      groupSelectRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  return (
    <Box
      p="lg"
      borderRadius="lg"
      mb="lg"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="sm" mb="md">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input
            ref={groupSelectRef}
            type="checkbox"
            checked={allChecked}
            disabled={disabled}
            onChange={() => onToggleGroup(keys, !allChecked)}
          />
          <Text style={{ fontWeight: 700, fontSize: 15 }}>{group.label}</Text>
        </label>
        <Text variant="sm" color="grey60">
          {checkedCount}/{keys.length}
        </Text>
      </Box>

      <Box
        display="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 10,
        }}
      >
        {group.permissions.map((permission) => (
          <label
            key={permission.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #ececf0',
              background: selected.has(permission.key) ? 'rgba(66, 104, 246, 0.06)' : '#fafafa',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(permission.key)}
              disabled={disabled}
              onChange={() => onToggleKey(permission.key)}
              style={{ marginTop: 2 }}
            />
            <span>
              <Text style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>{taskLabel(permission)}</Text>
              <Text variant="sm" color="grey60">
                {permission.key}
              </Text>
            </span>
          </label>
        ))}
      </Box>
    </Box>
  )
}

function resolveRoleId(record) {
  const raw = record?.params?.id ?? record?.id
  if (raw == null || raw === '') return ''
  return String(raw)
}

function resolveRoleName(record) {
  return String(record?.params?.name ?? record?.title ?? '').trim()
}

function parseAllowedKeys(record) {
  try {
    const raw = record?.params?._roleAllowedKeys
    if (!raw) return []
    const parsed = JSON.parse(String(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function RolePermissionsForm(props) {
  const { record, action } = props
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice

  const isNew = action?.name === 'new'
  const roleId = isNew ? '' : resolveRoleId(record)

  const initialIsMainAdmin = !isNew && String(record?.params?._roleIsMainAdmin ?? '') === '1'

  const [saving, setSaving] = useState(false)
  const [roleName, setRoleName] = useState(() => (isNew ? '' : resolveRoleName(record)))
  const [selected, setSelected] = useState(() => {
    if (isNew) return new Set()
    if (initialIsMainAdmin) return new Set(ADMIN_PERMISSION_KEYS)
    return new Set(parseAllowedKeys(record))
  })
  const [isMainAdmin, setIsMainAdmin] = useState(() => initialIsMainAdmin)
  const hydratedRef = useRef(isNew)

  const allKeys = useMemo(() => ADMIN_PERMISSION_KEYS, [])
  const selectedCount = selected.size

  useEffect(() => {
    if (isNew || hydratedRef.current) return
    const keysPayload = record?.params?._roleAllowedKeys
    if (keysPayload == null) return

    hydratedRef.current = true
    setRoleName(resolveRoleName(record))
    const nextIsMainAdmin = String(record?.params?._roleIsMainAdmin ?? '') === '1'
    setIsMainAdmin(nextIsMainAdmin)
    setSelected(new Set(nextIsMainAdmin ? ADMIN_PERMISSION_KEYS : parseAllowedKeys(record)))
  }, [isNew, record?.params?._roleAllowedKeys, record?.params?._roleIsMainAdmin, record?.params?.name])

  useEffect(() => {
    if (!isMainAdmin) return
    setSelected(new Set(ADMIN_PERMISSION_KEYS))
  }, [isMainAdmin, allKeys])

  const toggleKey = (key) => {
    if (isMainAdmin) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (keys, checked) => {
    if (isMainAdmin) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  const selectAll = () => {
    if (isMainAdmin) return
    setSelected(new Set(allKeys))
  }

  const clearAll = () => {
    if (isMainAdmin) return
    setSelected(new Set())
  }

  const onSave = async () => {
    const name = String(roleName || '').trim()
    if (!name) {
      sendNoticeRef.current({ type: 'error', message: 'Role name is required' })
      return
    }

    setSaving(true)
    try {
      const url = isNew ? '/admin/api/roles' : `/admin/api/roles/${encodeURIComponent(roleId)}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          allowedKeys: Array.from(selected),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`)

      sendNoticeRef.current({
        type: 'success',
        message: isNew ? 'Role created.' : 'Role permissions saved.',
      })
      window.location.assign('/admin/resources/admin_roles')
    } catch (e) {
      sendNoticeRef.current({ type: 'error', message: e?.message || String(e) })
    } finally {
      setSaving(false)
    }
  }

  const formDisabled = isMainAdmin || saving

  return (
    <Box variant="white" p="xxl" data-role-permissions-form="1">
      <H2>{isNew ? 'New role' : 'Edit role permissions'}</H2>
      <Text variant="sm" color="grey60" mt="sm" mb="lg">
        Check the admin tasks this role can perform. Unchecked tasks are hidden and blocked for users with this role.
      </Text>

      <Box mb="xl" style={{ maxWidth: 420 }}>
        <Label>Role name</Label>
        <Input
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          disabled={isMainAdmin || saving}
          placeholder="e.g. content_editor"
        />
        {isMainAdmin ? (
          <Text variant="sm" color="grey60" mt="sm">
            The main admin role always has full access. Permission checkboxes are shown for reference only.
          </Text>
        ) : null}
      </Box>

      <Box display="flex" gap="sm" flexWrap="wrap" mb="lg" alignItems="center">
        <Button type="button" variant="text" onClick={selectAll} disabled={formDisabled}>
          Select all tasks
        </Button>
        <Button type="button" variant="text" onClick={clearAll} disabled={formDisabled}>
          Clear all
        </Button>
        <Text variant="sm" color="grey60">
          {selectedCount}/{allKeys.length} selected
        </Text>
      </Box>

      <FormSaveChrome onSave={onSave} saving={saving} saveLabel={isNew ? 'Create role' : 'Save role'} savingLabel="Saving…">
        {ADMIN_PERMISSION_GROUPS.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            selected={selected}
            disabled={formDisabled}
            onToggleKey={toggleKey}
            onToggleGroup={toggleGroup}
          />
        ))}
      </FormSaveChrome>

      <Box mt="md">
        <Button type="button" variant="text" onClick={() => window.history.back()} disabled={saving}>
          Cancel
        </Button>
      </Box>
    </Box>
  )
}
