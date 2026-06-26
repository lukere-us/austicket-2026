import React, { useMemo } from 'react'
import DatePicker from 'react-datepicker'
import { listingDateYmd } from './listingDateUtils.js'
import ModernPickerInput from './ModernPickerInput.jsx'

function ymdToLocalDate(ymd) {
  if (!ymd) return null
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function localDateToSqlDatetime(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d} 00:00:00`
}

export default function ModernDatePicker(props) {
  const {
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = 'Select date',
    disabled = false,
    id,
    className = '',
  } = props

  const selected = useMemo(() => ymdToLocalDate(listingDateYmd(value)), [value])

  return (
    <div className={className}>
      <DatePicker
        id={id}
        selected={selected}
        onChange={(date) => onChange(localDateToSqlDatetime(date))}
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        disabled={disabled}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder}
        showPopperArrow={false}
        calendarClassName="admin-modern-calendar"
        popperClassName="admin-modern-calendar-popper"
        customInput={
          <ModernPickerInput
            icon="calendar_month"
            placeholder={placeholder}
            showClear
            onClear={() => onChange('')}
          />
        }
      />
    </div>
  )
}
