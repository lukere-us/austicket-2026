import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ApiClient,
  BasePropertyComponent,
  isEntireRecordGiven,
  updateRecord,
  useNotice,
} from 'adminjs'
import { Box, Button, DatePicker, H2, Input, Label, Select, Text, TextArea } from '@adminjs/design-system'

function buildRecordState(initial) {
  if (!initial) {
    return { params: {}, errors: {}, populated: {} }
  }
  const params =
    initial.params && typeof initial.params === 'object' && !Array.isArray(initial.params) ? { ...initial.params } : {}
  return {
    id: initial.id,
    params,
    errors: initial.errors && typeof initial.errors === 'object' && !Array.isArray(initial.errors) ? { ...initial.errors } : {},
    populated:
      initial.populated && typeof initial.populated === 'object' && !Array.isArray(initial.populated)
        ? { ...initial.populated }
        : {},
  }
}

function normalizeShowPayload(raw) {
  const shows = Array.isArray(raw?.shows) ? raw.shows : []
  return {
    shows: shows.map((s) => ({
      place_id: s?.place_id ?? '',
      start_date: s?.start_date ?? '',
      end_date: s?.end_date ?? '',
      publish_at: s?.publish_at ?? '',
      unpublish_at: s?.unpublish_at ?? '',
      booking_url: s?.booking_url ?? '',
      ticket_cost: s?.ticket_cost ?? '',
      times: Array.isArray(s?.times)
        ? s.times.map((t) => ({ show_time: t?.show_time ?? '', notes: t?.notes ?? '' }))
        : [{ show_time: '', notes: '' }],
    })),
  }
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220)
}

export default function ListingTabbedForm(props) {
  const { action, record: initialRecord, resource } = props
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice
  const api = useMemo(() => new ApiClient(), [])
  const [placeOptions, setPlaceOptions] = useState([])
  const [isPlacesLoading, setIsPlacesLoading] = useState(false)
  const [galleryImages, setGalleryImages] = useState([]) // { image_path, sort_order, publicUrl? }
  const [isUploading, setIsUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [record, setRecord] = useState(() => buildRecordState(initialRecord))
  const [activeTab, setActiveTab] = useState('listing')
  const [showsPayload, setShowsPayload] = useState({ shows: [] })
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = action?.name === 'edit'
  /** Prefer server record id on edit; avoids feedback loops with local `record` updates. */
  const listingId = isEdit ? (initialRecord?.id ?? record?.id) : null

  const handlePropertyChange = useCallback((propertyOrRecord, value, selectedRecord) => {
    if (isEntireRecordGiven(propertyOrRecord, value)) {
      setRecord(buildRecordState(propertyOrRecord))
    } else if (typeof propertyOrRecord === 'string') {
      setRecord((prev) => updateRecord(propertyOrRecord, value, selectedRecord)(prev))
    }
  }, [])

  // Only re-hydrate when the opened record actually changes (not on every parent re-render).
  const recordSyncKey = `${action?.name ?? ''}:${initialRecord?.id != null ? String(initialRecord.id) : 'new'}`
  useEffect(() => {
    setRecord(buildRecordState(initialRecord))
    setSlugTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `initialRecord` is a new object every render; `recordSyncKey` is the stable identity
  }, [recordSyncKey])

  const handleListingFieldChange = useCallback(
    (propertyOrRecord, value, selectedRecord) => {
      if (typeof propertyOrRecord === 'string') {
        if (propertyOrRecord === 'slug') {
          setSlugTouched(true)
        }
        if (propertyOrRecord === 'title' && !slugTouched) {
          const nextSlug = slugify(value)
          setRecord((prev) => updateRecord('slug', nextSlug)(updateRecord('title', value, selectedRecord)(prev)))
          return
        }
      }
      handlePropertyChange(propertyOrRecord, value, selectedRecord)
    },
    [handlePropertyChange, slugTouched]
  )

  const listingProperties = useMemo(() => {
    let all = resource?.editProperties
    if (!Array.isArray(all)) {
      all = all && typeof all === 'object' ? Object.values(all) : []
    }
    // Banner + trailer go to Media tab
    return all.filter(
      (p) =>
        p &&
        p.propertyPath !== 'shows_payload' &&
        p.propertyPath !== 'banner_image' &&
        p.propertyPath !== 'trailer_url' &&
        p.propertyPath !== 'created_at' &&
        p.propertyPath !== 'updated_at' &&
        p.propertyPath !== 'created_by_admin_id' &&
        p.propertyPath !== 'updated_by_admin_id'
    )
  }, [resource])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsPlacesLoading(true)
      try {
        const res = await api.resourceAction({
          resourceId: 'places',
          actionName: 'list',
          params: { perPage: 500, sortBy: 'name', direction: 'asc' },
        })
        const records = Array.isArray(res?.data?.records) ? res.data.records : []
        const opts = records.map((r) => ({
          value: String(r.id),
          label: r?.params?.name ? String(r.params.name) : `Place #${r.id}`,
        }))
        if (!cancelled) setPlaceOptions(opts)
      } catch (e) {
        if (!cancelled) {
          sendNoticeRef.current({
            type: 'error',
            message: `Failed to load places: ${e?.message || e}`,
          })
        }
      } finally {
        if (!cancelled) setIsPlacesLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [api])

  // Load existing gallery images on edit
  useEffect(() => {
    if (!isEdit || listingId == null) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await api.resourceAction({
          resourceId: 'listing_gallery_images',
          actionName: 'list',
          params: { 'filters.listing_id': listingId, perPage: 200, sortBy: 'sort_order', direction: 'asc' },
        })
        const records = Array.isArray(res?.data?.records) ? res.data.records : []
        const imgs = records.map((r, idx) => {
          const p = r?.params?.image_path ? String(r.params.image_path) : ''
          const fileName = p.split('/').pop() || ''
          const publicUrl = fileName ? `/admin/uploads-root/${encodeURIComponent(fileName)}` : undefined
          return { image_path: p, sort_order: Number(r?.params?.sort_order ?? idx) || idx, publicUrl }
        })
        if (!cancelled) setGalleryImages(imgs)
      } catch (e) {
        if (!cancelled) {
          sendNoticeRef.current({ type: 'error', message: `Failed to load gallery: ${e?.message || e}` })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isEdit, listingId, api])

  const uploadImages = async (files) => {
    const list = Array.from(files || [])
    if (list.length === 0) return []
    if (list.length > 10) {
      sendNoticeRef.current({ type: 'error', message: 'Maximum 10 images allowed' })
      return []
    }
    for (const f of list) {
      if (f.size > 4 * 1024 * 1024) {
        sendNoticeRef.current({ type: 'error', message: 'Each file must be <= 4MB' })
        return []
      }
    }

    const form = new FormData()
    list.forEach((f) => form.append('files', f))
    const res = await fetch('/admin/api/uploads/listing-media', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Upload failed')
    return Array.isArray(data?.files) ? data.files : []
  }

  const onAddGalleryFiles = async (e) => {
    try {
      const files = e?.target?.files
      if (!files) return
      const remaining = 10 - (galleryImages?.length || 0)
      if (remaining <= 0) {
        sendNoticeRef.current({ type: 'error', message: 'Maximum 10 images already added' })
        return
      }
      const subset = Array.from(files).slice(0, remaining)
      setIsUploading(true)
      const uploaded = await uploadImages(subset)
      const newOnes = uploaded.map((u, idx) => ({
        image_path: u.storedPath,
        sort_order: (galleryImages?.length || 0) + idx,
        publicUrl: u.publicUrl,
      }))
      setGalleryImages((prev) => [...(prev || []), ...newOnes].slice(0, 10))
    } catch (err) {
      sendNoticeRef.current({ type: 'error', message: err?.message || String(err) })
    } finally {
      setIsUploading(false)
      if (e?.target) e.target.value = ''
    }
  }

  const onUploadBanner = async (e) => {
    try {
      const file = e?.target?.files?.[0]
      if (!file) return
      if (file.size > 4 * 1024 * 1024) {
        sendNoticeRef.current({ type: 'error', message: 'Banner image must be <= 4MB' })
        return
      }
      setBannerUploading(true)
      const uploaded = await uploadImages([file])
      const first = uploaded?.[0]
      if (!first?.storedPath) return
      handlePropertyChange('banner_image', first.storedPath)
    } catch (err) {
      sendNoticeRef.current({ type: 'error', message: err?.message || String(err) })
    } finally {
      setBannerUploading(false)
      if (e?.target) e.target.value = ''
    }
  }

  useEffect(() => {
    if (!isEdit || listingId == null) {
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const showList = await api.resourceAction({
          resourceId: 'shows',
          actionName: 'list',
          params: { 'filters.listing_id': listingId, perPage: 200 },
        })
        const showRecords = Array.isArray(showList?.data?.records) ? showList.data.records : []

        const shows = []
        for (const s of showRecords) {
          if (cancelled) return
          const showId = s?.id
          const timesList = await api.resourceAction({
            resourceId: 'show_times',
            actionName: 'list',
            params: { 'filters.show_id': showId, perPage: 500, sortBy: 'show_time', direction: 'asc' },
          })
          const timeRecords = Array.isArray(timesList?.data?.records) ? timesList.data.records : []
          shows.push({
            place_id: s?.params?.place_id ?? '',
            start_date: s?.params?.start_date ?? '',
            end_date: s?.params?.end_date ?? '',
            publish_at: s?.params?.publish_at ?? '',
            unpublish_at: s?.params?.unpublish_at ?? '',
            booking_url: s?.params?.booking_url ?? '',
            ticket_cost: s?.params?.ticket_cost ?? '',
            times:
              timeRecords.length > 0
                ? timeRecords.map((t) => ({ show_time: t?.params?.show_time ?? '', notes: t?.params?.notes ?? '' }))
                : [{ show_time: '', notes: '' }],
          })
        }

        if (!cancelled) {
          setShowsPayload(normalizeShowPayload({ shows }))
        }
      } catch (e) {
        if (!cancelled) {
          sendNoticeRef.current({
            type: 'error',
            message: `Failed to load shows: ${e?.message || e}`,
          })
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isEdit, listingId, api])

  const addShow = () => {
    setShowsPayload((prev) => ({
      shows: [
        ...(prev?.shows || []),
        {
          place_id: '',
          start_date: '',
          end_date: '',
          publish_at: '',
          unpublish_at: '',
          booking_url: '',
          ticket_cost: '',
          times: [{ show_time: '', notes: '' }],
        },
      ],
    }))
  }

  const removeShow = (idx) => {
    setShowsPayload((prev) => ({ shows: (prev?.shows || []).filter((_, i) => i !== idx) }))
  }

  const updateShow = (idx, key, value) => {
    setShowsPayload((prev) => ({
      shows: (prev?.shows || []).map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }))
  }

  const addTime = (showIdx) => {
    setShowsPayload((prev) => ({
      shows: (prev?.shows || []).map((s, i) =>
        i === showIdx ? { ...s, times: [...(s.times || []), { show_time: '', notes: '' }] } : s
      ),
    }))
  }

  const removeTime = (showIdx, timeIdx) => {
    setShowsPayload((prev) => ({
      shows: (prev?.shows || []).map((s, i) =>
        i === showIdx ? { ...s, times: (s.times || []).filter((_, j) => j !== timeIdx) } : s
      ),
    }))
  }

  const updateTime = (showIdx, timeIdx, key, value) => {
    setShowsPayload((prev) => ({
      shows: (prev?.shows || []).map((s, i) => {
        if (i !== showIdx) return s
        const times = (s.times || []).map((t, j) => (j === timeIdx ? { ...t, [key]: value } : t))
        return { ...s, times }
      }),
    }))
  }

  const onSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...(record?.params || {}),
        shows_payload: JSON.stringify(showsPayload),
        gallery_payload: JSON.stringify({ images: galleryImages.map((g, i) => ({ image_path: g.image_path, sort_order: i })) }),
      }

      if (isEdit) {
        const res = await api.recordAction({
          resourceId: resource.id,
          recordId: listingId,
          actionName: 'edit',
          data: payload,
        })
        if (res?.data?.notice) sendNotice(res.data.notice)
      } else {
        const res = await api.resourceAction({
          resourceId: resource.id,
          actionName: 'new',
          data: payload,
        })
        if (res?.data?.notice) sendNotice(res.data.notice)
      }
    } catch (e) {
      sendNotice({ type: 'error', message: e?.message || String(e) })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box variant="white">
      <H2>{isEdit ? 'Edit Listing' : 'New Listing'}</H2>
      <Box display="flex" gap="sm" borderBottom="1px solid" borderColor="grey40" mb="xl" flexWrap="wrap">
        <Button
          type="button"
          variant={activeTab === 'listing' ? 'contained' : 'text'}
          onClick={() => setActiveTab('listing')}
        >
          Listing
        </Button>
        <Button
          type="button"
          variant={activeTab === 'shows' ? 'contained' : 'text'}
          onClick={() => setActiveTab('shows')}
        >
          Shows &amp; times
        </Button>
        <Button
          type="button"
          variant={activeTab === 'media' ? 'contained' : 'text'}
          onClick={() => setActiveTab('media')}
        >
          Media
        </Button>
      </Box>

      {activeTab === 'listing' ? (
        <Box mt="xl">
          {listingProperties.map((property) => (
            <BasePropertyComponent
              key={property.propertyPath}
              where="edit"
              property={property}
              resource={resource}
              record={record}
              onChange={handleListingFieldChange}
            />
          ))}
        </Box>
      ) : activeTab === 'shows' ? (
        <Box mt="xl">
          <Text variant="sm" mb="lg">
            Shows and show times are saved together with the listing.
          </Text>

          <Button type="button" variant="primary" onClick={addShow}>
            Add show
          </Button>

          {(showsPayload?.shows || []).length === 0 ? (
            <Box mt="xl">
              <Text>No shows added yet.</Text>
            </Box>
          ) : null}

          {(showsPayload?.shows || []).map((s, showIdx) => (
            <Box key={showIdx} mt="xl" p="xl" border="1px solid" borderColor="grey40" borderRadius="lg">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <H2>Show #{showIdx + 1}</H2>
                <Button type="button" variant="danger" size="sm" onClick={() => removeShow(showIdx)}>
                  Remove
                </Button>
              </Box>

              <Box mt="lg">
                <Label>Place</Label>
                <Select
                  isLoading={isPlacesLoading}
                  options={placeOptions}
                  placeholder="Select a place…"
                  value={placeOptions.find((o) => String(o.value) === String(s.place_id)) || null}
                  onChange={(opt) => updateShow(showIdx, 'place_id', opt?.value || '')}
                />
              </Box>

              <Box mt="lg" display="grid" gridTemplateColumns="1fr 1fr" gridGap="16px">
                <Box>
                  <Label>Start date</Label>
                  <DatePicker
                    propertyType="date"
                    value={s.start_date ? `${s.start_date}T00:00:00.000Z` : ''}
                    onChange={(iso) => updateShow(showIdx, 'start_date', iso ? String(iso).slice(0, 10) : '')}
                  />
                </Box>
                <Box>
                  <Label>End date</Label>
                  <DatePicker
                    propertyType="date"
                    value={s.end_date ? `${s.end_date}T00:00:00.000Z` : ''}
                    onChange={(iso) => updateShow(showIdx, 'end_date', iso ? String(iso).slice(0, 10) : '')}
                  />
                </Box>
              </Box>

              <Box mt="lg" display="grid" gridTemplateColumns="1fr 1fr" gridGap="16px">
                <Box>
                  <Label>Publish at</Label>
                  <DatePicker
                    propertyType="datetime"
                    value={s.publish_at ? String(s.publish_at).replace(' ', 'T') + '.000Z' : ''}
                    onChange={(iso) =>
                      updateShow(showIdx, 'publish_at', iso ? String(iso).replace('T', ' ').slice(0, 19) : '')
                    }
                  />
                </Box>
                <Box>
                  <Label>Unpublish at</Label>
                  <DatePicker
                    propertyType="datetime"
                    value={s.unpublish_at ? String(s.unpublish_at).replace(' ', 'T') + '.000Z' : ''}
                    onChange={(iso) =>
                      updateShow(showIdx, 'unpublish_at', iso ? String(iso).replace('T', ' ').slice(0, 19) : '')
                    }
                  />
                </Box>
              </Box>

              <Box mt="lg">
                <Label>Booking URL</Label>
                <Input value={s.booking_url} onChange={(e) => updateShow(showIdx, 'booking_url', e.target.value)} />
              </Box>

              <Box mt="lg">
                <Label>Ticket cost</Label>
                <Input value={s.ticket_cost} onChange={(e) => updateShow(showIdx, 'ticket_cost', e.target.value)} />
              </Box>

              <Box mt="xl">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Text variant="lg">Show times</Text>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addTime(showIdx)}>
                    Add time
                  </Button>
                </Box>

                {(s.times || []).map((t, timeIdx) => (
                  <Box key={timeIdx} mt="lg" p="lg" border="1px solid" borderColor="grey20" borderRadius="default">
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Text>Time #{timeIdx + 1}</Text>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeTime(showIdx, timeIdx)}
                      >
                        Remove
                      </Button>
                    </Box>

                    <Box mt="md">
                      <Label>Show time</Label>
                      <DatePicker
                        propertyType="datetime"
                        value={t.show_time ? String(t.show_time).replace(' ', 'T') + '.000Z' : ''}
                        onChange={(iso) =>
                          updateTime(
                            showIdx,
                            timeIdx,
                            'show_time',
                            iso ? String(iso).replace('T', ' ').slice(0, 19) : ''
                          )
                        }
                      />
                    </Box>

                    <Box mt="md">
                      <Label>Notes</Label>
                      <TextArea
                        value={t.notes}
                        onChange={(e) => updateTime(showIdx, timeIdx, 'notes', e.target.value)}
                        rows={2}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box mt="xl">
          <Text variant="sm" mb="lg">
            Banner image, trailer URL, and gallery images for this listing.
          </Text>

          <Box mt="lg">
            <Label>Banner image</Label>
            <input type="file" accept="image/*" onChange={onUploadBanner} disabled={bannerUploading} />
            <Box mt="sm">
              <Text variant="sm">Saved path: {record?.params?.banner_image || '(none)'}</Text>
            </Box>
            {record?.params?.banner_image ? (
              <Box mt="md">
                <Box
                  as="img"
                  src={`/admin/uploads-root/${encodeURIComponent(String(record.params.banner_image).split('/').pop() || '')}`}
                  alt="Banner"
                  style={{
                    width: '100%',
                    maxWidth: 520,
                    height: 240,
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
              </Box>
            ) : null}
          </Box>

          <Box mt="lg">
            <Label>Trailer URL</Label>
            <Input
              value={record?.params?.trailer_url || ''}
              onChange={(e) => handlePropertyChange('trailer_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </Box>

          <Box mt="xl">
            <Label>Gallery images (max 10, 4MB each)</Label>
            <input type="file" accept="image/*" multiple onChange={onAddGalleryFiles} disabled={isUploading} />
            <Box mt="sm">
              <Text variant="sm">
                {galleryImages.length}/10 images {isUploading ? '(uploading...)' : ''}
              </Text>
            </Box>

            {galleryImages.length ? (
              <Box mt="lg" display="grid" gridTemplateColumns="1fr" gridGap="8px">
                {galleryImages.map((g, idx) => (
                  <Box
                    key={`${g.image_path}-${idx}`}
                    p="md"
                    border="1px solid"
                    borderColor="grey20"
                    borderRadius="default"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    style={{ gap: 12 }}
                  >
                    <Box display="flex" alignItems="center" style={{ gap: 12 }}>
                      <Box
                        as="img"
                        src={
                          g.publicUrl ||
                          `/admin/uploads-root/${encodeURIComponent(String(g.image_path).split('/').pop() || '')}`
                        }
                        alt={`Gallery ${idx + 1}`}
                        style={{
                          width: 88,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.08)',
                        }}
                      />
                      <Text variant="sm">{g.image_path}</Text>
                    </Box>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        </Box>
      )}

      <Box mt="xxl">
        <Button type="button" variant="primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Box>
  )
}

