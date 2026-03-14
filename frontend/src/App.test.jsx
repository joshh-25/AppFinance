// Finance App File: frontend\src\App.test.jsx
// Purpose: Frontend/support source file for the Finance app.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./shared/lib/auth.js', () => {
  const checkSession = vi.fn();
  return {
    checkSession,
    getSessionQueryOptions: vi.fn((overrides = {}) => ({
      queryKey: ['session'],
      queryFn: checkSession,
      retry: false,
      ...overrides
    }))
  };
});

vi.mock('./shared/lib/runtimeConfig.js', () => ({
  getRuntimeConfig: () => ({
    apiBase: '/Finance/api.php',
    loginPath: '/login',
    logoutPath: '/logout.php',
    basePath: '/Finance'
  })
}));

vi.mock('./features/auth/LoginPage.jsx', () => ({
  default: () => <div>LoginPage</div>
}));
vi.mock('./features/dashboard/DashboardPage.jsx', () => ({
  default: () => <div>DashboardPage</div>
}));
vi.mock('./features/bills/PaymentFormPage.jsx', () => ({
  default: () => <div>PaymentFormPage</div>
}));
vi.mock('./features/bills/BillReviewPage.jsx', () => ({
  default: () => <div>BillReviewPage</div>
}));
vi.mock('./features/property/PropertyRecordsPage.jsx', () => ({
  default: () => <div>PropertyRecordsPage</div>
}));
vi.mock('./features/bills/RecordsPage.jsx', () => ({
  default: () => <div>BillsRecordsPage</div>
}));
vi.mock('./features/records/RecordsLandingPage.jsx', () => ({
  default: () => <div>RecordsLandingPage</div>
}));
vi.mock('./features/records/ExpensesRecordsPage.jsx', () => ({
  default: () => <div>ExpensesRecordsPage</div>
}));
vi.mock('./features/expenses/ExpensesPage.jsx', () => ({
  default: () => <div>ExpensesPage</div>
}));
vi.mock('./shared/components/AccessDeniedPage.jsx', () => ({
  default: () => <div>AccessDeniedPage</div>
}));

import App from './app/App.jsx';
import { checkSession } from './shared/lib/auth.js';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function renderApp(initialPath) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]} future={ROUTER_FUTURE_FLAGS}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('App routing guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login for protected routes', async () => {
    checkSession.mockResolvedValue({ authenticated: false });
    renderApp('/records');

    await waitFor(() => {
      expect(screen.getByText('LoginPage')).toBeInTheDocument();
    });
  });

  it('allows authenticated users into protected routes', async () => {
    checkSession.mockResolvedValue({ authenticated: true, role: 'viewer' });
    renderApp('/records');

    await waitFor(() => {
      expect(screen.getByText('RecordsLandingPage')).toBeInTheDocument();
    });
  });

  it('redirects root to dashboard for authenticated users', async () => {
    checkSession.mockResolvedValue({ authenticated: true, role: 'viewer' });
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByText('DashboardPage')).toBeInTheDocument();
    });
  });

  it('blocks viewer access to editor-only bill entry routes', async () => {
    checkSession.mockResolvedValue({ authenticated: true, role: 'viewer' });
    renderApp('/bills/water');

    await waitFor(() => {
      expect(screen.getByText('AccessDeniedPage')).toBeInTheDocument();
    });
  });

  it('blocks editor access to admin-only expense entry routes', async () => {
    checkSession.mockResolvedValue({ authenticated: true, role: 'editor' });
    renderApp('/expenses');

    await waitFor(() => {
      expect(screen.getByText('AccessDeniedPage')).toBeInTheDocument();
    });
  });

  it('allows admin access to admin-only expense entry routes', async () => {
    checkSession.mockResolvedValue({ authenticated: true, role: 'admin' });
    renderApp('/expenses');

    await waitFor(() => {
      expect(screen.getByText('ExpensesPage')).toBeInTheDocument();
    });
  });
});
