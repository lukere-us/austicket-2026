import React, { useMemo, useState } from 'react'
import { ApiClient, useNotice } from 'adminjs'
import { Box, Button, H2, Loader, Text } from '@adminjs/design-system'

export default function DuplicateListingAction(props) {
  const { resource, record } = props
  const sendNotice = useNotice()
  const api = useMemo(() => new ApiClient(), [])
  const [status, setStatus] = useState('Click “Duplicate now” to create a copy.')
  const [isRunning, setIsRunning] = useState(false)

  const onDuplicate = async () => {
    if (isRunning) return
    if (!record?.id) {
      sendNotice({ type: 'error', message: 'Missing record id' })
      return
    }

    const guardKey = `austicket:duplicate:${resource?.id}:${record.id}`
    try {
      const last = Number(sessionStorage.getItem(guardKey) || 0)
      const now = Date.now()
      // Prevent accidental re-runs on refresh/back for a short window.
      if (Number.isFinite(last) && last > 0 && now - last < 30_000) {
        sendNotice({ type: 'warning', message: 'Duplicate already started recently. Please wait a moment.' })
        return
      }
      sessionStorage.setItem(guardKey, String(now))
    } catch {
      // ignore
    }

    setIsRunning(true)
    setStatus('Duplicating listing…')
    try {
      const res = await api.recordAction({
        resourceId: resource.id,
        recordId: record.id,
        actionName: 'duplicate',
        data: {},
      })

      const notice = res?.data?.notice
      if (notice) sendNotice(notice)

      const redirectUrl = res?.data?.redirectUrl
      if (redirectUrl) {
        setStatus('Redirecting…')
        window.location.assign(redirectUrl)
        return
      }

      setStatus('Done. No redirect returned.')
    } catch (e) {
      const msg = e?.message || String(e)
      setStatus(msg)
      sendNotice({ type: 'error', message: msg })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Box variant="white">
      <H2>Duplicate listing</H2>
      <Box mt="lg" display="flex" flexDirection="column" alignItems="flex-start" gap="md">
        {isRunning ? <Loader /> : null}
        <Text>{status}</Text>
        <Box display="flex" gap="sm">
          <Button type="button" variant="primary" onClick={onDuplicate} disabled={isRunning}>
            Duplicate now
          </Button>
          <Button type="button" variant="text" onClick={() => window.history.back()} disabled={isRunning}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

