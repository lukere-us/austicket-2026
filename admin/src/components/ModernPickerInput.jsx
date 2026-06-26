import React, { forwardRef } from 'react'
import MaterialIcon from './MaterialIcon.jsx'

const ModernPickerInput = forwardRef(function ModernPickerInput(props, ref) {
  const {
    value,
    onClick,
    onChange,
    placeholder,
    disabled,
    icon = 'event',
    onClear,
    showClear = false,
    className = '',
  } = props

  return (
    <div className={`admin-modern-picker ${className}`.trim()}>
      <span className="admin-modern-picker__icon" aria-hidden>
        <MaterialIcon name={icon} size={20} />
      </span>
      <input
        ref={ref}
        className="admin-modern-picker__input"
        value={value || ''}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
      />
      {showClear && value ? (
        <button
          type="button"
          className="admin-modern-picker__clear"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClear?.()
          }}
          aria-label="Clear"
          tabIndex={-1}
        >
          <MaterialIcon name="close" size={18} />
        </button>
      ) : null}
    </div>
  )
})

export default ModernPickerInput
