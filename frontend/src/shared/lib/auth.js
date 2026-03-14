// Finance App File: frontend\src\shared\lib\auth.js
// Purpose: Session check and authentication helpers.

import { getRuntimeConfig } from './runtimeConfig.js';

const API_BASE = getRuntimeConfig().apiBase;
const SESSION_CHECK_TIMEOUT_MS = 3500;
const SESSION_USERNAME_KEY = 'finance-session-username';
const SESSION_ROLE_KEY = 'finance-session-role';

export async function checkSession() {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, SESSION_CHECK_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE}?action=session`, {
      method: 'GET',
      credentials: 'same-origin',
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Session check timed out.');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    throw new Error(payload?.message || 'Unable to verify session.');
  }

  const authenticated = payload.authenticated === true;
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const role = typeof payload.role === 'string' ? payload.role.trim() : '';

  if (authenticated && username !== '') {
    window.sessionStorage.setItem(SESSION_USERNAME_KEY, username);
  } else {
    window.sessionStorage.removeItem(SESSION_USERNAME_KEY);
  }

  if (authenticated && role !== '') {
    window.sessionStorage.setItem(SESSION_ROLE_KEY, role);
  } else {
    window.sessionStorage.removeItem(SESSION_ROLE_KEY);
  }

  return { authenticated, username, role };
}

export function getSessionQueryOptions(overrides = {}) {
  return {
    queryKey: ['session'],
    queryFn: checkSession,
    retry: false,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    ...overrides
  };
}

export function getStoredSessionUsername() {
  return window.sessionStorage.getItem(SESSION_USERNAME_KEY) || '';
}

export function getStoredSessionRole() {
  return window.sessionStorage.getItem(SESSION_ROLE_KEY) || '';
}

export function clearStoredSession() {
  window.sessionStorage.removeItem(SESSION_USERNAME_KEY);
  window.sessionStorage.removeItem(SESSION_ROLE_KEY);
}

export async function logout() {
  const { apiBase, loginPath } = getRuntimeConfig();
  const csrfResponse = await fetch(`${apiBase}?action=csrf`, {
    method: 'GET',
    credentials: 'same-origin'
  });
  const csrfPayload = await csrfResponse.json();
  if (!csrfResponse.ok || !csrfPayload?.csrf_token) {
    throw new Error('Failed to initialize logout security token.');
  }

  const response = await fetch(`${apiBase}?action=logout`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': String(csrfPayload.csrf_token)
    },
    body: JSON.stringify({})
  });
  const payload = await response.json();
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || 'Failed to log out.');
  }

  clearStoredSession();
  return String(payload?.login_path || loginPath);
}
