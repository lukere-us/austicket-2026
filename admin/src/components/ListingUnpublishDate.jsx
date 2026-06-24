import React from 'react'
import { DatePicker, Label } from '@adminjs/design-system'
import {
  listingDatePickerBoundary,
  listingDatePickerIso,
  listingDatetimeFromPicker,
  normalizeListingDatetime,
} from './listingDateUtils.js'

export default function ListingUnpublishDate(props) {
  const { property, record, onChange } = props
  const path = property?.path || property?.propertyPath || 'unpublish_at'
  const raw = record?.params?.[path]
  const value = normalizeListingDatetime(raw)
  const publish = listingDatePickerBoundary(record?.params?.publish_at)

  return (
    <div style={{ maxWidth: '100%' }}>
      <Label>{property?.label || 'Unpublish at'}</Label>
      <DatePicker
        propertyType="date"
        value={listingDatePickerIso(value)}
        minDate={publish || undefined}
        onChange={(iso) => {
          onChange(path, listingDatetimeFromPicker(iso))
        }}
      />
    </div>
  )
}
