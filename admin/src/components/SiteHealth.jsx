import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, H2, H4, Loader, Text } from '@adminjs/design-system'

const STATUS_COLOR = {
  ok: '#15803d',
  warn: '#b45309',
  error: '#b91c1c',
}

const STATUS_BG = {
  ok: 'rgba(34, 197, 94, 0.12)',
  warn: 'rgba(245, 158, 11, 0.14)',
  error: 'rgba(239, 68, 68, 0.12)',
}

function StatusBadge({ status }) {
  const label = status === 'ok' ? 'OK' : status === 'warn' ? 'Warning' : 'Error'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        color: STATUS_COLOR[status] || '#475569',
        background: STATUS_BG[status] || 'rgba(148,163,184,0.15)',
      }}
    >
      {label}
    </span>
  )
}

function DetailList({ detail }) {
  if (!detail || typeof detail !== 'object') return null
  const entries = Object.entries(detail)
  if (!entries.length) return null

  return (
    <Box mt="md" style={{ display: 'grid', gap: 6 }}>
      {entries.map(([key, value]) => (
        <Text key={key} variant="sm" color="grey60" style={{ wordBreak: 'break-word' }}>
          <strong style={{ color: 'inherit' }}>{key}:</strong>{' '}
          {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
        </Text>
      ))}
    </Box>
  )
}

export default function SiteHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchStartedRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/admin/api/settings/site-health', {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      if (!res.ok) throw new Error(`Failed to load site health (${res.status})`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (fetchStartedRef.current) return
    fetchStartedRef.current = true
    void load()
  }, [load])

  return (
    <Box variant="grey">
      <Box
        flex
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        style={{ gap: 12, marginBottom: 16 }}
      >
        <Box>
          <H2>Site Health</H2>
          <Text variant="sm" color="grey60">
            Live checks for database, uploads, public API, and share media.
          </Text>
        </Box>
        <Button variant="primary" size="default" onClick={() => void load()} disabled={loading}>
          {loading ? 'Checking…' : 'Re-check'}
        </Button>
      </Box>

      {loading && !data ? (
        <Box flex justifyContent="center" p="xxl">
          <Loader />
        </Box>
      ) : null}

      {error ? (
        <Box
          p="lg"
          mb="lg"
          style={{
            borderRadius: 12,
            background: STATUS_BG.error,
            color: STATUS_COLOR.error,
          }}
        >
          <Text>{error}</Text>
        </Box>
      ) : null}

      {data ? (
        <>
          <Box
            p="lg"
            mb="lg"
            style={{
              borderRadius: 12,
              background: STATUS_BG[data.overall] || STATUS_BG.warn,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Text variant="sm" color="grey60">
                Overall status
              </Text>
              <Box mt="sm" flex alignItems="center" style={{ gap: 10 }}>
                <StatusBadge status={data.overall} />
                <Text>
                  {data.summary?.ok || 0} ok · {data.summary?.warn || 0} warnings · {data.summary?.error || 0}{' '}
                  errors
                </Text>
              </Box>
            </Box>
            <Text variant="sm" color="grey60">
              Checked {data.checkedAt ? new Date(data.checkedAt).toLocaleString() : '—'}
            </Text>
          </Box>

          <Box style={{ display: 'grid', gap: 12 }}>
            {(data.checks || []).map((check) => (
              <Box
                key={check.id}
                variant="white"
                p="lg"
                style={{
                  borderRadius: 12,
                  borderLeft: `4px solid ${STATUS_COLOR[check.status] || '#94a3b8'}`,
                }}
              >
                <Box flex justifyContent="space-between" alignItems="center" style={{ gap: 12 }}>
                  <H4 style={{ margin: 0 }}>{check.label}</H4>
                  <StatusBadge status={check.status} />
                </Box>
                <Text mt="sm">{check.message}</Text>
                <DetailList detail={check.detail} />
              </Box>
            ))}
          </Box>
        </>
      ) : null}
    </Box>
  )
}
