import React, { useEffect, useMemo, useState } from 'react'
import { ApiClient } from 'adminjs'
import { Badge, Box, Button, H2, Text } from '@adminjs/design-system'
import { DashboardDailyChart } from './DashboardDailyChart.jsx'

function Tile({ title, value, accentClass = 'dashboard-tile--navy' }) {
  return (
    <Box p="xl" borderRadius="lg" className={`dashboard-tile ${accentClass}`}>
      <Text className="dashboard-tile__label">{title}</Text>
      <Text className="dashboard-tile__value">{value}</Text>
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
    analyticsDays: 30,
    pageVisitsByDate: [],
    pageVisitsTotal: 0,
    bookingClicksByDate: [],
    bookingClicksTotal: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      try {
        const res = await api.getDashboard()
        if (!alive) return
        const payload = res?.data || {}
        setData({
          listingCount: Number(payload.listingCount || 0),
          userCount: Number(payload.userCount || 0),
          commentCount: Number(payload.commentCount || 0),
          recentListings: Array.isArray(payload.recentListings) ? payload.recentListings : [],
          analyticsDays: Number(payload.analyticsDays || 30),
          pageVisitsByDate: Array.isArray(payload.pageVisitsByDate) ? payload.pageVisitsByDate : [],
          pageVisitsTotal: Number(payload.pageVisitsTotal || 0),
          bookingClicksByDate: Array.isArray(payload.bookingClicksByDate) ? payload.bookingClicksByDate : [],
          bookingClicksTotal: Number(payload.bookingClicksTotal || 0),
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
    <Box variant="grey" p="xxl" className="dashboard-page">
      <Box className="dashboard-page__intro">
        <H2 className="dashboard-page__title">Dashboard</H2>
        <Text className="dashboard-page__subtitle" mt="sm">
          {loading ? 'Loading…' : 'Overview of listings, visitors, and bookings'}
        </Text>
      </Box>

      <Box className="dashboard-overview" mt="xl">
        <Box className="dashboard-overview__tiles">
          <Tile title="Listing count" value={data.listingCount} accentClass="dashboard-tile--navy" />
          <Tile title="User count" value={data.userCount} accentClass="dashboard-tile--teal" />
          <Tile title="Comments count" value={data.commentCount} accentClass="dashboard-tile--amber" />
        </Box>

        <Box className="dashboard-overview__charts">
          <DashboardDailyChart
            title="Page visits by date"
            subtitle={
              loading
                ? undefined
                : `Analytics → Page visits · last ${data.analyticsDays} days · ${data.pageVisitsTotal} total`
            }
            accentClass="dashboard-chart--navy"
            series={data.pageVisitsByDate}
            loading={loading}
            viewHref="/admin/resources/page_visits"
          />
          <DashboardDailyChart
            title="Booking clicks by date"
            subtitle={
              loading
                ? undefined
                : `Analytics → Booking clicks · last ${data.analyticsDays} days · ${data.bookingClicksTotal} total`
            }
            accentClass="dashboard-chart--amber"
            series={data.bookingClicksByDate}
            loading={loading}
            viewHref="/admin/resources/booking_clicks"
          />
        </Box>
      </Box>

      <Box mt="xl" borderRadius="lg" className="dashboard-recent">
        <Box p="xl" className="dashboard-recent__head">
          <Text className="dashboard-recent__title">Recent listings</Text>
        </Box>
        <Box>
          {(data.recentListings || []).length === 0 ? (
            <Box p="xl">
              <Text className="dashboard-muted">{loading ? 'Loading…' : 'No listings yet.'}</Text>
            </Box>
          ) : (
            <Box>
              <Box px="xl" py="lg" className="dashboard-recent__cols">
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
                  <Box key={id} px="xl" py="lg" className="dashboard-recent__row">
                    <Text className="dashboard-recent__name">{title}</Text>
                    <Text className="dashboard-muted">{typeName}</Text>
                    <Box>
                      <Badge variant={badge.variant} outline={status === 'draft'} size="sm">
                        {badge.label}
                      </Badge>
                    </Box>
                    <Text className="dashboard-muted">{publishAt}</Text>
                    <Text className="dashboard-muted">{createdAt}</Text>
                    <Button
                      as="a"
                      href={`/admin/resources/listings/records/${encodeURIComponent(id)}/edit`}
                      variant="text"
                      size="sm"
                      className="dashboard-recent__edit"
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
