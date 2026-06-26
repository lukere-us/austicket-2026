import React, { useMemo } from 'react'
import DatePicker from 'react-datepicker'
import { normalizeListingDatetime } from './listingDateUtils.js'
import ModernPickerInput from './ModernPickerInput.jsx'

export function extractTimeHm(value) {
  const norm = normalizeListingDatetime(value)
  if (norm) return norm.slice(11, 16)
  const raw = String(value ?? '').trim()
  const m = raw.match(/(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : ''
}

function hmToLocalDate(hm) {
  if (!hm) return null
  const [h, m] = hm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

function localDateToHm(date) {
  if (!date) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function ModernTimePicker(props) {
  const {
    value,
    onChange,
    placeholder = 'Select time',
    disabled = false,
    id,
    className = '',
    interval = 15,
  } = props

  const hm = extractTimeHm(value)
  const selected = useMemo(() => hmToLocalDate(hm), [hm])

  return (
    <div className={className}>
      <DatePicker
        id={id}
        selected={selected}
        onChange={(date) => onChange(localDateToHm(date))}
        disabled={disabled}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={interval}
        timeCaption="Time"
        dateFormat="h:mm aa"
        placeholderText={placeholder}
        showPopperArrow={false}
        calendarClassName="admin-modern-calendar admin-modern-calendar--time"
        popperClassName="admin-modern-calendar-popper"
        customInput={
          <ModernPickerInput
            icon="schedule"
            placeholder={placeholder}
            showClear
            onClear={() => onChange('')}
          />
        }
      />
    </div>
  )
}
