import React, { useMemo, useState } from 'react'
import { ApiClient, useNotice } from 'adminjs'
import { Box, Button, Input, Label, Loader, Text } from '@adminjs/design-system'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  const fileName = p.split('/').pop() || ''
  return fileName ? `/admin/uploads-root/${encodeURIComponent(fileName)}` : null
}

export default function GalleryImageUpload(props) {
  const { property, record, onChange } = props
  const sendNotice = useNotice()
  const api = useMemo(() => new ApiClient(), [])

  const value = record?.params?.[property?.path] ?? ''
  const imagePath = value ? String(value) : ''
  const previewUrl = imagePath ? toPublicUrl(imagePath) : null

  const [isUploading, setIsUploading] = useState(false)

  const setValue = (next) => {
    if (typeof onChange === 'function' && property?.path) {
      onChange(property.path, next)
    }
  }

  const onFile = async (e) => {
    const f = e?.target?.files?.[0]
    if (!f) return
    if (!String(f.type || '').startsWith('image/')) {
      sendNotice({ type: 'error', message: 'Only image uploads are allowed' })
      return
    }
    if (Number(f.size || 0) > 4 * 1024 * 1024) {
      sendNotice({ type: 'error', message: 'File must be <= 4MB' })
      return
    }

    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('files', f)
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
      // allow selecting the same file again
      try {
        e.target.value = ''
      } catch {
        // ignore
      }
    }
  }

  return (
    <Box>
      <Label>{property?.label || 'Image'}</Label>

      <Box mt="sm" display="flex" gap="sm" alignItems="center" flexWrap="wrap">
        <Input type="file" accept="image/*" onChange={onFile} disabled={isUploading} />
        {isUploading ? <Loader /> : null}
        {previewUrl ? (
          <Button as="a" href={previewUrl} target="_blank" rel="noreferrer" variant="text" size="sm">
            Preview
          </Button>
        ) : null}
      </Box>

      <Box mt="sm">
        <Text variant="sm" color="grey60">
          Stored path
        </Text>
        <Input value={imagePath} onChange={(e) => setValue(e.target.value)} placeholder="Upload/filename.jpg" />
      </Box>
    </Box>
  )
}

