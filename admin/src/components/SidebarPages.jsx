import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigation } from '@adminjs/design-system'
import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'adminjs'

const SITE_SETTINGS_GROUP_ID = 'site-settings'
const SIDEBAR_STORAGE_KEY = 'sidebarElements'

function readOpenElements() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function SidebarPages(props) {
  const { pages } = props
  const { translateLabel, translatePage } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [openElements, setOpenElements] = useState(() => readOpenElements())

  useEffect(() => {
    const onStorage = () => setOpenElements(readOpenElements())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isActive = useCallback((page) => Boolean(location.pathname.match(`/pages/${page.name}`)), [location.pathname])

  const childElements = useMemo(() => {
    if (!pages?.length) return []

    return pages.map((page) => ({
      id: page.name,
      label: translatePage(page.name),
      isSelected: isActive(page),
      icon: page.icon,
      href: `/admin/pages/${page.name}`,
      onClick: (event, element) => {
        event.preventDefault()
        if (element.href) navigate(element.href)
      },
    }))
  }, [isActive, navigate, pages, translatePage])

  if (!childElements.length) return null

  const anyChildActive = childElements.some((item) => item.isSelected)
  const isOpen = openElements[SITE_SETTINGS_GROUP_ID] ?? anyChildActive

  const toggleGroup = () => {
    setOpenElements((current) => {
      const next = {
        ...current,
        [SITE_SETTINGS_GROUP_ID]: !isOpen,
      }
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const elements = [
    {
      id: SITE_SETTINGS_GROUP_ID,
      label: translateLabel('pages'),
      icon: 'Settings',
      isOpen,
      onClick: toggleGroup,
      elements: childElements,
    },
  ]

  return <Navigation label={translateLabel('pages')} elements={elements} />
}
