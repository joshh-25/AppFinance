// Finance App File: frontend\src\features\auth\LoginPage.jsx
// Purpose: Login page component.

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { checkSession } from '../../shared/lib/auth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" />
            </svg>
          </span>
          <span>Finance</span>
        </div>
      </header>

      <section className="login-panel">
        <div className="login-card">
          <h1>Log in</h1>
          <p>Sign in to your Finance account.</p>

          {isLoading && <p className="muted-text">Checking current session...</p>}
          {isError && <p className="error">{error.message}</p>}
          {formError && (
            <p className="login-error-banner" role="alert">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="username">Username or Email</label>
            <input
              id="username"
              name="username"
              className="login-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
            />

            <div className="login-password-label-row">
              <label htmlFor="password">Password</label>
              <button type="button" className="login-link-btn" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="login-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />

            <div className="login-row">
              <label className="login-check">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Keep me logged in</span>
              </label>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="login-meta">
            <span className="muted-text">Contact your administrator to reset your password.</span>
          </p>
        </div>
      </section>
    </main>
  );
}
