import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient } from 'adminjs'
import { Box, Input, Label, Text } from '@adminjs/design-system'

function normalizeNameKey(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export default function PlaceNameWithDuplicateHint(props) {
  const { property, record, onChange } = props
  const apiRef = useRef(null)
  if (!apiRef.current) apiRef.current = new ApiClient()

  const checkSeqRef = useRef(0)

  const nameValue = record?.params?.name ?? ''
  const cityIdRaw = record?.params?.city_id ?? ''
  const cityIdStr = String(cityIdRaw == null ? '' : cityIdRaw).trim()

  const nameKey = useMemo(() => normalizeNameKey(nameValue), [nameValue])
  const currentId = record?.id != null ? String(record.id) : ''

  const [duplicate, setDuplicate] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!nameKey || !cityIdStr) {
      checkSeqRef.current += 1
      setDuplicate(false)
      setChecking(false)
      return
    }

    const requestSeq = ++checkSeqRef.current
    const t = setTimeout(async () => {
      setChecking(true)
      try {
        const trimmed = String(nameValue ?? '')
          .replace(/\s+/g, ' ')
          .trim()
        const res = await apiRef.current.resourceAction({
          resourceId: 'places',
          actionName: 'list',
          params: {
            perPage: 50,
            sortBy: 'name',
            direction: 'asc',
            'filters.name': trimmed,
            'filters.city_id': cityIdStr,
          },
        })
        if (requestSeq !== checkSeqRef.current) return

        const records = Array.isArray(res?.data?.records) ? res.data.records : []
        const found = records.some((r) => {
          const rid = r?.id != null ? String(r.id) : ''
          if (currentId && rid && rid === currentId) return false
          const rcity = String(r?.params?.city_id ?? '').trim()
          const rk = normalizeNameKey(r?.params?.name)
          return rcity === cityIdStr && rk === nameKey
        })
        setDuplicate(Boolean(found))
      } catch {
        if (requestSeq === checkSeqRef.current) setDuplicate(false)
      } finally {
        if (requestSeq === checkSeqRef.current) setChecking(false)
      }
    }, 250)

    return () => {
      clearTimeout(t)
      checkSeqRef.current += 1
    }
  }, [nameKey, cityIdStr, currentId, nameValue])

  const setValue = (next) => {
    if (typeof onChange === 'function' && property?.path) {
      onChange(property.path, next)
    }
  }

  return (
    <Box>
      <Label>{property?.label || 'Name'}</Label>
      <Input value={nameValue == null ? '' : String(nameValue)} onChange={(e) => setValue(e.target.value)} />
      {duplicate ? (
        <Text variant="sm" color="warning" mt="sm">
          A place with this name already exists in the selected city. Please double-check before saving.
        </Text>
      ) : checking && nameKey && cityIdStr ? (
        <Text variant="sm" color="grey60" mt="sm">
          Checking duplicates…
        </Text>
      ) : !cityIdStr && nameKey ? (
        <Text variant="sm" color="grey60" mt="sm">
          Select a city to check for duplicate place names.
        </Text>
      ) : null}
    </Box>
  )
}
