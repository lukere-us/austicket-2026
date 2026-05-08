import React from 'react'
import { DatePicker, Label } from '@adminjs/design-system'

function toDateOnly(d) {
  if (!d) return null
  const s = String(d).trim()
  if (!s) return null
  const date = s.slice(0, 10)
  if (!date) return null
  return new Date(`${date}T00:00:00.000Z`)
}

export default function ListingUnpublishDate(props) {
  const { property, record, onChange } = props
  const value = record?.params?.[property?.path] ?? ''
  const publish = toDateOnly(record?.params?.publish_at)

  return (
    <div style={{ maxWidth: 300 }}>
      <Label>{property?.label || 'Unpublish at'}</Label>
      <DatePicker
        propertyType="date"
        value={value ? `${String(value).slice(0, 10)}T00:00:00.000Z` : ''}
        minDate={publish || undefined}
        onChange={(iso) => {
          const next = iso ? `${String(iso).slice(0, 10)} 00:00:00` : ''
          onChange(property.path, next)
        }}
      />
    </div>
  )
}

