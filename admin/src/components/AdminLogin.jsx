import {
  Box,
  Button,
  FormGroup,
  Input,
  Label,
  MessageBox,
  Text,
} from '@adminjs/design-system'
import { styled } from '@adminjs/design-system/styled-components'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const THEME_COOKIE = 'aus_admin_theme'

function readStoredTheme() {
  try {
    const fromStorage = window.localStorage.getItem(THEME_COOKIE)
    if (fromStorage === 'dark' || fromStorage === 'light') return fromStorage
  } catch {
    // ignore
  }
  const match = String(document.cookie || '').match(/(?:^|;\s*)aus_admin_theme=([^;]*)/)
  if (match?.[1] === 'dark') return 'dark'
  return 'light'
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_COOKIE, theme)
  } catch {
    // ignore
  }
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`
  document.documentElement.dataset.adminTheme = theme
  document.documentElement.classList.toggle('admin-theme-dark', theme === 'dark')
  document.documentElement.classList.toggle('admin-theme-light', theme === 'light')
}

const Shell = styled(Box)`
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 28px 20px;
  position: relative;
  overflow: hidden;
  font-family: 'DM Sans', system-ui, sans-serif;
  background:
    radial-gradient(ellipse 80% 60% at 12% 18%, rgba(245, 158, 11, 0.18), transparent 55%),
    radial-gradient(ellipse 70% 50% at 88% 82%, rgba(14, 116, 144, 0.16), transparent 50%),
    linear-gradient(165deg, #071422 0%, #0f2744 42%, #132f52 72%, #0b1c33 100%);

  &.is-dark {
    background:
      radial-gradient(ellipse 70% 50% at 15% 20%, rgba(245, 158, 11, 0.12), transparent 55%),
      linear-gradient(165deg, #05080f 0%, #0b1220 45%, #111827 100%);
  }
`

const Atmosphere = styled.div`
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%);
`

const ThemeSwitch = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  cursor: pointer;
  backdrop-filter: blur(8px);

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  svg {
    width: 20px;
    height: 20px;
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

const Panel = styled(Box)`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 36px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.65) inset,
    0 24px 48px rgba(7, 20, 34, 0.35);

  .is-dark & {
    background: rgba(17, 24, 39, 0.96);
    border-color: rgba(148, 163, 184, 0.2);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    color: #f8fafc;
  }
`

const Brand = styled.div`
  text-align: center;
  margin-bottom: 28px;
`

const Logo = styled.img`
  display: block;
  margin: 0 auto 14px;
  max-width: 220px;
  max-height: 64px;
  width: auto;
  height: auto;
  object-fit: contain;
`

const BrandFallback = styled.h1`
  margin: 0 0 10px;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.65rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #0f2744;
  line-height: 1.15;

  .is-dark & {
    color: #f8fafc;
  }
`

const Eyebrow = styled.p`
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #b45309;

  .is-dark & {
    color: #fbbf24;
  }
`

const Title = styled.h2`
  margin: 8px 0 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f2744;
  line-height: 1.25;

  .is-dark & {
    color: #f8fafc;
  }
`

const Subtitle = styled(Text)`
  margin-top: 8px !important;
  color: #64748b !important;
  font-size: 14px !important;
  line-height: 1.5 !important;

  .is-dark & {
    color: #94a3b8 !important;
  }
`

const Field = styled(FormGroup)`
  margin-bottom: 16px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }

  .is-dark & label {
    color: #cbd5e1;
  }

  input {
    min-height: 46px;
    border-radius: 12px !important;
    border: 1px solid #d1d5db !important;
    background: #f8fafc !important;
    font-size: 15px !important;
    color: #0f172a !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

    &:focus {
      outline: none;
      border-color: #d97706 !important;
      background: #fff !important;
      box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18) !important;
    }
  }

  .is-dark & input {
    border-color: #334155 !important;
    background: #0b1220 !important;
    color: #f8fafc !important;

    &:focus {
      background: #111827 !important;
    }
  }
`

const Submit = styled(Button)`
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  border-radius: 12px !important;
  background: #0f2744 !important;
  border: 0 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: #163456 !important;
    transform: translateY(-1px);
  }

  .is-dark & {
    background: #d97706 !important;
    color: #0b1220 !important;

    &:hover {
      background: #f59e0b !important;
    }
  }
`

const Foot = styled.p`
  margin: 22px 0 0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
`

const Login = () => {
  const props = window.__APP_STATE__ || {}
  const { action, errorMessage: message } = props
  const branding = useSelector((state) => state.branding) || {}
  const [submitting, setSubmitting] = useState(false)
  const [theme, setTheme] = useState('light')
  const companyName = branding.companyName || 'AUS Ticket Lanka'
  const isDark = theme === 'dark'

  useEffect(() => {
    const next = readStoredTheme()
    setTheme(next)
    persistTheme(next)
  }, [])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setTheme(next)
    persistTheme(next)
  }

  return (
    <Shell className={`login__Wrapper admin-login${isDark ? ' is-dark' : ''}`}>
      <Atmosphere aria-hidden />
      <ThemeSwitch type="button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title={isDark ? 'Light mode' : 'Dark mode'}>
        {isDark ? <SunIcon /> : <MoonIcon />}
      </ThemeSwitch>
      <Panel
        as="form"
        action={action}
        method="POST"
        onSubmit={() => setSubmitting(true)}
        className="admin-login__panel"
      >
        <Brand>
          {branding.logo ? (
            <Logo src={branding.logo} alt={companyName} />
          ) : (
            <BrandFallback>{companyName}</BrandFallback>
          )}
          <Eyebrow>Staff access</Eyebrow>
          <Title>Sign in to admin</Title>
          <Subtitle>
            Manage listings, site settings, and bookings for {companyName}.
          </Subtitle>
        </Brand>

        {message ? (
          <MessageBox
            my="lg"
            message={String(message)}
            variant="danger"
            style={{ borderRadius: 12 }}
          />
        ) : null}

        <Field>
          <Label required>Email</Label>
          <Input name="email" type="email" placeholder="you@example.com" autoComplete="username" />
        </Field>
        <Field>
          <Label required>Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            autoComplete="current-password"
          />
        </Field>

        <Submit variant="contained" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Submit>

        <Foot>Authorized administrators only</Foot>
      </Panel>
    </Shell>
  )
}

export default Login
