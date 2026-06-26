import React from 'react'
import { Label } from '@adminjs/design-system'
import {
  listingDatePickerBoundary,
  normalizeListingDatetime,
} from './listingDateUtils.js'
import ModernDatePicker from './ModernDatePicker.jsx'

export default function ListingUnpublishDate(props) {
  const { property, record, onChange } = props
  const path = property?.path || property?.propertyPath || 'unpublish_at'
  const raw = record?.params?.[path]
  const value = normalizeListingDatetime(raw)
  const publish = listingDatePickerBoundary(record?.params?.publish_at)

  return (
    <div style={{ maxWidth: '100%' }}>
      <Label>{property?.label || 'Unpublish at'}</Label>
      <ModernDatePicker
        value={value}
        minDate={publish || undefined}
        placeholder="When to unpublish"
        onChange={(next) => onChange(path, next)}
      />
    </div>
  )
}
