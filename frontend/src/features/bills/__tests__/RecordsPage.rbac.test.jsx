import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecordsPage from '../RecordsPage.jsx';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

let mockRole = 'viewer';
let mockUsername = 'QA User';
const mergedRows = [
  {
    id: 101,
    property_list_id: 5,
    dd: '24 LPS 9PQ',
    property: 'Lafayette',
    due_period: '2026-03',
    unit_owner: 'Risty Durbin',
    water_bill_id: 301,
    water_account_no: 'W-12345',
    water_amount: '1500.00',
    water_due_date: '2026-03-28',
    water_payment_status: 'Unpaid'
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
  fetchMergedBills: vi.fn(async (options = {}) => {
    if (!options.includeMeta) {
      return mergedRows;
    }

    return {
      data: mergedRows,
      meta: {
        page: Number(options.page || 1),
        per_page: Number(options.perPage || mergedRows.length || 1),
        total: mergedRows.length,
        total_pages: 1
      }
    };
  })
}));

function renderWithProviders(initialEntries = ['/records/bills']) {
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
        <RecordsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function setPhoneViewport(enabled) {
  window.matchMedia = vi.fn((query) => ({
    matches: enabled && query === '(max-width: 760px)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }));
}

describe('RecordsPage RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'viewer';
    mockUsername = 'QA User';
    window.localStorage.clear();
    window.sessionStorage.clear();
    setPhoneViewport(false);
  });

  it('keeps the records workspace read-only for viewers', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByText('24 LPS 9PQ'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeDisabled();
    });

    expect(screen.getByRole('button', { name: /edit property/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /edit water/i })).toBeDisabled();
  });

  it('lets editors pick bill targets while keeping property edits disabled', async () => {
    mockRole = 'editor';

    renderWithProviders();

    await screen.findByText('24 LPS 9PQ');

    fireEvent.click(screen.getByText('24 LPS 9PQ'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeEnabled();
    });

    expect(screen.getByRole('button', { name: /edit property/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /edit water/i })).toBeEnabled();
  });

  it('renders mobile cards and a sticky action bar on phone widths', async () => {
    mockRole = 'editor';
    setPhoneViewport(true);

    renderWithProviders();

    expect(await screen.findByText('Lafayette')).toBeInTheDocument();
    expect(screen.getByText('Select a monthly record')).toBeInTheDocument();
    expect(screen.getByText('Property ID: 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    await waitFor(() => {
      expect(screen.getByText('Water ready to edit')).toBeInTheDocument();
    });
  });
});
