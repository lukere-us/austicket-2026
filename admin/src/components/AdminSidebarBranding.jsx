import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cssClass } from '@adminjs/design-system'
import { styled } from '@adminjs/design-system/styled-components'
import { uploadPathToAdminUrl } from '../lib/adminBrandLogo.js'

const StyledLogo = styled(Link)`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  padding: 22px 20px 18px;
  text-decoration: none;
  border-bottom: 1px solid rgba(15, 39, 68, 0.08);

  & > h1 {
    text-decoration: none;
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600;
    color: #0f2744;
    font-size: 1.15rem;
    line-height: 1.3;
    letter-spacing: -0.02em;
    margin: 0;
  }

  & > img {
    display: block;
    max-width: 168px;
    max-height: 48px;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  & > span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #b45309;
  }

  &:hover h1 {
    color: var(--admin-amber);
  }
`

export default function AdminSidebarBranding(props) {
  const { branding } = props
  const companyName = branding?.companyName || 'AUS Ticket Lanka'
  const [logo, setLogo] = useState(branding?.logo || '')

  useEffect(() => {
    let alive = true

    const run = async () => {
      try {
        const res = await fetch('/admin/api/settings/header', {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        })
        if (!res.ok) return
        const data = await res.json()
        if (!alive) return
        const next = uploadPathToAdminUrl(
          data?.settings?.countryBranding?.AU?.logoUrl ||
            data?.settings?.logoAuUrl ||
            data?.settings?.countryBranding?.NZ?.logoUrl ||
            data?.settings?.logoNzUrl ||
            Object.values(data?.settings?.countryBranding || {}).find((e) => e?.logoUrl)?.logoUrl,
        )
        if (next) setLogo(next)
      } catch {
        // keep startup branding logo
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  return (
    <StyledLogo className={cssClass('Logo')} to="/admin" data-css="sidebar-logo">
      {logo ? <img src={logo} alt={companyName} className="admin-brand-logo" /> : <h1>{companyName}</h1>}
      <span>Admin</span>
    </StyledLogo>
  )
}
