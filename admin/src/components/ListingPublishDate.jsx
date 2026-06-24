import React from 'react'
import { DatePicker, Label } from '@adminjs/design-system'
import {
  listingDatePickerBoundary,
  listingDatePickerIso,
  listingDatetimeFromPicker,
  normalizeListingDatetime,
} from './listingDateUtils.js'

export default function ListingPublishDate(props) {
  const { property, record, onChange } = props
  const path = property?.path || property?.propertyPath || 'publish_at'
  const raw = record?.params?.[path]
  const value = normalizeListingDatetime(raw)
  const unpublish = listingDatePickerBoundary(record?.params?.unpublish_at)

  return (
    <div style={{ maxWidth: '100%' }}>
      <Label>{property?.label || 'Publish at'}</Label>
      <DatePicker
        propertyType="date"
        value={listingDatePickerIso(value)}
        maxDate={unpublish || undefined}
        onChange={(iso) => {
          onChange(path, listingDatetimeFromPicker(iso))
        }}
      />
    </div>
  )
}
