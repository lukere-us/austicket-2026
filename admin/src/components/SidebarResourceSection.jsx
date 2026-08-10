import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigation } from '@adminjs/design-system'
import { useTranslation } from 'adminjs'
import { useLocation, useNavigate } from 'react-router'

const SIDEBAR_STORAGE_KEY = 'sidebarElements'

function readOpenElements() {
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * AdminJS's default useNavigationResources only puts the icon on the parent group.
 * This override also passes each resource's navigation.icon onto submenu children.
 */
export default function SidebarResourceSection({ resources }) {
  const { translateLabel } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [openElements, setOpenElements] = useState(() => readOpenElements())

  useEffect(() => {
    const onStorage = () => setOpenElements(readOpenElements())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isSelected = useCallback(
    (href) => {
      if (!href) return false
      return Boolean(location.pathname.match(new RegExp(`${href}($|/)`)))
    },
    [location.pathname],
  )

  const toggleGroup = useCallback((key) => {
    setOpenElements((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      }
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const elements = useMemo(() => {
    const enrichResource = (resource, icon) => ({
      href: resource.href || undefined,
      icon: icon || undefined,
      isSelected: isSelected(resource.href),
      label: translateLabel(resource.name, resource.id),
      id: resource.id,
      onClick: (event) => {
        if (resource.href) {
          event.preventDefault()
          navigate(resource.href)
        }
      },
    })

    const map = (resources || [])
      .filter((res) => res.href && res.navigation?.show !== false)
      .reduce((memo, resource) => {
        const key = resource.navigation?.name || ['resource', resource.name].join('-')
        const childIcon = resource.navigation?.icon

        if (!resource.navigation || resource.navigation.name === null) {
          memo[key] = enrichResource(resource, childIcon)
        } else if (memo[key]?.elements && resource.navigation?.name) {
          memo[key].label = translateLabel(resource.navigation.name)
          memo[key].elements.push(enrichResource(resource, childIcon))
        } else {
          memo[key] = {
            id: key,
            elements: [enrichResource(resource, childIcon)],
            label: translateLabel(resource.navigation.name),
            icon: childIcon,
            onClick: () => toggleGroup(key),
            isOpen: false,
          }
        }
        return memo
      }, {})

    return Object.entries(map).map(([key, group]) => {
      if (!group.elements?.length) return group
      const anyChildActive = group.elements.some((el) => el.isSelected)
      return {
        ...group,
        isOpen: openElements[key] ?? anyChildActive,
      }
    })
  }, [resources, isSelected, navigate, openElements, toggleGroup, translateLabel])

  return <Navigation label={translateLabel('navigation')} elements={elements} />
}
