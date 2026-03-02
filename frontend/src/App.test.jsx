// Finance App File: frontend\src\App.test.jsx
// Purpose: Frontend/support source file for the Finance app.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./shared/lib/auth.js', () => ({
  checkSession: vi.fn()
}));

vi.mock('./features/auth/LoginPage.jsx', () => ({
  default: () => <div>LoginPage</div>
}));
vi.mock('./features/dashboard/DashboardPage.jsx', () => ({
  default: () => <div>DashboardPage</div>
}));
vi.mock('./features/bills/WaterBillsPage.jsx', () => ({
  default: () => <div>WaterBillsPage</div>
}));
vi.mock('./features/bills/ElectricityBillsPage.jsx', () => ({
  default: () => <div>ElectricityBillsPage</div>
}));
vi.mock('./features/bills/WifiBillsPage.jsx', () => ({
  default: () => <div>WifiBillsPage</div>
}));
vi.mock('./features/bills/AssociationBillsPage.jsx', () => ({
  default: () => <div>AssociationBillsPage</div>
}));
vi.mock('./features/property/PropertyRecordsPage.jsx', () => ({
  default: () => <div>PropertyRecordsPage</div>
}));
vi.mock('./features/bills/RecordsPage.jsx', () => ({
  default: () => <div>RecordsPage</div>
}));

import App from './app/App.jsx';
import { checkSession } from './shared/lib/auth.js';

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
      <MemoryRouter initialEntries={[initialPath]}>
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
    checkSession.mockResolvedValue({ authenticated: true });
    renderApp('/records');

    await waitFor(() => {
      expect(screen.getByText('RecordsPage')).toBeInTheDocument();
    });
  });

  it('redirects root to dashboard for authenticated users', async () => {
    checkSession.mockResolvedValue({ authenticated: true });
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByText('DashboardPage')).toBeInTheDocument();
    });
  });
});
