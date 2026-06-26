import React from 'react'

const MATERIAL_SYMBOLS_FONT = "'Material Symbols Outlined', sans-serif"

export default function MaterialIcon({
  name,
  className = '',
  filled = false,
  size = 24,
  weight = 400,
  style,
  ...rest
}) {
  const opsz = size <= 20 ? 20 : size <= 24 ? 24 : 48

  return (
    <span
      className={['material-symbols-outlined', filled ? 'is-filled' : '', className].filter(Boolean).join(' ')}
      style={{
        fontFamily: MATERIAL_SYMBOLS_FONT,
        fontSize: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`,
        ...style,
      }}
      aria-hidden={rest['aria-hidden'] ?? true}
      {...rest}
    >
      {name}
    </span>
  )
}
