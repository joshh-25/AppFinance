import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PropertyRecordsPage from '../PropertyRecordsPage.jsx';
import { clearGlobalEditMode } from '../../../shared/lib/globalEditMode.js';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

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
});
