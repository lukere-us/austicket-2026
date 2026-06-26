import React from 'react'
import { Label } from '@adminjs/design-system'
import {
  listingDatePickerBoundary,
  normalizeListingDatetime,
  listingDatetimeFromPicker,
} from './listingDateUtils.js'
import ModernDatePicker from './ModernDatePicker.jsx'

export default function ListingPublishDate(props) {
  const { property, record, onChange } = props
  const path = property?.path || property?.propertyPath || 'publish_at'
  const raw = record?.params?.[path]
  const value = normalizeListingDatetime(raw)
  const unpublish = listingDatePickerBoundary(record?.params?.unpublish_at)

  return (
    <div style={{ maxWidth: '100%' }}>
      <Label>{property?.label || 'Publish at'}</Label>
      <ModernDatePicker
        value={value}
        maxDate={unpublish || undefined}
        placeholder="When to publish"
        onChange={(next) => onChange(path, next)}
      />
    </div>
  )
}
