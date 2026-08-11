import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigation } from '@adminjs/design-system'
import { useCurrentAdmin, useTranslation } from 'adminjs'
import { useLocation, useNavigate } from 'react-router'
import { canAccessSiteSettingsSection } from '../lib/adminPermissions.js'
import { SITE_SETTINGS_SECTIONS } from '../lib/siteSettingsSections.shared.js'

const SITE_SETTINGS_GROUP_ID = 'site-settings'
const SIDEBAR_STORAGE_KEY = 'sidebarElements'

const PAGE_ICONS = {
  general: 'Settings',
  sliderBanner: 'Sliders',
  homeListings: 'Layout',
  footer: 'Menu',
  header: 'Navigation',
  partners: 'Aperture',
  ads: 'Target',
  youtubeCarousel: 'Youtube',
  siteHealth: 'Activity',
  help: 'HelpCircle',
}

function readOpenElements() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function SidebarPages(props) {
  const { pages: pagesFromAdmin = [] } = props
  const currentAdmin = useCurrentAdmin()
  const { translateLabel, translatePage } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [openElements, setOpenElements] = useState(() => readOpenElements())

  useEffect(() => {
    const onStorage = () => setOpenElements(readOpenElements())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isActive = useCallback((pageName) => Boolean(location.pathname.match(`/pages/${pageName}`)), [location.pathname])

  const childElements = useMemo(() => {
    const admin = currentAdmin?.id != null ? currentAdmin : null
    const iconByName = new Map((pagesFromAdmin || []).map((page) => [page.name, page.icon]))

    const siteSettings = SITE_SETTINGS_SECTIONS.filter((section) =>
      canAccessSiteSettingsSection(admin, section.id),
    ).map((section) => ({
      id: section.id,
      label: translatePage(section.id),
      isSelected: isActive(section.id),
      icon: iconByName.get(section.id) || PAGE_ICONS[section.id] || 'Settings',
      href: `/admin/pages/${section.id}`,
      onClick: (event, element) => {
        event.preventDefault()
        if (element.href) navigate(element.href)
      },
    }))

    const items = [...siteSettings]

    if (admin) {
      items.push({
        id: 'help',
        label: translatePage('help'),
        isSelected: isActive('help'),
        icon: iconByName.get('help') || PAGE_ICONS.help,
        href: '/admin/pages/help',
        onClick: (event, element) => {
          event.preventDefault()
          if (element.href) navigate(element.href)
        },
      })
    }

    const known = new Set(items.map((item) => item.id))
    for (const page of pagesFromAdmin || []) {
      if (!page?.name || known.has(page.name)) continue
      items.push({
        id: page.name,
        label: translatePage(page.name),
        isSelected: isActive(page.name),
        icon: page.icon || 'File',
        href: `/admin/pages/${page.name}`,
        onClick: (event, element) => {
          event.preventDefault()
          if (element.href) navigate(element.href)
        },
      })
    }

    return items
  }, [currentAdmin, isActive, navigate, pagesFromAdmin, translatePage])

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
