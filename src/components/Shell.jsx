import { Suspense, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { NAV, PRODUCT } from '../config/product.js'
import { selectActiveProfile } from '../store/selectors.js'
import { selectProfile } from '../store/profilesSlice.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { PWAInstallPrompt } from './PWAInstallPrompt.jsx'
import { PageSkeleton } from './States.jsx'

function ProfileSwitcher() {
  const dispatch = useDispatch()
  const ids = useSelector((s) => s.profiles.ids)
  const byId = useSelector((s) => s.profiles.byId)
  const selectedId = useSelector((s) => s.profiles.selectedId)
  const switching = useSelector((s) => s.profiles.switching)
  const profile = useSelector(selectActiveProfile)

  if (!profile) return null
  if (ids.length < 2) {
    return (
      <div className="profile-chip">
        <span className="eyebrow">Workspace</span>
        <strong>{profile.name}</strong>
        {profile.country ? <span className="muted small">{profile.country}</span> : null}
      </div>
    )
  }
  return (
    <div className="profile-chip">
      <label className="eyebrow" htmlFor="profile-switcher">
        Workspace
      </label>
      <div className="select-wrap select-wrap-dark">
        <select
          id="profile-switcher"
          value={selectedId}
          disabled={switching}
          onChange={(e) => dispatch(selectProfile(e.target.value))}
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {byId[id]?.name || id}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function Shell() {
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const first = useRef(true)

  // Move to the top and focus the page on navigation so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  const mobileItems = NAV.flatMap((g) => g.items).filter((i) => i.to !== '/settings')

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className="sidebar">
        <Link to="/" className="brand" aria-label={`${PRODUCT.name} home`}>
          <Logo />
          <span className="brand-name">{PRODUCT.name}</span>
        </Link>
        <nav aria-label="Primary" className="nav">
          {NAV.map((group, i) => (
            <div className="nav-group" key={group.group || i}>
              {group.group ? <p className="nav-heading">{group.group}</p> : null}
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" title={item.label}>
                  <Icon name={item.icon} />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <ProfileSwitcher />
      </aside>

      <header className="topbar">
        <Link to="/" className="brand" aria-label={`${PRODUCT.name} home`}>
          <Logo size={26} />
          <span className="brand-name">{PRODUCT.name}</span>
        </Link>
        <NavLink to="/settings" className="topbar-settings" aria-label="Settings">
          <Icon name="settings" size={20} />
        </NavLink>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <div className="page-enter" key={pathname}>
              <Outlet />
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>

      <PWAInstallPrompt />

      <nav className="tabbar" aria-label="Primary">
        {mobileItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tab">
            <Icon name={item.icon} size={20} />
            <span>{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
