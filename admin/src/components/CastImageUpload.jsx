import React, { useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, Input, Label, Loader } from '@adminjs/design-system'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  // storedPath is like Upload/cast/file.jpg or Upload/file.jpg
  const rel = p.startsWith('Upload/') ? p.slice('Upload/'.length) : p
  const fileName = rel.split('/').join('/') // keep subdirs
  return fileName ? `/admin/uploads-root/${encodeURIComponent(fileName).replace(/%2F/g, '/')}` : null
}

export default function CastImageUpload(props) {
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
      form.append('file', f)
      const res = await fetch('/admin/api/uploads/cast-image', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const stored = data?.file?.storedPath
      if (!stored) throw new Error('Upload did not return storedPath')
      setValue(String(stored))
      sendNotice({ type: 'success', message: 'Image uploaded' })
    } catch (err) {
      sendNotice({ type: 'error', message: err?.message || String(err) })
    } finally {
      setIsUploading(false)
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
        <Input value={imagePath} onChange={(e) => setValue(e.target.value)} placeholder="Upload/cast/file.jpg" />
      </Box>
    </Box>
  )
}

