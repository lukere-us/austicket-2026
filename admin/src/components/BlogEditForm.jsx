import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient, isEntireRecordGiven, useNotice } from 'adminjs'
import { Box, CheckBox, H2, Input, Label, Select, Text, TextArea } from '@adminjs/design-system'
import BlogCoverUpload from './BlogCoverUpload.jsx'
import BlogTitleWithSlug, { slugifyBlogTitle } from './BlogTitleWithSlug.jsx'
import FormSaveChrome from './FormSaveChrome.jsx'
import RichTextEditor from './RichTextEditor.jsx'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
]

function buildRecordState(initialRecord, opts = {}) {
  const { applyCreateDefaults = false } = opts
  let base
  if (!initialRecord) {
    base = { params: {} }
  } else if (isEntireRecordGiven(initialRecord)) {
    base = initialRecord
  } else {
    base = {
      ...initialRecord,
      params: { ...(initialRecord.params || {}) },
    }
  }

  const params = { ...(base.params || {}) }
  if (applyCreateDefaults) {
    if (
      params.is_featured === undefined ||
      params.is_featured === null ||
      params.is_featured === ''
    ) {
      params.is_featured = 1
    }
    if (
      params.author_name === undefined ||
      params.author_name === null ||
      String(params.author_name).trim() === ''
    ) {
      params.author_name = 'Admin'
    }
  }

  return { ...base, params }
}

function isNewBlogRecord(record, action) {
  return action?.name === 'new' || (!record?.id && !record?.params?.id)
}

function pickBlogSaveParams(params) {
  const keys = ['title', 'slug', 'excerpt', 'body_html', 'cover_image', 'author_name', 'tags', 'status', 'is_featured']
  const out = {}
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(params || {}, key)) {
      out[key] = params[key]
    }
  }
  if (out.is_featured === true || out.is_featured === 'true' || out.is_featured === '1' || out.is_featured === 1) {
    out.is_featured = 1
  } else {
    out.is_featured = 0
  }
  if (!out.status) {
    out.status = 'draft'
  }
  return out
}

export default function BlogEditForm(props) {
  const { action, record: initialRecord, resource } = props
  const sendNotice = useNotice()
  const sendNoticeRef = useRef(sendNotice)
  sendNoticeRef.current = sendNotice
  const api = useMemo(() => new ApiClient(), [])
  const [record, setRecord] = useState(() =>
    buildRecordState(initialRecord, { applyCreateDefaults: isNewBlogRecord(initialRecord, action) })
  )
  const [isSaving, setIsSaving] = useState(false)
  const slugTouchedRef = useRef(false)

  const isNew = isNewBlogRecord(record, action)
  const params = record?.params || {}

  useEffect(() => {
    if (isNew) slugTouchedRef.current = false
  }, [isNew])

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
        const creating = isNewBlogRecord(prev, action)
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
  const coverProperty = useMemo(() => ({ path: 'cover_image', propertyPath: 'cover_image', label: 'Cover image' }), [])

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

      const payload = pickBlogSaveParams(params)

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
          message: isNew ? 'Blog post created.' : 'Blog post saved.',
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
    <Box variant="white" p="xxl" data-blog-edit-form="1">
      <H2 mb="xl">{isNew ? 'Create new blog post' : 'Edit blog post'}</H2>

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

          <Box>
            <Label>Excerpt</Label>
            <TextArea
              value={params.excerpt || ''}
              onChange={(e) => setField('excerpt', e.target.value)}
              rows={3}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <Label>Body</Label>
            <Box mt="sm">
              <RichTextEditor
                value={params.body_html || ''}
                onChange={(value) => setField('body_html', value)}
                minHeight={300}
              />
            </Box>
          </Box>

          <BlogCoverUpload
            property={coverProperty}
            record={record}
            onChange={(path, value) => setField(path, value)}
            where="edit"
          />

          <Box>
            <Label>Author name</Label>
            <Input
              value={params.author_name || ''}
              onChange={(e) => setField('author_name', e.target.value)}
              style={{ width: '100%' }}
            />
          </Box>

          <Box>
            <Label>Tags</Label>
            <Input
              value={params.tags || ''}
              onChange={(e) => setField('tags', e.target.value)}
              placeholder="Design, Research, Interviews"
              style={{ width: '100%' }}
            />
            <Text variant="sm" color="grey60" mt="sm">
              Comma-separated tags shown on the blog card and detail page.
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
              Published posts appear on the website. Draft and unpublished posts are hidden.
            </Text>
          </Box>

          <Box>
            <CheckBox
              id="blog-is-featured"
              checked={Boolean(params.is_featured === 1 || params.is_featured === '1' || params.is_featured === true)}
              onChange={(e) => setField('is_featured', e.target.checked ? 1 : 0)}
            />
            <Label inline htmlFor="blog-is-featured" ml="default">
              Featured on homepage
            </Label>
          </Box>
        </Box>
      </FormSaveChrome>
    </Box>
  )
}
