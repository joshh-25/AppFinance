// Finance App File: frontend\src\features\auth\LoginPage.jsx
// Purpose: Login page component.

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { checkSession } from '../../shared/lib/auth.js';

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

function UserFieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 18.2a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function PasswordFieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 10V7.8a3.5 3.5 0 1 1 7 0V10" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, isError, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: checkSession,
    retry: false
  });

  const authenticated = data?.authenticated === true;

  useEffect(() => {
    if (authenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [authenticated, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/Finance/api.php?action=login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, remember })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        setFormError('Incorrect username or password. Please try again.');
        return;
      }

      // Keep auth state synchronized with route guard to avoid stale redirects to /login.
      queryClient.setQueryData(['session'], {
        authenticated: true,
        username: String(result?.username || username || '').trim()
      });

      const session = await refetch();
      if (session.data?.authenticated === true) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setFormError('Session was not established. Please try again.');
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to sign in right now.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <header className="login-topbar">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            <FinanceBrandIcon />
          </span>
          <span>Finance</span>
        </div>
      </header>

      <section className="login-panel">
        <div className="login-card">
          <h1>Log in</h1>
          {isError && <p className="error">{error.message}</p>}
          {formError && (
            <p className="login-error-banner" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="username">Username or Email</label>
            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                <UserFieldIcon />
              </span>
              <input
                id="username"
                name="username"
                className="login-input login-input-with-icon"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon" aria-hidden="true">
                <PasswordFieldIcon />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input-with-icon"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="login-row">
              <label className="login-check">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Keep me logged in</span>
              </label>
              <button type="button" className="login-show-password-toggle" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
