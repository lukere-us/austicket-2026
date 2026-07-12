import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cssClass } from '@adminjs/design-system'
import { styled } from '@adminjs/design-system/styled-components'
import { uploadPathToAdminUrl } from '../lib/adminBrandLogo.js'

const StyledLogo = styled(Link)`
  text-align: center;
  display: flex;
  align-content: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 24px 32px 32px;
  text-decoration: none;

  & > h1 {
    text-decoration: none;
    font-weight: 700;
    color: #3f3f46;
    font-size: 1.25rem;
    line-height: 1.35;
    margin: 0;
  }

  & > img {
    display: block;
    max-width: 170px;
    max-height: 52px;
    width: auto;
    height: auto;
    object-fit: contain;
  }

  &:hover h1 {
    color: #4268f6;
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
    </StyledLogo>
  )
}
