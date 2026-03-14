import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyRecordsPage from '../PropertyRecordsPage.jsx';
import { updatePropertyRecord } from '../../../shared/lib/api.js';
import { clearGlobalEditMode } from '../../../shared/lib/globalEditMode.js';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};
let mockRole = 'admin';
let mockUsername = 'QA User';

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
  createPropertyRecord: vi.fn(async () => ({ success: true })),
  updatePropertyRecord: vi.fn(async () => ({ success: true })),
  deletePropertyRecord: vi.fn(async () => ({ success: true })),
  fetchPropertyRecords: vi.fn(async () => [])
}));

function renderWithProviders(initialEntries = ['/property-records']) {
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
        <PropertyRecordsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PropertyRecordsPage context hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
    mockUsername = 'QA User';
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearGlobalEditMode();
  });

  it('prefers shared bill selection when direct selection is stale/empty', async () => {
    window.sessionStorage.setItem('finance:selected-property-record', JSON.stringify({}));
    window.sessionStorage.setItem(
      'finance-bill-selection:shared',
      JSON.stringify({
        form: {
          property_list_id: 1,
          dd: '24 LPS 9PQ',
          property: 'Lafayette',
          billing_period: '2026-03',
          unit_owner: 'Risty Durbin'
        }
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByLabelText('DD')).toHaveValue('24 LPS 9PQ');
      expect(screen.getByLabelText('Property')).toHaveValue('Lafayette');
      expect(screen.getByLabelText('Unit Owner')).toHaveValue('Risty Durbin');
    });
  });

  it('hydrates property edit mode from records edit context', async () => {
    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        property_list_id: 9,
        dd: 'Saint Honore',
        property: '21 SH NW 6A',
        due_period: '2026-02',
        unit_owner: 'Ernesto Tuvida',
        classification: 'Partnership',
        deposit: '0.00',
        rent: '0.00',
        per_property_status: 'Active',
        real_property_tax: '1250.00',
        rpt_payment_status: 'Paid',
        penalty: '0.00'
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByLabelText('DD')).toHaveValue('Saint Honore');
      expect(screen.getByLabelText('Property')).toHaveValue('21 SH NW 6A');
      expect(screen.getByLabelText('Unit Owner')).toHaveValue('Ernesto Tuvida');
      expect(screen.getByLabelText('Classification')).toHaveValue('Partnership');
      expect(screen.getByLabelText('Real Property Tax Amount')).toHaveValue('1250.00');
    });
  });

  it('uses the property record id when saving a records-scoped property edit', async () => {
    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        property_list_id: 9,
        editing_bill_id: 901,
        bill_type: 'water',
        dd: 'Saint Honore',
        property: '21 SH NW 6A',
        due_period: '2026-02',
        unit_owner: 'Ernesto Tuvida',
        classification: 'Partnership',
        deposit: '0.00',
        rent: '0.00',
        per_property_status: 'Active',
        real_property_tax: '1250.00',
        rpt_payment_status: 'Paid',
        penalty: '0.00'
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByLabelText('DD')).toHaveValue('Saint Honore');
    });

    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updatePropertyRecord).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          property_list_id: 9,
          dd: 'Saint Honore',
          property: '21 SH NW 6A'
        })
      );
    });
  });

  it('keeps property records read-only for non-admin users', async () => {
    mockRole = 'viewer';

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /go to bills/i })).not.toBeInTheDocument();
  });
});
