import React, { useEffect } from 'react'
import { Box } from '@adminjs/design-system'
import { ADMIN_HELP_HTML } from '../lib/adminHelpContent.js'

export default function AdminHelp() {
  useEffect(() => {
    const onClick = (event) => {
      const link = event.target.closest('a[href^="#"]')
      if (!link || !link.getAttribute('href').startsWith('#')) return
      const id = link.getAttribute('href').slice(1)
      const target = document.getElementById(id)
      if (!target) return
      event.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (history.replaceState) {
        history.replaceState(null, '', `#${id}`)
      }
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <Box variant="grey" className="admin-help">
      <div className="admin-help-doc-wrap" dangerouslySetInnerHTML={{ __html: ADMIN_HELP_HTML }} />
    </Box>
  )
}
