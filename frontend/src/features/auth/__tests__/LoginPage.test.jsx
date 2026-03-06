// Finance App File: frontend\src\features\auth\__tests__\LoginPage.test.jsx
// Purpose: Tests for the login page component.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../LoginPage.jsx';
import { checkSession } from '../../../shared/lib/auth.js';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

vi.mock('../../../shared/lib/auth.js', () => ({
  checkSession: vi.fn()
}));

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSession.mockResolvedValue({ authenticated: false });
  });

  it('renders login form content', async () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(checkSession).toHaveBeenCalled();
    });
  });
});
