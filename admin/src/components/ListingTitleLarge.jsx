import React from 'react'
import { Label, Input, Box, Text } from '@adminjs/design-system'

export default function ListingTitleLarge(props) {
  const { property, record, onChange } = props
  const value = record?.params?.[property?.path] ?? ''

  return (
    <Box>
      <Label>{property?.label || 'Title'}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(property.path, e.target.value)}
        style={{
          width: '100%',
          fontSize: 20,
          padding: '12px 12px',
          lineHeight: '28px',
          borderRadius: 10,
        }}
      />
      <Text variant="sm" color="grey60" mt="sm">
        Required
      </Text>
    </Box>
  )
}

