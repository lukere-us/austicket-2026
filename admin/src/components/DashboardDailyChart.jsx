import React, { useMemo } from 'react'
import { Box, Text } from '@adminjs/design-system'

function buildBars(series, chartWidth, chartHeight, padding) {
  const innerW = chartWidth - padding.left - padding.right
  const innerH = chartHeight - padding.top - padding.bottom
  const max = Math.max(1, ...series.map((item) => item.count))
  const step = innerW / Math.max(series.length, 1)
  const barW = Math.max(2, step * 0.62)

  return series.map((item, index) => {
    const barH = (item.count / max) * innerH
    const x = padding.left + index * step + (step - barW) / 2
    const y = padding.top + innerH - barH
    return { ...item, x, y, barW, barH, max }
  })
}

export function DashboardDailyChart(props) {
  const { title, subtitle, accent = '#2563eb', series = [], loading = false, viewHref } = props

  const chartWidth = 420
  const chartHeight = 200
  const padding = { top: 12, right: 8, bottom: 28, left: 36 }

  const bars = useMemo(() => buildBars(series, chartWidth, chartHeight, padding), [series])
  const maxValue = bars[0]?.max ?? 1
  const total = series.reduce((sum, item) => sum + item.count, 0)
  const labelEvery = series.length > 20 ? 5 : series.length > 12 ? 3 : 2

  return (
    <Box
      p="xl"
      borderRadius="lg"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box mb="md">
        <Text style={{ fontWeight: 700, fontSize: 15 }}>{title}</Text>
        <Text variant="sm" color="grey60" mt="xs">
          {loading ? 'Loading…' : subtitle || `Last ${series.length} days · ${total} total`}
        </Text>
        {viewHref ? (
          <Text variant="sm" mt="xs">
            <a href={viewHref} style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>
              View in Analytics →
            </a>
          </Text>
        ) : null}
      </Box>

      <Box flexGrow={1} style={{ minHeight: 200 }}>
        {loading ? (
          <Text color="grey60" variant="sm">
            Loading chart…
          </Text>
        ) : series.length === 0 ? (
          <Text color="grey60" variant="sm">
            No data yet.
          </Text>
        ) : total === 0 ? (
          <Text color="grey60" variant="sm">
            No visits in the last {series.length} days.
          </Text>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            width="100%"
            height="200"
            role="img"
            aria-label={`${title} bar chart`}
            className="dashboard-daily-chart__svg"
          >
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#e4e4e7"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#e4e4e7"
              strokeWidth="1"
            />
            <text x={4} y={padding.top + 4} fill="#71717a" fontSize="10">
              {maxValue}
            </text>
            <text x={4} y={chartHeight - padding.bottom} fill="#71717a" fontSize="10">
              0
            </text>

            {bars.map((bar) => (
              <g key={bar.date}>
                <title>{`${bar.label}: ${bar.count}`}</title>
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.barW}
                  height={Math.max(bar.barH, bar.count > 0 ? 2 : 0)}
                  rx="2"
                  fill={accent}
                  opacity="0.9"
                />
                {bar.count > 0 ? (
                  <text
                    x={bar.x + bar.barW / 2}
                    y={bar.y - 4}
                    textAnchor="middle"
                    fill="#52525b"
                    fontSize="9"
                  >
                    {bar.count}
                  </text>
                ) : null}
              </g>
            ))}

            {series.map((item, index) =>
              index % labelEvery === 0 || index === series.length - 1 ? (
                <text
                  key={`${item.date}-label`}
                  x={padding.left + index * ((chartWidth - padding.left - padding.right) / series.length) + 6}
                  y={chartHeight - 8}
                  fill="#71717a"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </Box>
    </Box>
  )
}
