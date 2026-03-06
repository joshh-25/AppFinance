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

const BILLINGS_ENTRY_PATH = '/bills/wifi';

function FinanceBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2V8z"
      />
      <rect x="4" y="9" width="16" height="10" rx="2" />
      <circle cx="16.2" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SidebarNavIcon({ item }) {
  if (item === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4" y="4" width="7" height="7" rx="1.6" />
        <rect x="13" y="4" width="7" height="5" rx="1.4" />
        <rect x="13" y="11" width="7" height="9" rx="1.6" />
        <rect x="4" y="13" width="7" height="7" rx="1.6" />
      </svg>
    );
  }
  if (item === 'records') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4.5" y="4" width="15" height="16" rx="2.2" />
        <path strokeLinecap="round" d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (item === 'billings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2.5L5.8 12H12l-1 9.5L18.2 12H12.8L13 2.5z" />
      </svg>
    );
  }
  if (item === 'review') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4.5" y="4" width="15" height="16" rx="2.2" />
        <path strokeLinecap="round" d="M8 9h8M8 13h6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16.5l2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2V8z"
      />
      <rect x="4" y="9" width="16" height="10" rx="2" />
      <circle cx="16.2" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
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
  subtitle = '',
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

  function billingsLinkClass() {
    const path = location.pathname;
    const isBillingsPath =
      path.startsWith('/property-records') ||
      (path.startsWith('/bills/') && path !== '/bills/review');
    return isBillingsPath
      ? 'shell-nav-link active'
      : 'shell-nav-link';
  }

  function billReviewLinkClass() {
    return location.pathname === '/bills/review'
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

  const currentPath = location.pathname;
  const isBillsModulePath = currentPath.startsWith('/bills/');
  const isExpensesModulePath = currentPath === '/expenses' || currentPath.startsWith('/records/expenses');
  const isRecordsModulePath = currentPath.startsWith('/records');
  const isPropertyRecordsModulePath = currentPath.startsWith('/property-records');
  const transitionLayerKey = isBillsModulePath
    ? 'bills-module'
    : isExpensesModulePath
      ? 'expenses-module'
      : isRecordsModulePath
        ? 'records-module'
        : isPropertyRecordsModulePath
          ? 'property-records-module'
          : `${currentPath}${location.search}`;
  const hasStableModuleTransition =
    isBillsModulePath || isExpensesModulePath || isRecordsModulePath || isPropertyRecordsModulePath;

  return (
    <div className="shell">
      {isSidebarOpen && (
        <button
          type="button"
          className="shell-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside className={`shell-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="shell-sidebar-glow" aria-hidden="true" />
        <div className="brand-wrap">
          <Link
            to="/dashboard"
            className="brand brand-link"
            onClick={(event) => handleNavigation(event, '/dashboard')}
          >
            <div className="brand-mark" aria-hidden="true">
              <FinanceBrandIcon />
            </div>
            <h2>Finance</h2>
          </Link>
        </div>
        <nav className="shell-nav">
          <p className="shell-nav-label">Modules</p>
          <NavLink to="/dashboard" className={navClassName} onClick={(event) => handleNavigation(event, '/dashboard')}>
            <span className="shell-nav-item">
              <span className="shell-nav-icon" aria-hidden="true">
                <SidebarNavIcon item="dashboard" />
              </span>
              <span>Dashboard</span>
            </span>
          </NavLink>
          <NavLink to="/records" className={navClassName} onClick={(event) => handleNavigation(event, '/records')}>
            <span className="shell-nav-item">
              <span className="shell-nav-icon" aria-hidden="true">
                <SidebarNavIcon item="records" />
              </span>
              <span>Records</span>
            </span>
          </NavLink>
          <Link
            to={BILLINGS_ENTRY_PATH}
            className={billingsLinkClass()}
            onClick={(event) => handleNavigation(event, BILLINGS_ENTRY_PATH)}
          >
            <span className="shell-nav-item">
              <span className="shell-nav-icon" aria-hidden="true">
                <SidebarNavIcon item="billings" />
              </span>
              <span>Billings</span>
            </span>
          </Link>
          <Link
            to="/bills/review"
            className={billReviewLinkClass()}
            onClick={(event) => handleNavigation(event, '/bills/review')}
          >
            <span className="shell-nav-item">
              <span className="shell-nav-icon" aria-hidden="true">
                <SidebarNavIcon item="review" />
              </span>
              <span>Bills Review</span>
            </span>
          </Link>
          <NavLink to="/expenses" className={navClassName} onClick={(event) => handleNavigation(event, '/expenses')}>
            <span className="shell-nav-item">
              <span className="shell-nav-icon" aria-hidden="true">
                <SidebarNavIcon item="expenses" />
              </span>
              <span>Expenses</span>
            </span>
          </NavLink>
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
            {subtitle ? <p className="shell-subtitle">{subtitle}</p> : null}
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
                    <path
                      strokeLinecap="round"
                      d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"
                    />
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
        {/* The 'no-transition' class is added for stable modules to disable global fade-in animations that would move the card */}
        <div
          key={transitionLayerKey}
          className={`route-transition-layer ${hasStableModuleTransition ? 'no-transition' : ''}`.trim()}
        >
          <div
            className="route-transition-content"
            style={isLockScrollLayout && lockContentHeight !== null ? { height: `${lockContentHeight}px` } : undefined}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </section>
    </div>
  );
}
