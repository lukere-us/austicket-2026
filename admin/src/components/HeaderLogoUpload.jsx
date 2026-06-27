import React, { useState } from 'react'
import { useNotice } from 'adminjs'
import { Box, Button, Loader, Text } from '@adminjs/design-system'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  const rel = p.startsWith('Upload/') ? p.slice('Upload/'.length) : p
  return rel ? `/admin/uploads-root/${encodeURIComponent(rel).replace(/%2F/g, '/')}` : null
}

export function HeaderLogoUpload(props) {
  const { label, help, value, onChange } = props
  const sendNotice = useNotice()
  const imagePath = value ? String(value) : ''
  const previewUrl = imagePath ? toPublicUrl(imagePath) : null
  const [isUploading, setIsUploading] = useState(false)

  const onFile = async (e) => {
    const f = e?.target?.files?.[0]
    if (!f) return

    const name = String(f.name || '').toLowerCase()
    const type = String(f.type || '')
    const isSvg = type === 'image/svg+xml' || name.endsWith('.svg')
    if (!isSvg && !type.startsWith('image/')) {
      sendNotice({ type: 'error', message: 'Upload an SVG or image file' })
      return
    }
    if (Number(f.size || 0) > 2 * 1024 * 1024) {
      sendNotice({ type: 'error', message: 'File must be <= 2MB' })
      return
    }

    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await fetch('/admin/api/uploads/header-logo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const stored = data?.file?.storedPath
      if (!stored) throw new Error('Upload did not return storedPath')
      onChange(String(stored))
      sendNotice({ type: 'success', message: `${label} uploaded` })
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
    <Box mb="lg" p="md" borderRadius="lg" style={{ border: '1px solid #e4e4e7', background: '#fafafa' }}>
      <Text variant="sm" fontWeight="bold" mb="sm">
        {label}
      </Text>
      {help ? (
        <Text variant="sm" color="grey60" mb="md">
          {help}
        </Text>
      ) : null}
      <Box display="flex" gap="md" alignItems="center" flexWrap="wrap" mb="md">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{
            width: 72,
            height: 40,
            borderRadius: 8,
            border: '1px solid #e4e4e7',
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <Text variant="sm" color="grey60">
              No logo
            </Text>
          )}
        </Box>
        <Box display="flex" gap="sm" alignItems="center" flexWrap="wrap">
          <input type="file" accept=".svg,image/svg+xml,image/*" onChange={onFile} disabled={isUploading} />
          {isUploading ? <Loader /> : null}
          {previewUrl ? (
            <Button as="a" href={previewUrl} target="_blank" rel="noreferrer" variant="text" size="sm">
              Open
            </Button>
          ) : null}
          {imagePath ? (
            <Button type="button" variant="text" size="sm" onClick={() => onChange('')}>
              Remove
            </Button>
          ) : null}
        </Box>
      </Box>
      <input
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #d4d4d8',
          fontSize: 14,
        }}
        value={imagePath}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Upload/logos/logo-au.svg"
      />
    </Box>
  )
}
