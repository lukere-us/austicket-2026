import React from 'react'
import { Box, Label, Text } from '@adminjs/design-system'

export function SettingsFieldRow({ field, value, onChange }) {
  const id = `setting-${field.key}`

  if (field.type === 'boolean') {
    return (
      <Box mb="lg">
        <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            id={id}
            name={field.key}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(field.key, e.target.checked)}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{field.label}</span>
        </label>
        {field.help ? (
          <Text variant="sm" color="grey60" mt="sm">
            {field.help}
          </Text>
        ) : null}
      </Box>
    )
  }

  if (field.type === 'select') {
    return (
      <Box mb="lg">
        <Label htmlFor={id}>{field.label}</Label>
        <select
          id={id}
          name={field.key}
          className="admin-field-control"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help ? (
          <Text variant="sm" color="grey60" mt="sm">
            {field.help}
          </Text>
        ) : null}
      </Box>
    )
  }

  if (field.type === 'textarea') {
    return (
      <Box mb="lg">
        <Label htmlFor={id}>{field.label}</Label>
        <textarea
          id={id}
          name={field.key}
          className="admin-field-control admin-field-control--textarea"
          rows={field.rows || 4}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
        {field.help ? (
          <Text variant="sm" color="grey60" mt="sm">
            {field.help}
          </Text>
        ) : null}
      </Box>
    )
  }

  const displayValue =
    field.type === 'number'
      ? value === null || value === undefined || Number.isNaN(Number(value))
        ? ''
        : String(value)
      : (value ?? '')

  return (
    <Box mb="lg">
      <Label htmlFor={id}>{field.label}</Label>
      <input
        id={id}
        name={field.key}
        className="admin-field-control"
        type={field.type === 'number' ? 'number' : 'text'}
        value={displayValue}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => {
          const raw = e.target.value
          if (field.type === 'number') {
            if (raw === '' || raw === '-') {
              onChange(field.key, raw)
              return
            }
            const n = Number(raw)
            onChange(field.key, Number.isFinite(n) ? n : raw)
            return
          }
          onChange(field.key, raw)
        }}
      />
      {field.help ? (
        <Text variant="sm" color="grey60" mt="sm">
          {field.help}
        </Text>
      ) : null}
    </Box>
  )
}
