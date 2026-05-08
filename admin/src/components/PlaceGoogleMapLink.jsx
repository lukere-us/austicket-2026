import React from 'react'
import { Box, Button, Input, Label, TextArea, Text } from '@adminjs/design-system'

export default function PlaceGoogleMapLink(props) {
  const { property, record, onChange, where } = props
  const value = record?.params?.[property?.path] ?? ''
  const url = value ? String(value) : ''
  const hasUrl = url.trim().length > 0

  // In list view: compact icon + short label
  if (where === 'list') {
    return hasUrl ? (
      <Button as="a" href={url} target="_blank" rel="noreferrer" size="sm" variant="text">
        🗺️ Map
      </Button>
    ) : (
      <Text color="grey60">—</Text>
    )
  }

  const onValueChange = (e) => {
    const next = e?.target?.value ?? ''
    if (typeof onChange === 'function' && property?.path) {
      onChange(property.path, next)
    }
  }

  // show/edit: input (edit) + map button + disabled textarea
  return (
    <Box>
      <Label>{property?.label || 'Google map link'}</Label>

      {where === 'edit' ? (
        <Box mt="sm">
          <Input value={url} placeholder={property?.props?.placeholder} onChange={onValueChange} />
        </Box>
      ) : null}

      {hasUrl ? (
        <Box mt="sm">
          <Box display="flex" gap="sm" alignItems="center" flexWrap="wrap">
            <Button as="a" href={url} target="_blank" rel="noreferrer" size="sm" variant="secondary">
              🗺️ Open map
            </Button>
          </Box>
          <Box mt="sm">
            <TextArea value={url} disabled rows={2} style={{ width: '100%' }} />
          </Box>
        </Box>
      ) : (
        <Box mt="sm">
          <Text color="grey60">{where === 'show' ? 'No map link set.' : ''}</Text>
        </Box>
      )}
    </Box>
  )
}

