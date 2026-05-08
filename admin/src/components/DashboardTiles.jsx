import React, { useEffect, useMemo, useState } from 'react'
import { ApiClient } from 'adminjs'
import { Badge, Box, Button, H2, Text } from '@adminjs/design-system'

function Tile({ title, value, accent = '#2563eb' }) {
  return (
    <Box
      p="xl"
      borderRadius="lg"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        minHeight: 92,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 6,
          background: accent,
        }}
      />
      <Text variant="sm" color="grey60">
        {title}
      </Text>
      <Text
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Text>
    </Box>
  )
}

export default function DashboardTiles() {
  const api = useMemo(() => new ApiClient(), [])
  const [data, setData] = useState({
    listingCount: 0,
    userCount: 0,
    commentCount: 0,
    recentListings: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const res = await api.getDashboard()
        if (!alive) return
        setData({
          listingCount: Number(res?.data?.listingCount || 0),
          userCount: Number(res?.data?.userCount || 0),
          commentCount: Number(res?.data?.commentCount || 0),
          recentListings: Array.isArray(res?.data?.recentListings) ? res.data.recentListings : [],
        })
      } finally {
        if (alive) setLoading(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [api])

  return (
    <Box variant="grey" p="xxl">
      <H2>Dashboard</H2>
      <Text variant="sm" color="grey60" mt="sm">
        {loading ? 'Loading…' : 'Overview'}
      </Text>

      <Box
        mt="xl"
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
        gridGap="16px"
      >
        <Tile title="Listing count" value={data.listingCount} accent="#2563eb" />
        <Tile title="User count" value={data.userCount} accent="#06b6d4" />
        <Tile title="Comments count" value={data.commentCount} accent="#f97316" />
      </Box>

      <Box
        mt="xl"
        borderRadius="lg"
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <Box p="xl" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Text style={{ fontWeight: 700 }}>Recent listings</Text>
        </Box>
        <Box>
          {(data.recentListings || []).length === 0 ? (
            <Box p="xl">
              <Text color="grey60">{loading ? 'Loading…' : 'No listings yet.'}</Text>
            </Box>
          ) : (
            <Box>
              {/* header */}
              <Box
                px="xl"
                py="lg"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
                  gap: 12,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  background: 'rgba(0,0,0,0.02)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Text>Title</Text>
                <Text>Type</Text>
                <Text>Status</Text>
                <Text>Release date</Text>
                <Text>Created</Text>
                <Text>Edit</Text>
              </Box>

              {(data.recentListings || []).map((it) => {
                const id = String(it.id)
                const title = String(it.title || '')
                const typeName = String(it.type_name || '')
                const status = String(it.status || '')
                const createdAt = it.created_at ? new Date(it.created_at).toLocaleDateString() : ''
                const publishAt = it.publish_at ? new Date(it.publish_at).toLocaleDateString() : '—'
                const badge = (() => {
                  switch (status) {
                    case 'published':
                      return { label: 'Published', variant: 'success' }
                    case 'unpublished':
                      return { label: 'Unpublished', variant: 'danger' }
                    case 'draft':
                      return { label: 'Draft', variant: 'info' }
                    default:
                      return { label: status || '—', variant: 'secondary' }
                  }
                })()

                return (
                  <Box
                    key={id}
                    px="xl"
                    py="lg"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
                      gap: 12,
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {title}
                    </Text>
                    <Text variant="sm" color="grey60">
                      {typeName}
                    </Text>
                    <Box>
                      <Badge variant={badge.variant} outline={status === 'draft'} size="sm">
                        {badge.label}
                      </Badge>
                    </Box>
                    <Text variant="sm" color="grey60">
                      📅 {publishAt}
                    </Text>
                    <Text variant="sm" color="grey60">
                      {createdAt}
                    </Text>
                    <Button
                      as="a"
                      href={`/admin/resources/listings/records/${encodeURIComponent(id)}/edit`}
                      variant="text"
                      size="sm"
                    >
                      Edit →
                    </Button>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

