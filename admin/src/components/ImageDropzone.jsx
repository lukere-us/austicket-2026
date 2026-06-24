import React, { useCallback, useRef, useState } from 'react'
import { Box, Label, Loader, Text } from '@adminjs/design-system'

function formatBytes(bytes) {
  const n = Number(bytes || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function ImageDropzone(props) {
  const {
    label,
    hint,
    previewUrl,
    previewAlt = 'Preview',
    previewAspect = '16 / 9',
    multiple = false,
    disabled = false,
    uploading = false,
    accept = 'image/*',
    onFiles,
    onClear,
    compact = false,
    emptyTitle = 'Drag & drop images here',
    emptySubtitle = 'or click to browse',
  } = props

  const inputRef = useRef(null)
  const dragDepthRef = useRef(0)
  const [dragging, setDragging] = useState(false)

  const isBusy = disabled || uploading

  const openPicker = useCallback(() => {
    if (isBusy) return
    inputRef.current?.click()
  }, [isBusy])

  const emitFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []).filter(Boolean)
      if (!files.length || typeof onFiles !== 'function') return
      onFiles(multiple ? files : files.slice(0, 1))
    },
    [multiple, onFiles],
  )

  const onInputChange = (e) => {
    emitFiles(e?.target?.files)
    try {
      e.target.value = ''
    } catch {
      // ignore
    }
  }

  const onDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isBusy) return
    dragDepthRef.current += 1
    setDragging(true)
  }

  const onDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isBusy) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setDragging(false)
    }
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragging(false)
    if (isBusy) return
    emitFiles(e.dataTransfer?.files)
  }

  const zoneStyle = {
    position: 'relative',
    borderRadius: 12,
    border: `2px dashed ${dragging ? '#4268f6' : '#d4d4d8'}`,
    background: dragging ? 'rgba(66, 104, 246, 0.06)' : '#fafafa',
    transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
    boxShadow: dragging ? '0 0 0 3px rgba(66, 104, 246, 0.12)' : 'none',
    overflow: 'hidden',
    cursor: isBusy ? 'not-allowed' : 'pointer',
    opacity: isBusy ? 0.72 : 1,
    minHeight: compact ? 120 : previewUrl ? 0 : 168,
  }

  return (
    <Box>
      {label ? <Label mb="sm">{label}</Label> : null}
      {hint ? (
        <Text variant="sm" color="grey60" mb="sm">
          {hint}
        </Text>
      ) : null}

      <Box
        role="button"
        tabIndex={isBusy ? -1 : 0}
        aria-disabled={isBusy}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={zoneStyle}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={isBusy}
          onChange={onInputChange}
          style={{ display: 'none' }}
        />

        {previewUrl ? (
          <Box
            style={{ position: 'relative' }}
            onMouseEnter={(e) => {
              const overlay = e.currentTarget.querySelector('[data-dropzone-overlay]')
              if (overlay && !isBusy) overlay.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              const overlay = e.currentTarget.querySelector('[data-dropzone-overlay]')
              if (overlay && !dragging && !uploading) overlay.style.opacity = '0'
            }}
          >
            <Box
              style={{
                width: '100%',
                aspectRatio: previewAspect,
                background: '#f4f4f5',
              }}
            >
              <img
                src={previewUrl}
                alt={previewAlt}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
            <Box
              data-dropzone-overlay
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'rgba(15, 23, 42, 0.45)',
                color: '#fff',
                opacity: dragging || uploading ? 1 : 0,
                transition: 'opacity 0.15s ease',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Replace image'}</span>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Drop a new file or click</span>
            </Box>
            {onClear ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                disabled={isBusy}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 2,
                  border: 0,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isBusy ? 'not-allowed' : 'pointer',
                  background: 'rgba(255,255,255,0.95)',
                  color: '#b42318',
                }}
              >
                Remove
              </button>
            ) : null}
          </Box>
        ) : (
          <Box
            p={compact ? 'lg' : 'xl'}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            style={{ textAlign: 'center', minHeight: compact ? 120 : 168 }}
          >
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: dragging ? 'rgba(66, 104, 246, 0.14)' : '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                marginBottom: 12,
              }}
              aria-hidden
            >
              {uploading ? '…' : '↑'}
            </Box>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{uploading ? 'Uploading…' : emptyTitle}</Text>
            <Text variant="sm" color="grey60" mt="sm">
              {emptySubtitle}
            </Text>
          </Box>
        )}

        {uploading ? (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.72)',
              zIndex: 3,
            }}
          >
            <Loader />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

export { formatBytes }
