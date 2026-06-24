import React from 'react'
import { Text } from '@adminjs/design-system'
import { formatListingDateDisplay } from './listingDateUtils.js'

export default function ListingScheduleDate(props) {
  const { property, record } = props
  const path = property?.path || property?.propertyPath
  const text = formatListingDateDisplay(path ? record?.params?.[path] : null)

  return (
    <Text variant="sm" style={{ whiteSpace: 'nowrap' }}>
      {text}
    </Text>
  )
}
