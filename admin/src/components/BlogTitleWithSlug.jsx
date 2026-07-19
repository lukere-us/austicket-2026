import React, { useCallback, useEffect, useRef } from 'react'
import { Box, Input, Label, Text } from '@adminjs/design-system'

export function slugifyBlogTitle(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220)
}

function isNewBlogRecord(record, action, isNewProp) {
  if (isNewProp === true) return true
  if (action?.name === 'new') return true
  const topId = record?.id
  const paramId = record?.params?.id
  return (topId === undefined || topId === null || topId === '') &&
    (paramId === undefined || paramId === null || paramId === '')
}

export default function BlogTitleWithSlug(props) {
  const { property, record, onChange, isNew: isNewProp, action, slugTouchedRef: slugTouchedRefProp } = props
  const localSlugTouchedRef = useRef(false)
  const slugTouchedRef = slugTouchedRefProp || localSlugTouchedRef
  const isNew = isNewBlogRecord(record, action, isNewProp)
  const title = record?.params?.title ?? ''
  const slug = record?.params?.slug ?? ''

  useEffect(() => {
    if (isNew) slugTouchedRef.current = false
  }, [isNew, slugTouchedRef])

  const patch = useCallback(
    (updates) => {
      if (typeof onChange !== 'function' || !updates || typeof updates !== 'object') return
      onChange(updates)
    },
    [onChange]
  )

  const setTitle = useCallback(
    (nextTitle) => {
      if (isNew && !slugTouchedRef.current) {
        patch({ title: nextTitle, slug: slugifyBlogTitle(nextTitle) })
        return
      }
      patch({ title: nextTitle })
    },
    [isNew, patch, slugTouchedRef]
  )

  const setSlug = useCallback(
    (nextSlug) => {
      slugTouchedRef.current = true
      patch({ slug: nextSlug })
    },
    [patch, slugTouchedRef]
  )

  return (
    <Box>
      <Label>{property?.label || 'Title'}</Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} />
      <Text variant="sm" color="grey60" mt="sm">
        Required
      </Text>

      <Box mt="lg">
        <Label>Slug</Label>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          style={{ width: '100%' }}
          placeholder={isNew ? 'Auto-generated from title' : ''}
        />
        <Text variant="sm" color="grey60" mt="sm">
          {isNew ? 'Generated from the title. You can edit it before saving.' : 'URL path segment for this content.'}
        </Text>
      </Box>
    </Box>
  )
}
