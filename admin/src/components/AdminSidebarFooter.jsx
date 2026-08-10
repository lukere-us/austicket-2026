import React, { useEffect } from 'react'
import { useCurrentAdmin } from 'adminjs'
import { applyDocumentTheme } from '../lib/adminThemeClient.js'

/**
 * Keeps document theme class in sync. Visible toggle lives in the top bar (LoggedIn).
 */
export default function AdminSidebarFooter() {
  const [currentAdmin] = useCurrentAdmin()
  const theme = currentAdmin?.theme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  return null
}
