import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpensesRecordsPage from '../ExpensesRecordsPage.jsx';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

let mockRole = 'viewer';
let mockUsername = 'QA User';
const expenseRows = [
  {
    id: 7,
    expense_date: '2026-03-01',
    payee: 'Metro Supply',
    category: 'Store Supplies',
    amount: '1200.00',
    payment: 'Cash',
    non_vat: 0,
    remarks: 'Restock'
  }
];

vi.mock('../../../shared/lib/auth.js', () => {
  const checkSession = vi.fn(async () => ({
    authenticated: true,
    username: mockUsername,
    role: mockRole
  }));

  return {
    checkSession,
    getSessionQueryOptions: vi.fn((overrides = {}) => ({
      queryKey: ['session'],
      queryFn: checkSession,
      retry: false,
      ...overrides
    })),
    getStoredSessionRole: vi.fn(() => mockRole),
    getStoredSessionUsername: vi.fn(() => mockUsername)
  };
});

vi.mock('../../../shared/lib/api.js', () => ({
  fetchExpenses: vi.fn(async (options = {}) => {
    if (options.includeMeta) {
      return {
        data: expenseRows,
        meta: {
          total: expenseRows.length,
          total_pages: 1,
          page: 1
        }
      };
    }

    return expenseRows;
  }),
  deleteExpense: vi.fn(async () => ({ success: true }))
}));

function renderWithProviders(initialEntries = ['/records/expenses']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries} future={ROUTER_FUTURE_FLAGS}>
        <ExpensesRecordsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ExpensesRecordsPage role-aware actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'viewer';
    mockUsername = 'QA User';
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps expense records read-only for non-admin users', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /back to entry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('shows expense record actions for admin users', async () => {
    mockRole = 'admin';

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to entry/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });
});
