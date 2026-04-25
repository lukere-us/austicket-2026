import React from 'react'
import { Box, Text } from '@adminjs/design-system'

function toPublicUrl(value) {
  const v = value ? String(value) : ''
  if (!v) return null
  const fileName = v.split('/').pop()
  if (!fileName) return null
  // Served by admin server from repo-root /Upload
  return `/admin/uploads-root/${encodeURIComponent(fileName)}`
}

export default function ImageThumb(props) {
  const { record, property } = props
  const value = record?.params?.[property?.path]
  const url = toPublicUrl(value)

  if (!url) {
    return (
      <Text variant="sm" color="grey60">
        (none)
      </Text>
    )
  }

  return (
    <Box>
      <Box
        as="img"
        src={url}
        alt={property?.label || 'image'}
        style={{
          width: 96,
          height: 64,
          objectFit: 'cover',
          borderRadius: 8,
          display: 'block',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      />
    </Box>
  )
}

