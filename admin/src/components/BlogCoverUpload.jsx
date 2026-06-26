import React, { useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Input, Label, Text } from '@adminjs/design-system'
import ImageDropzone from './ImageDropzone.jsx'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  const rel = p.startsWith('Upload/') ? p.slice('Upload/'.length) : p
  if (!rel) return null
  return `/admin/uploads-root/${encodeURIComponent(rel).replace(/%2F/g, '/')}`
}

export default function BlogCoverUpload(props) {
  const { property, record, onChange, where } = props
  const sendNotice = useNotice()
  const value = record?.params?.[property?.path] ?? ''
  const imagePath = value ? String(value) : ''
  const previewUrl = imagePath ? toPublicUrl(imagePath) : null
  const [isUploading, setIsUploading] = useState(false)

  const setValue = (next) => {
    if (typeof onChange === 'function' && property?.path) {
      onChange(property.path, next)
    }
  }

  if (where === 'list' || where === 'show') {
    return previewUrl ? (
      <img
        src={previewUrl}
        alt=""
        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, display: 'block' }}
        loading="lazy"
      />
    ) : (
      <span style={{ color: '#999' }}>—</span>
    )
  }

  const uploadFile = async (file) => {
    if (!String(file.type || '').startsWith('image/')) {
      sendNotice({ type: 'error', message: 'Only image uploads are allowed.' })
      return
    }
    if (Number(file.size || 0) > 4 * 1024 * 1024) {
      sendNotice({ type: 'error', message: 'File must be <= 4MB.' })
      return
    }

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/admin/api/uploads/blog-cover', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`)
      const stored = data?.file?.storedPath
      if (!stored) throw new Error('Upload response missing storedPath')
      setValue(stored)
      sendNotice({ type: 'success', message: 'Cover image uploaded.' })
    } catch (err) {
      sendNotice({ type: 'error', message: err?.message || String(err) })
    } finally {
      setIsUploading(false)
    }
  }

  const onFiles = (files) => {
    const file = files?.[0]
    if (file) void uploadFile(file)
  }

  return (
    <Box>
      <ImageDropzone
        label={property?.label || 'Cover image'}
        hint="JPEG, PNG, or WebP up to 4MB. Drag and drop or click to upload."
        previewUrl={previewUrl}
        previewAlt={property?.label || 'Blog cover'}
        previewAspect="16 / 10"
        uploading={isUploading}
        onFiles={onFiles}
        onClear={imagePath ? () => setValue('') : undefined}
        emptyTitle="Drop cover image here"
        emptySubtitle="or click to choose a file"
      />

      <Box mt="lg">
        <Label htmlFor="blog-cover-path">Stored path (optional override)</Label>
        <Input
          id="blog-cover-path"
          value={imagePath}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Upload/blogs/filename.jpg"
        />
        <Text variant="sm" color="grey60" mt="sm">
          Usually filled automatically after upload. Edit only if you need to point at an existing file.
        </Text>
      </Box>
    </Box>
  )
}
