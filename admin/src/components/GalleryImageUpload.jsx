import React, { useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Input, Label, Text } from '@adminjs/design-system'
import ImageDropzone from './ImageDropzone.jsx'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  const fileName = p.split('/').pop() || ''
  return fileName ? `/admin/uploads-root/${encodeURIComponent(fileName)}` : null
}

export default function GalleryImageUpload(props) {
  const { property, record, onChange } = props
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

  const uploadFile = async (file) => {
    if (!String(file.type || '').startsWith('image/')) {
      sendNotice({ type: 'error', message: 'Only image uploads are allowed' })
      return
    }
    if (Number(file.size || 0) > 4 * 1024 * 1024) {
      sendNotice({ type: 'error', message: 'File must be <= 4MB' })
      return
    }

    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('files', file)
      const res = await fetch('/admin/api/uploads/listing-media', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const first = Array.isArray(data?.files) ? data.files[0] : null
      if (!first?.storedPath) throw new Error('Upload did not return storedPath')

      setValue(String(first.storedPath))
      sendNotice({ type: 'success', message: 'Image uploaded' })
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
        label={property?.label || 'Image'}
        hint="JPEG, PNG, or WebP up to 4MB. Drag and drop or click to upload."
        previewUrl={previewUrl}
        previewAlt={property?.label || 'Gallery image'}
        uploading={isUploading}
        onFiles={onFiles}
        onClear={imagePath ? () => setValue('') : undefined}
        emptyTitle="Drop gallery image here"
        emptySubtitle="or click to choose a file"
      />

      <Box mt="lg">
        <Label htmlFor="gallery-image-path">Stored path (optional override)</Label>
        <Input
          id="gallery-image-path"
          value={imagePath}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Upload/filename.jpg"
        />
        <Text variant="sm" color="grey60" mt="sm">
          Usually filled automatically after upload. Edit only if you need to point at an existing file.
        </Text>
      </Box>
    </Box>
  )
}
