import React from 'react'
import { Badge } from '@adminjs/design-system'

export default function ListingStatusBadge(props) {
  const { record, property } = props
  const raw = record?.params?.[property?.path]
  const status = raw ? String(raw) : ''

  const { label, variant } = (() => {
    switch (status) {
      case 'published':
        return { label: 'Published', variant: 'success' }
      case 'unpublished':
        return { label: 'Unpublished', variant: 'danger' }
      case 'draft':
        return { label: 'Draft', variant: 'info' }
      default:
        return { label: status || '—', variant: 'secondary' }
    }
  })()

  return (
    <Badge variant={variant} outline={status === 'draft'} size="sm">
      {label}
    </Badge>
  )
}

