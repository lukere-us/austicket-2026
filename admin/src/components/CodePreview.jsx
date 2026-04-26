import React from 'react'
import { Box, Text } from '@adminjs/design-system'

function clip(value, max = 140) {
  const v = value == null ? '' : String(value)
  const s = v.replace(/\s+/g, ' ').trim()
  if (!s) return ''
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

export default function CodePreview(props) {
  const { record, property, where } = props
  const value = record?.params?.[property?.path]
  const v = value == null ? '' : String(value)

  if (!v.trim()) {
    return (
      <Text variant="sm" color="grey60">
        (none)
      </Text>
    )
  }

  if (where === 'list') {
    return (
      <Text variant="sm" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
        {clip(v)}
      </Text>
    )
  }

  // show view
  return (
    <Box
      as="pre"
      p="lg"
      borderRadius="lg"
      border="1px solid"
      borderColor="grey20"
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 12,
        margin: 0,
      }}
    >
      {v}
    </Box>
  )
}

