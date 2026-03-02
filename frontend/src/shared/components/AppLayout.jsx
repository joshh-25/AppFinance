// Finance App File: frontend\src\components\AppLayout.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getStoredSessionUsername } from '../lib/auth.js';
import ErrorBoundary from './ErrorBoundary.jsx';

const THEME_KEY = 'finance-theme';

function navClassName({ isActive }) {
  return isActive ? 'shell-nav-link active' : 'shell-nav-link';
}

function getUserInitials(name) {
  const normalized = String(name || '').trim();
  if (normalized === '') {
    return 'US';
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  const compact = parts[0].replace(/[^a-z0-9]/gi, '');
  if (compact.length >= 2) {
    return compact.slice(0, 2).toUpperCase();
  }

  return compact.charAt(0).toUpperCase() || 'US';
}

export default function AppLayout({
  title,
  subtitle = 'Manage your utility payments securely.',
  children,
  contentClassName = '',
  onNavigateAttempt = null
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lockContentHeight, setLockContentHeight] = useState(null);
  const [displayName, setDisplayName] = useState(() => {
    const stored = getStoredSessionUsername().trim();
    return stored === '' ? 'User' : stored;
  });
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme === 'dark' || htmlTheme === 'light') {
      return htmlTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const stored = getStoredSessionUsername().trim();
    setDisplayName(stored === '' ? 'User' : stored);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname, location.search]);

  const isLockScrollLayout = contentClassName.split(/\s+/).includes('shell-content-lock-scroll');

  useLayoutEffect(() => {
    if (!isLockScrollLayout) {
      setLockContentHeight(null);
      return undefined;
    }

    const measureLayout = () => {
      const headerNode = headerRef.current;
      if (!headerNode) {
        return;
      }
      const computed = window.getComputedStyle(headerNode);
      const marginBottom = Number.parseFloat(computed.marginBottom || '0') || 0;
      const availableHeight = Math.max(0, Math.floor(window.innerHeight - headerNode.offsetHeight - marginBottom));
      setLockContentHeight(availableHeight);
    };

    measureLayout();
    window.addEventListener('resize', measureLayout);
    return () => {
      window.removeEventListener('resize', measureLayout);
    };
  }, [isLockScrollLayout, location.pathname, location.search, theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  function toggleSidebar() {
    setIsSidebarOpen((current) => !current);
  }

  function billLinkClass(path) {
    return location.pathname === path || location.pathname === `${path}/list`
      ? 'shell-nav-link active'
      : 'shell-nav-link';
  }

  async function handleNavigation(event, to) {
    if (!onNavigateAttempt) {
      setIsSidebarOpen(false);
      return;
    }

    event.preventDefault();
    const allow = await onNavigateAttempt(to);
    if (allow) {
      setIsSidebarOpen(false);
      navigate(to);
    }
  }

  return (
    <div className="shell">
      {isSidebarOpen && <button type="button" className="shell-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu" />}
      <aside className={`shell-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="shell-sidebar-glow" aria-hidden="true" />
        <div className="brand-wrap">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" />
              </svg>
            </div>
            <h2>Finance</h2>
          </div>
        </div>
        <nav className="shell-nav">
          <p className="shell-nav-label">Modules</p>
          <NavLink to="/dashboard" className={navClassName} onClick={(event) => handleNavigation(event, '/dashboard')}>Dashboard</NavLink>
          <NavLink to="/records" className={navClassName} onClick={(event) => handleNavigation(event, '/records')}>Records</NavLink>
          <NavLink to="/property-records" className={navClassName} onClick={(event) => handleNavigation(event, '/property-records')}>Property Records</NavLink>
          <p className="shell-nav-label">Bills</p>
          <Link to="/bills/wifi" className={billLinkClass('/bills/wifi')} onClick={(event) => handleNavigation(event, '/bills/wifi')}>WiFi Bills</Link>
          <Link to="/bills/water" className={billLinkClass('/bills/water')} onClick={(event) => handleNavigation(event, '/bills/water')}>Water Bills</Link>
          <Link to="/bills/electricity" className={billLinkClass('/bills/electricity')} onClick={(event) => handleNavigation(event, '/bills/electricity')}>Electricity Bills</Link>
          <Link to="/bills/association" className={billLinkClass('/bills/association')} onClick={(event) => handleNavigation(event, '/bills/association')}>Association Bills</Link>
        </nav>
        <a href="/Finance/logout.php" className="shell-user">
          <div className="shell-user-avatar">{getUserInitials(displayName)}</div>
          <div className="shell-user-meta">
            <p className="shell-user-name">{displayName}</p>
            <p className="shell-user-link">Log out</p>
          </div>
        </a>
      </aside>

      <section className={`shell-content ${contentClassName}`.trim()}>
        <header ref={headerRef} className="shell-header">
          <div className="shell-header-title">
            <button type="button" className="shell-menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
              <span />
              <span />
              <span />
            </button>
            <h1>{title}</h1>
            <p className="shell-subtitle">{subtitle}</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-theme btn-secondary"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
                  </svg>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                  </svg>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Stable keys for modules ensures the outer card container stays permanently mounted during sub-navigation */}
        <div
          key={
            location.pathname.startsWith('/bills/') ? 'bills-module' :
              location.pathname.startsWith('/records') ? 'records-module' :
                location.pathname.startsWith('/property-records') ? 'property-records-module' :
                  `${location.pathname}${location.search}`
          }
          className="route-transition-layer"
        >
          <div
            className="route-transition-content"
            style={isLockScrollLayout && lockContentHeight !== null ? { height: `${lockContentHeight}px` } : undefined}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </section>
    </div>
  );
}
