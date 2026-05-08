import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient } from 'adminjs'
import { Box, Input, Label, Text } from '@adminjs/design-system'

function normalizeNameKey(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export default function CastNameWithDuplicateHint(props) {
  const { property, record, onChange } = props
  const apiRef = useRef(null)
  if (!apiRef.current) apiRef.current = new ApiClient()

  const value = record?.params?.[property?.path] ?? ''
  const nameValue = value == null ? '' : String(value)
  const nameKey = useMemo(() => normalizeNameKey(nameValue), [nameValue])
  const currentId = record?.id != null ? String(record.id) : ''

  const [duplicate, setDuplicate] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const key = nameKey
      if (!key) {
        setDuplicate(false)
        return
      }
      setChecking(true)
      try {
        const trimmed = String(nameValue ?? '')
          .replace(/\s+/g, ' ')
          .trim()
        const res = await apiRef.current.resourceAction({
          resourceId: 'casts',
          actionName: 'list',
          params: {
            perPage: 50,
            sortBy: 'name',
            direction: 'asc',
            'filters.name': trimmed,
          },
        })
        const records = Array.isArray(res?.data?.records) ? res.data.records : []
        const found = records.some((r) => {
          const rid = r?.id != null ? String(r.id) : ''
          if (currentId && rid && rid === currentId) return false
          const rk = normalizeNameKey(r?.params?.name)
          return rk && rk === key
        })
        if (!cancelled) setDuplicate(Boolean(found))
      } catch {
        if (!cancelled) setDuplicate(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [nameKey, currentId])

  const setValue = (next) => {
    if (typeof onChange === 'function' && property?.path) {
      onChange(property.path, next)
    }
  }

  return (
    <Box>
      <Label>{property?.label || 'Name'}</Label>
      <Input value={nameValue} onChange={(e) => setValue(e.target.value)} />
      {duplicate ? (
        <Text variant="sm" color="warning" mt="sm">
          This cast name already exists. Please double-check before saving.
        </Text>
      ) : checking && nameKey ? (
        <Text variant="sm" color="grey60" mt="sm">
          Checking duplicates…
        </Text>
      ) : null}
    </Box>
  )
}

