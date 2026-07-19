import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient, isEntireRecordGiven, useNotice } from 'adminjs'
import { Box, H2, Label, Select, Text } from '@adminjs/design-system'
import BlogTitleWithSlug, { slugifyBlogTitle } from './BlogTitleWithSlug.jsx'
import FormSaveChrome from './FormSaveChrome.jsx'
import PageBannerUpload from './PageBannerUpload.jsx'
import RichTextEditor from './RichTextEditor.jsx'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
]

const RESERVED_SLUGS = new Set([
  'blogs',
  'listings',
  'login',
  'register',
  'profile',
  'forgot-password',
  'reset-password',
  'pages',
  'api',
  'admin',
  'favicon.ico',
])

function buildRecordState(initialRecord) {
  if (!initialRecord) return { params: {} }
  if (isEntireRecordGiven(initialRecord)) return initialRecord
  return {
    ...initialRecord,
    params: { ...(initialRecord.params || {}) },
  }
}

function isNewPageRecord(record, action) {
  return action?.name === 'new' || (!record?.id && !record?.params?.id)
}

function pickPageSaveParams(params) {
  const keys = ['title', 'slug', 'banner_image', 'parent_id', 'body_html', 'status']
  const out = {}
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(params || {}, key)) {
      out[key] = params[key]
    }
  }
  if (!out.status) out.status = 'draft'
  if (out.parent_id === '' || out.parent_id === 'null' || out.parent_id == null) {
    out.parent_id = null
  } else {
    out.parent_id = Number(out.parent_id)
  }
  return out
}

export default function PageEditForm(props) {
  const { action, record: initialRecord, resource } = props
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice
  const api = useMemo(() => new ApiClient(), [])
  const [record, setRecord] = useState(() => buildRecordState(initialRecord))
  const [isSaving, setIsSaving] = useState(false)
  const [parentOptions, setParentOptions] = useState([{ value: '', label: '— None (top-level) —' }])
  const slugTouchedRef = useRef(false)

  const isNew = isNewPageRecord(record, action)
  const params = record?.params || {}
  const recordId = record?.id ?? record?.params?.id

  useEffect(() => {
    if (isNew) slugTouchedRef.current = false
  }, [isNew])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.resourceAction({
          resourceId: resource.id,
          actionName: 'list',
          params: { perPage: 200, page: 1 },
        })
        const rows = res?.data?.records || []
        const opts = [{ value: '', label: '— None (top-level) —' }]
        for (const row of rows) {
          const id = row?.id ?? row?.params?.id
          const title = row?.params?.title || `Page #${id}`
          if (id == null || String(id) === String(recordId || '')) continue
          opts.push({ value: String(id), label: String(title) })
        }
        if (!cancelled) setParentOptions(opts)
      } catch {
        if (!cancelled) setParentOptions([{ value: '', label: '— None (top-level) —' }])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, resource.id, recordId])

  const setField = useCallback((key, value) => {
    setRecord((prev) => ({
      ...prev,
      params: {
        ...(prev?.params || {}),
        [key]: value,
      },
    }))
  }, [])

  const patchParams = useCallback(
    (updates) => {
      if (!updates || typeof updates !== 'object') return
      setRecord((prev) => {
        const nextParams = { ...(prev?.params || {}), ...updates }
        const creating = isNewPageRecord(prev, action)
        if (
          creating &&
          !slugTouchedRef.current &&
          Object.prototype.hasOwnProperty.call(updates, 'title') &&
          !Object.prototype.hasOwnProperty.call(updates, 'slug')
        ) {
          nextParams.slug = slugifyBlogTitle(updates.title)
        }
        return { ...prev, params: nextParams }
      })
    },
    [action?.name]
  )

  const titleProperty = useMemo(() => ({ path: 'title', propertyPath: 'title', label: 'Title' }), [])
  const bannerProperty = useMemo(
    () => ({ path: 'banner_image', propertyPath: 'banner_image', label: 'Banner image' }),
    []
  )

  const parentSelectValue = useMemo(() => {
    const raw = params.parent_id
    if (raw === '' || raw == null) return parentOptions[0]
    return parentOptions.find((opt) => String(opt.value) === String(raw)) || parentOptions[0]
  }, [params.parent_id, parentOptions])

  const onSave = async () => {
    setIsSaving(true)
    try {
      const title = String(params.title || '').trim()
      const slug = String(params.slug || '').trim()

      if (!title) {
        sendNoticeRef.current?.({ type: 'error', message: 'Title is required.' })
        return
      }
      if (!slug) {
        sendNoticeRef.current?.({ type: 'error', message: 'Slug is required.' })
        return
      }
      if (RESERVED_SLUGS.has(slug.toLowerCase())) {
        sendNoticeRef.current?.({
          type: 'error',
          message: `Slug "${slug}" is reserved by the website. Choose another.`,
        })
        return
      }
      if (params.parent_id != null && String(params.parent_id) === String(recordId || '')) {
        sendNoticeRef.current?.({ type: 'error', message: 'A page cannot be its own parent.' })
        return
      }

      const payload = pickPageSaveParams(params)

      const applySaveResponse = (res) => {
        const rec = res?.data?.record
        const errObj =
          rec?.errors && typeof rec.errors === 'object' && !Array.isArray(rec.errors) ? rec.errors : null
        const notice = res?.data?.notice
        const hasFieldErrors = errObj && Object.keys(errObj).length > 0

        if (hasFieldErrors || notice?.type === 'error') {
          const firstErr =
            (errObj && Object.values(errObj).find(Boolean)?.message) || notice?.message || 'Save failed.'
          sendNoticeRef.current?.({ type: 'error', message: String(firstErr) })
          return false
        }

        sendNoticeRef.current?.({
          type: 'success',
          message: isNew ? 'Page created.' : 'Page saved.',
        })

        if (rec) {
          setRecord((prev) =>
            buildRecordState({
              ...prev,
              ...rec,
              id: prev?.id ?? rec?.id ?? rec?.params?.id,
              params: {
                ...(prev?.params || {}),
                ...(rec?.params && typeof rec.params === 'object' ? rec.params : {}),
              },
              errors: {},
            })
          )
        }

        if (isNew && rec?.id) {
          window.location.assign(`${resource.href}/records/${rec.id}/edit`)
        }
        return true
      }

      if (isNew) {
        const res = await api.resourceAction({
          resourceId: resource.id,
          actionName: 'new',
          data: payload,
        })
        applySaveResponse(res)
      } else {
        const res = await api.recordAction({
          resourceId: resource.id,
          recordId: String(record.id),
          actionName: 'edit',
          data: payload,
        })
        applySaveResponse(res)
      }
    } catch (e) {
      const data = e?.response?.data
      const apiMsg =
        (typeof data === 'string' && data.trim()) ||
        data?.message ||
        data?.notice?.message ||
        e?.message ||
        String(e)
      sendNoticeRef.current?.({ type: 'error', message: apiMsg })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box variant="white" p="xxl" data-page-edit-form="1">
      <H2 mb="xl">{isNew ? 'Create page' : 'Edit page'}</H2>

      <FormSaveChrome onSave={onSave} saving={isSaving} saveLabel="Save" savingLabel="Saving…">
        <Box display="grid" style={{ gap: 24, maxWidth: 920 }}>
          <BlogTitleWithSlug
            property={titleProperty}
            record={record}
            action={action}
            isNew={isNew}
            slugTouchedRef={slugTouchedRef}
            onChange={patchParams}
          />
          <Text variant="sm" color="grey60" style={{ marginTop: -8 }}>
            Public URL: /{String(params.slug || 'your-slug').replace(/^\/+/, '')}
          </Text>

          <Box>
            <Label>Parent page</Label>
            <Select
              value={parentSelectValue}
              options={parentOptions}
              onChange={(selected) => setField('parent_id', selected?.value || null)}
            />
            <Text variant="sm" color="grey60" mt="sm">
              Optional. Used for breadcrumbs (Home → Parent → This page).
            </Text>
          </Box>

          <PageBannerUpload
            property={bannerProperty}
            record={record}
            onChange={(path, value) => setField(path, value)}
            where="edit"
          />

          <Box>
            <Label>Page detail</Label>
            <Box mt="sm">
              <RichTextEditor
                value={params.body_html || ''}
                onChange={(value) => setField('body_html', value)}
                minHeight={360}
                modeToggle
              />
            </Box>
            <Text variant="sm" color="grey60" mt="sm">
              Use Visual for the WYSIWYG editor, or HTML to edit the markup directly.
            </Text>
          </Box>

          <Box>
            <Label required>Status</Label>
            <Select
              value={STATUS_OPTIONS.find((opt) => opt.value === params.status) || STATUS_OPTIONS[0]}
              options={STATUS_OPTIONS}
              onChange={(selected) => setField('status', selected?.value || 'draft')}
            />
            <Text variant="sm" color="grey60" mt="sm">
              Published pages appear on the site at /your-slug. Draft and unpublished stay hidden.
            </Text>
          </Box>
        </Box>
      </FormSaveChrome>
    </Box>
  )
}
