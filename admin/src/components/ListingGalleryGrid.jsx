import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient, useNotice, useQueryParams, useRecords } from 'adminjs'
import { Box, Button, H2, Loader, Pagination, Text } from '@adminjs/design-system'
import PhotoSwipeLightbox from 'photoswipe/lightbox'

function toPublicUrl(imagePath) {
  const p = imagePath ? String(imagePath) : ''
  const fileName = p.split('/').pop() || ''
  return fileName ? `/admin/uploads-root/${encodeURIComponent(fileName)}` : null
}

function ensurePhotoSwipeStylesheet() {
  if (typeof document === 'undefined') return
  const id = 'photoswipe-css'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  // Keep it simple: load from CDN
  link.href = 'https://unpkg.com/photoswipe@5/dist/photoswipe.css'
  document.head.appendChild(link)
}

export default function ListingGalleryGrid(props) {
  const { resource } = props
  const sendNotice = useNotice()
  const api = useMemo(() => new ApiClient(), [])

  const { parsedQuery, storeParams } = useQueryParams()
  const { records, loading, fetchData, page, perPage, total } = useRecords(resource.id)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const pswpRef = useRef(null)
  const sizeCacheRef = useRef(new Map()) // url -> { width, height }

  useEffect(() => {
    ensurePhotoSwipeStylesheet()
  }, [])

  useEffect(() => {
    return () => {
      try {
        pswpRef.current?.destroy()
      } catch {
        // ignore
      } finally {
        pswpRef.current = null
      }
    }
  }, [])

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clear = () => setSelectedIds(new Set())

  const onDeleteSelected = async () => {
    if (isDeleting) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const ok = window.confirm(`Delete ${ids.length} image(s)? This cannot be undone.`)
    if (!ok) return

    setIsDeleting(true)
    try {
      const res = await api.bulkAction({
        resourceId: resource.id,
        actionName: 'bulkDelete',
        recordIds: ids,
      })
      if (res?.data?.notice) sendNotice(res.data.notice)
      clear()
      await fetchData()
    } catch (e) {
      sendNotice({ type: 'error', message: e?.message || String(e) })
    } finally {
      setIsDeleting(false)
    }
  }

  const onSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const r of records || []) next.add(String(r.id))
      return next
    })
  }

  const onSelectNoneOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const r of records || []) next.delete(String(r.id))
      return next
    })
  }

  const selectedCount = selectedIds.size

  const openLightbox = (startIndex) => {
    const run = async () => {
      const urls = (records || [])
        .map((r) => {
          const url = toPublicUrl(r?.params?.image_path)
          return url
            ? {
                url,
                alt: r?.params?.image_path ? String(r.params.image_path) : '',
              }
            : null
        })
        .filter(Boolean)

      if (urls.length === 0) return

      const loadSize = async (url) => {
        const cached = sizeCacheRef.current.get(url)
        if (cached) return cached
        const dims = await new Promise((resolve) => {
          const img = new Image()
          const done = (w, h) => resolve({ width: w, height: h })
          img.onload = () => done(Number(img.naturalWidth) || 1200, Number(img.naturalHeight) || 800)
          img.onerror = () => done(1200, 800)
          img.src = url
        })
        sizeCacheRef.current.set(url, dims)
        return dims
      }

      const sized = await Promise.all(
        urls.map(async (it) => {
          const { width, height } = await loadSize(it.url)
          return { src: it.url, width, height, alt: it.alt }
        })
      )

      if (!pswpRef.current) {
        pswpRef.current = new PhotoSwipeLightbox({
          dataSource: sized,
          pswpModule: () => import('photoswipe'),
        })
        pswpRef.current.init()
      } else {
        pswpRef.current.options.dataSource = sized
      }

      const idx = Number(startIndex)
      pswpRef.current.loadAndOpen(Number.isFinite(idx) ? idx : 0)
    }

    void run()
  }

  return (
    <Box variant="white">
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap="md">
        <Box>
          <H2>Gallery images</H2>
          <Text variant="sm" color="grey60">
            Page {page} • Showing {records?.length || 0} / {total} • perPage {perPage}
          </Text>
          {parsedQuery?.filters?.listing_id ? (
            <Text variant="sm" color="grey60">
              Filter: listing_id = {String(parsedQuery.filters.listing_id)}
            </Text>
          ) : null}
        </Box>

        <Box display="flex" gap="sm" flexWrap="wrap" alignItems="center">
          <Button type="button" variant="text" onClick={() => fetchData()} disabled={loading || isDeleting}>
            Refresh
          </Button>
          <Button type="button" variant="text" onClick={onSelectAllOnPage} disabled={loading || isDeleting}>
            Select all on page
          </Button>
          <Button type="button" variant="text" onClick={onSelectNoneOnPage} disabled={loading || isDeleting}>
            Select none on page
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onDeleteSelected}
            disabled={loading || isDeleting || selectedCount === 0}
          >
            {isDeleting ? 'Deleting…' : `Delete selected (${selectedCount})`}
          </Button>
        </Box>
      </Box>

      {(loading || isDeleting) && (records?.length || 0) === 0 ? (
        <Box mt="xl">
          <Loader />
        </Box>
      ) : null}

      <Box
        mt="xl"
        display="grid"
        gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))"
        gridGap="16px"
      >
        {(records || []).map((r) => {
          const id = String(r.id)
          const imagePath = r?.params?.image_path
          const url = toPublicUrl(imagePath)
          const isChecked = selectedIds.has(id)
          const indexInPage = (records || []).findIndex((x) => String(x.id) === id)

          return (
            <Box
              key={id}
              border="1px solid"
              borderColor={isChecked ? 'primary100' : 'grey20'}
              borderRadius="lg"
              overflow="hidden"
              style={{ position: 'relative' }}
            >
              <Box
                as="label"
                p="sm"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(id)}
                  style={{ width: 16, height: 16 }}
                />
              </Box>

              {url ? (
                <Box
                  as="button"
                  type="button"
                  p="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openLightbox(indexInPage >= 0 ? indexInPage : 0)
                  }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.95)',
                    border: 0,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                  }}
                  title="Preview"
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>🔎</span>
                </Box>
              ) : null}

              <Box
                as="button"
                type="button"
                onClick={() => toggle(id)}
                style={{
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Box
                  style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    background: '#f4f4f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={String(imagePath || '')}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  ) : (
                    <Text color="grey60" variant="sm">
                      No image
                    </Text>
                  )}
                </Box>
                <Box p="sm">
                  <Text variant="sm" style={{ wordBreak: 'break-word' }}>
                    {String(imagePath || '')}
                  </Text>
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Box mt="xl" display="flex" justifyContent="center">
        <Pagination
          total={total}
          page={page}
          perPage={perPage || 20}
          onChange={(p) => {
            storeParams({ page: String(p) })
            // `storeParams` updates URL state async; fetch on next tick so it uses the new page.
            setTimeout(() => {
              void fetchData()
            }, 0)
          }}
        />
      </Box>

      {!loading && (records?.length || 0) === 0 ? (
        <Box mt="xl">
          <Text>No images found for the current filters.</Text>
        </Box>
      ) : null}
    </Box>
  )
}

