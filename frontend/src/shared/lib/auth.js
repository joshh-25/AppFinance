// Finance App File: frontend\src\shared\lib\auth.js
// Purpose: Session check and authentication helpers.

const API_BASE = '/Finance/api.php';
const SESSION_CHECK_TIMEOUT_MS = 3500;
const SESSION_USERNAME_KEY = 'finance-session-username';

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

  if (authenticated && username !== '') {
    window.sessionStorage.setItem(SESSION_USERNAME_KEY, username);
  } else {
    window.sessionStorage.removeItem(SESSION_USERNAME_KEY);
  }

  return { authenticated, username };
}

export function getStoredSessionUsername() {
  return window.sessionStorage.getItem(SESSION_USERNAME_KEY) || '';
}
