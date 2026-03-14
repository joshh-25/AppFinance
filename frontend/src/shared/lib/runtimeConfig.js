function normalizeBasePath(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === '' || trimmed === '/') {
    return '';
  }

  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.replace(/\/+$/, '');
}

export function getRuntimeConfig() {
  const runtime = typeof window !== 'undefined' && window.__FINANCE_CONFIG__ ? window.__FINANCE_CONFIG__ : {};
  const isDev = Boolean(import.meta.env.DEV);
  const fallbackBasePath = isDev ? '' : '/Finance';
  const fallbackApiBase = isDev ? '/Finance/api.php' : '/Finance/api.php';
  const fallbackLoginPath = isDev ? '/login' : '/Finance/login';
  const fallbackLogoutPath = isDev ? '/Finance/logout.php' : '/Finance/logout.php';
  const basePath = normalizeBasePath(runtime.basePath || fallbackBasePath);
  const rootPath = basePath || '';

  return {
    basePath,
    apiBase: String(runtime.apiBase || (rootPath !== '' ? `${rootPath}/api.php` : fallbackApiBase)),
    loginPath: String(runtime.loginPath || (rootPath !== '' ? `${rootPath}/login` : fallbackLoginPath)),
    logoutPath: String(runtime.logoutPath || (rootPath !== '' ? `${rootPath}/logout.php` : fallbackLogoutPath)),
  };
}
