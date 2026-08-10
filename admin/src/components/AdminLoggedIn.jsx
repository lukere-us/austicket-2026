import React, { useCallback, useEffect } from 'react'
import { useCurrentAdmin } from 'adminjs'
import { Box, CurrentUserNav } from '@adminjs/design-system'
import { styled } from '@adminjs/design-system/styled-components'
import { applyDocumentTheme, persistAdminTheme } from '../lib/adminThemeClient.js'

const Row = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme?.colors?.border || '#e2e8f0'};
  background: ${({ theme }) => theme?.colors?.filterBg || theme?.colors?.grey20 || '#f8fafc'};
  color: ${({ theme }) => theme?.colors?.grey80 || theme?.colors?.text || '#334155'};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme?.colors?.primary100 || '#d97706'};
    color: ${({ theme }) => theme?.colors?.primary100 || '#d97706'};
  }

  svg {
    width: 18px;
    height: 18px;
    display: block;
  }
`

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.3A9 9 0 0 1 9.7 3 7.5 7.5 0 1 0 21 14.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function AdminLoggedIn(props) {
  const { session, paths } = props
  const [currentAdmin, setCurrentAdmin] = useCurrentAdmin()
  const theme = (currentAdmin?.theme || session?.theme) === 'dark' ? 'dark' : 'light'
  const isDark = theme === 'dark'

  useEffect(() => {
    applyDocumentTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(async () => {
    const next = isDark ? 'light' : 'dark'
    try {
      const admin = await persistAdminTheme(next, currentAdmin || session)
      setCurrentAdmin(admin)
      window.location.reload()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }, [currentAdmin, isDark, session, setCurrentAdmin])

  const dropActions = [
    {
      label: 'Logout',
      onClick: (event) => {
        event.preventDefault()
        window.location.href = paths.logoutPath
      },
      icon: 'LogOut',
    },
  ]

  return (
    <Row data-css="logged-in" className="admin-logged-in">
      <IconBtn
        type="button"
        className="admin-theme-icon-btn"
        onClick={() => void toggleTheme()}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </IconBtn>
      <CurrentUserNav
        name={session.email}
        title={session.title}
        avatarUrl={session.avatarUrl}
        dropActions={dropActions}
      />
    </Row>
  )
}
