// Finance App File: frontend\src\App.test.jsx
// Purpose: Frontend/support source file for the Finance app.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/auth.js', () => ({
  checkSession: vi.fn()
}));

vi.mock('./pages/LoginPage.jsx', () => ({
  default: () => <div>LoginPage</div>
}));
vi.mock('./pages/DashboardPage.jsx', () => ({
  default: () => <div>DashboardPage</div>
}));
vi.mock('./pages/WaterBillsPage.jsx', () => ({
  default: () => <div>WaterBillsPage</div>
}));
vi.mock('./pages/ElectricityBillsPage.jsx', () => ({
  default: () => <div>ElectricityBillsPage</div>
}));
vi.mock('./pages/WifiBillsPage.jsx', () => ({
  default: () => <div>WifiBillsPage</div>
}));
vi.mock('./pages/AssociationBillsPage.jsx', () => ({
  default: () => <div>AssociationBillsPage</div>
}));
vi.mock('./pages/PropertyRecordsPage.jsx', () => ({
  default: () => <div>PropertyRecordsPage</div>
}));
vi.mock('./pages/RecordsPage.jsx', () => ({
  default: () => <div>RecordsPage</div>
}));

import App from './App.jsx';
import { checkSession } from './lib/auth.js';

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
