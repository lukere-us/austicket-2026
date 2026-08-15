import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigation } from '@adminjs/design-system'
import { useCurrentAdmin, useTranslation } from 'adminjs'
import { useLocation, useNavigate } from 'react-router'
import {
  canAccessPage,
  canAccessSiteSettingsSection,
} from '../lib/adminPermissions.js'
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

function normalizeAdmin(value) {
  // AdminJS useCurrentAdmin() returns [admin, setAdmin]
  const admin = Array.isArray(value) ? value[0] : value
  return admin?.id != null ? admin : null
}

export default function SidebarPages(props) {
  const { pages: pagesFromAdmin = [] } = props
  const currentAdminState = useCurrentAdmin()
  const currentAdmin = normalizeAdmin(currentAdminState)
  const { translateLabel, translatePage } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [openElements, setOpenElements] = useState(() => readOpenElements())

  useEffect(() => {
    const onStorage = () => setOpenElements(readOpenElements())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isActive = useCallback(
    (pageName) => Boolean(location.pathname.match(`/pages/${pageName}`)),
    [location.pathname],
  )

  const childElements = useMemo(() => {
    const admin = currentAdmin
    const iconByName = new Map((pagesFromAdmin || []).map((page) => [page.name, page.icon]))

    const makeItem = (id, label) => ({
      id,
      label,
      isSelected: isActive(id),
      icon: iconByName.get(id) || PAGE_ICONS[id] || 'Settings',
      href: `/admin/pages/${id}`,
      onClick: (event, element) => {
        event.preventDefault()
        if (element.href) navigate(element.href)
      },
    })

    const items = SITE_SETTINGS_SECTIONS.filter((section) =>
      canAccessSiteSettingsSection(admin, section.id),
    ).map((section) => makeItem(section.id, translatePage(section.id)))

    if (canAccessPage(admin, 'help')) {
      items.push(makeItem('help', translatePage('help')))
    }

    const known = new Set(items.map((item) => item.id))
    for (const page of pagesFromAdmin || []) {
      if (!page?.name || known.has(page.name)) continue
      if (
        !canAccessSiteSettingsSection(admin, page.name) &&
        !canAccessPage(admin, page.name)
      ) {
        continue
      }
      items.push(makeItem(page.name, translatePage(page.name)))
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
