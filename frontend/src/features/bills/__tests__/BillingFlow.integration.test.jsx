// Finance App File: frontend\src\features\bills\__tests__\BillingFlow.integration.test.jsx
// Purpose: Integration-style tests for critical monthly billing flows.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterBillsPage from '../WaterBillsPage.jsx';
import WifiBillsPage from '../WifiBillsPage.jsx';
import ElectricityBillsPage from '../ElectricityBillsPage.jsx';
import AssociationBillsPage from '../AssociationBillsPage.jsx';
import RecordsPage from '../RecordsPage.jsx';
import BillReviewPage from '../BillReviewPage.jsx';
import DashboardPage from '../../dashboard/DashboardPage.jsx';
import { clearGlobalEditMode } from '../../../shared/lib/globalEditMode.js';
import {
  createBill,
  fetchBills,
  fetchDashboardSummary,
  fetchMergedBills,
  fetchOcrHealth,
  fetchPropertyRecords,
  fetchReviewQueueRows,
  fetchReviewQueueSummary,
  lookupPropertyByAccountNumber,
  replaceReviewQueueRows,
  updateBill,
  uploadBill
} from '../../../shared/lib/api.js';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

let mockBills = [];
let mockPropertyRecords = [];
let mockReviewQueueRows = [];
let mockReviewQueueSummary = {
  total: 0,
  ready: 0,
  needs_review: 0,
  scan_failed: 0,
  save_failed: 0,
  saved: 0
};
let nextBillId = 1;
let mockRole = 'admin';
let mockUsername = 'QA User';

function summarizeMockReviewQueue(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      const status = String(row?.status || '').trim();
      if (Object.prototype.hasOwnProperty.call(acc, status)) {
        acc[status] += 1;
      }
      return acc;
    },
    {
      total: 0,
      ready: 0,
      needs_review: 0,
      scan_failed: 0,
      save_failed: 0,
      saved: 0
    }
  );
}

function normalizeMockAmount(value) {
  const text = String(value ?? '').trim();
  if (text === '') {
    return 0;
  }
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMockPaidStatus(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (normalized === '') {
    return false;
  }
  return normalized === 'paid' || normalized === 'settled' || normalized === 'completed';
}

function computeMockPending(row) {
  return [
    ['wifi_amount', 'wifi_payment_status'],
    ['water_amount', 'water_payment_status'],
    ['electricity_amount', 'electricity_payment_status'],
    ['association_dues', 'association_payment_status']
  ].reduce((sum, [amountField, statusField]) => {
    const amount = normalizeMockAmount(row[amountField]);
    if (amount <= 0) {
      return sum;
    }
    return isMockPaidStatus(row[statusField]) ? sum : sum + amount;
  }, 0);
}

function computeMockTotal(row) {
  return ['wifi_amount', 'water_amount', 'electricity_amount', 'association_dues'].reduce(
    (sum, field) => sum + normalizeMockAmount(row[field]),
    0
  );
}

function buildMergedRowsFromMockBills() {
  const groups = {};
  for (const row of mockBills) {
    const duePeriod = String(row.due_period || '').trim();
    const dd = String(row.dd || '').trim();
    const property = String(row.property || '').trim();
    const key = `${Number(row.property_list_id || 0)}|${duePeriod.toLowerCase()}|${dd.toLowerCase()}|${property.toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = {
        id: Number(row.id || 0),
        property_list_id: Number(row.property_list_id || 0),
        dd,
        property,
        due_period: duePeriod,
        bill_type: String(row.bill_type || 'water').trim().toLowerCase(),
        unit_owner: row.unit_owner || '',
        classification: row.classification || '',
        deposit: row.deposit || '',
        rent: row.rent || '',
        internet_provider: '',
        internet_account_no: '',
        wifi_amount: '',
        wifi_due_date: '',
        wifi_payment_status: '',
        water_account_no: '',
        water_amount: '',
        water_due_date: '',
        water_payment_status: '',
        electricity_account_no: '',
        electricity_amount: '',
        electricity_due_date: '',
        electricity_payment_status: '',
        association_dues: '',
        association_due_date: '',
        association_payment_status: '',
        real_property_tax: row.real_property_tax || '',
        rpt_payment_status: row.rpt_payment_status || '',
        penalty: row.penalty || '',
        per_property_status: row.per_property_status || '',
        water_bill_id: 0,
        electricity_bill_id: 0,
        internet_bill_id: 0,
        association_bill_id: 0
      };
    }

    const target = groups[key];
    if (Number(target.id || 0) <= 0) {
      target.id = Number(row.id || 0);
    }
    Object.keys(target).forEach((field) => {
      if (row[field] !== undefined && row[field] !== '') {
        target[field] = row[field];
      }
    });

    const monthlyId = Number(target.id || row.id || 0);
    const hasInternetData = [row.internet_provider, row.internet_account_no, row.wifi_amount, row.wifi_due_date, row.wifi_payment_status].some(
      (value) => String(value || '').trim() !== ''
    );
    const hasWaterData = [row.water_account_no, row.water_amount, row.water_due_date, row.water_payment_status].some(
      (value) => String(value || '').trim() !== ''
    );
    const hasElectricityData = [
      row.electricity_account_no,
      row.electricity_amount,
      row.electricity_due_date,
      row.electricity_payment_status
    ].some((value) => String(value || '').trim() !== '');
    const hasAssociationData = [row.association_dues, row.association_due_date, row.association_payment_status].some(
      (value) => String(value || '').trim() !== ''
    );
    target.water_bill_id = hasWaterData ? monthlyId : 0;
    target.electricity_bill_id = hasElectricityData ? monthlyId : 0;
    target.internet_bill_id = hasInternetData ? monthlyId : 0;
    target.association_bill_id = hasAssociationData ? monthlyId : 0;
  }

  return Object.values(groups);
}

function buildDashboardSummaryFromMockBills() {
  const mergedRows = buildMergedRowsFromMockBills();
  const currentDuePeriod = new Date().toISOString().slice(0, 7);
  const currentRows = mergedRows.filter((row) => String(row.due_period || '').trim() === currentDuePeriod);

  return {
    current_due_period: currentDuePeriod,
    current_period_count: currentRows.length,
    total_billed: currentRows.reduce((sum, row) => sum + computeMockTotal(row), 0),
    pending_collections: currentRows.reduce((sum, row) => sum + computeMockPending(row), 0),
    unpaid_count: currentRows.filter((row) => computeMockPending(row) > 0).length,
    recent_rows: mergedRows.slice(0, 8)
  };
}

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
  fetchBills: vi.fn(async (options = {}) => {
    const search = String(options.search || '')
      .trim()
      .toLowerCase();
    const billType = String(options.billType || '')
      .trim()
      .toLowerCase();
    const includeMeta = Boolean(options.includeMeta);
    const page = Math.max(1, Number(options.page || 1));
    const perPage = Math.max(1, Number(options.perPage || 10));

    let rows = [...mockBills];
    if (billType) {
      rows = rows.filter(
        (row) =>
          String(row.bill_type || '')
            .trim()
            .toLowerCase() === billType
      );
    }
    if (search) {
      rows = rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(search)
        )
      );
    }

    if (!includeMeta) {
      return rows;
    }

    const offset = (page - 1) * perPage;
    const pagedRows = rows.slice(offset, offset + perPage);
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    return {
      data: pagedRows,
      meta: {
        page,
        per_page: perPage,
        total: rows.length,
        total_pages: totalPages
      }
    };
  }),
  fetchPropertyRecords: vi.fn(async () => mockPropertyRecords),
  fetchOcrHealth: vi.fn(async () => ({ success: true, healthy: true, message: 'ok' })),
  fetchReviewQueueRows: vi.fn(async () => mockReviewQueueRows),
  replaceReviewQueueRows: vi.fn(async (rows) => {
    mockReviewQueueRows = rows.map((row) => JSON.parse(JSON.stringify(row)));
    mockReviewQueueSummary = summarizeMockReviewQueue(mockReviewQueueRows);
    return mockReviewQueueRows;
  }),
  fetchReviewQueueSummary: vi.fn(async () => mockReviewQueueSummary),
  fetchDashboardSummary: vi.fn(async () => buildDashboardSummaryFromMockBills()),
  fetchMergedBills: vi.fn(async (options = {}) => {
    const includeMeta = Boolean(options.includeMeta);
    const page = Math.max(1, Number(options.page || 1));
    const perPage = Math.max(1, Number(options.perPage || 10));
    const search = String(options.search || '')
      .trim()
      .toLowerCase();
    const duePeriod = String(options.duePeriod || '').trim();

    let rows = buildMergedRowsFromMockBills();
    if (duePeriod !== '') {
      rows = rows.filter((row) => String(row.due_period || '').trim() === duePeriod);
    }
    if (search !== '') {
      rows = rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(search)
        )
      );
    }

    if (!includeMeta) {
      return rows;
    }

    const offset = (page - 1) * perPage;
    const pagedRows = rows.slice(offset, offset + perPage);
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    return {
      data: pagedRows,
      meta: {
        page,
        per_page: perPage,
        total: rows.length,
        total_pages: totalPages
      }
    };
  }),
  createBill: vi.fn(async (payload) => {
    const propertyListId = Number(payload.property_list_id || 0);
    const duePeriod = String(payload.due_period || '').trim();
    const existingIndex = mockBills.findIndex(
      (row) => Number(row.property_list_id || 0) === propertyListId && String(row.due_period || '').trim() === duePeriod
    );

    if (existingIndex >= 0) {
      const existing = mockBills[existingIndex];
      mockBills = mockBills.map((row, index) => (index === existingIndex ? { ...existing, ...payload } : row));
      return {
        success: true,
        message: 'An existing monthly record was updated for this property and due period.',
        data: { id: Number(existing.id || 0) }
      };
    }

    const row = {
      id: nextBillId++,
      ...payload
    };
    mockBills = [row, ...mockBills];
    return { success: true, message: 'Bill entry saved successfully.', data: { id: row.id } };
  }),
  updateBill: vi.fn(async (id, payload) => {
    mockBills = mockBills.map((row) => (Number(row.id) === Number(id) ? { ...row, ...payload } : row));
    return { success: true, message: 'Bill record updated successfully.', data: { id } };
  }),
  uploadBill: vi.fn(async () => ({ success: true, data: {} })),
  lookupPropertyByAccountNumber: vi.fn(async () => {
    throw new Error('No matching property found for this account number.');
  })
}));

function renderWithProviders(ui, initialEntries = ['/']) {
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
        {ui}
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

describe('Billing flow integration coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'admin';
    mockUsername = 'QA User';
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearGlobalEditMode();

    mockBills = [];
    mockPropertyRecords = [
      {
        id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        unit_owner: 'Risty Durbin'
      }
    ];
    mockReviewQueueRows = [];
    mockReviewQueueSummary = {
      total: 0,
      ready: 0,
      needs_review: 0,
      scan_failed: 0,
      save_failed: 0,
      saved: 0
    };
    setPhoneViewport(false);
    nextBillId = 100;
    lookupPropertyByAccountNumber.mockImplementation(async () => {
      throw new Error('No matching property found for this account number.');
    });
  });

  it('creates a water bill and surfaces it in Records water view', async () => {
    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    await waitFor(() => {
    expect(fetchPropertyRecords).toHaveBeenCalled();
  });
    const propertyInput = await screen.findByLabelText('Property / DD');
    fireEvent.change(propertyInput, { target: { value: 'Lafayette' } });

    fireEvent.change(screen.getByLabelText('Water Account No.'), { target: { value: 'WTR-001' } });
    fireEvent.change(screen.getByLabelText('Water'), { target: { value: '1200' } });
    fireEvent.change(screen.getByLabelText('Due Date Water'), { target: { value: '2026-03-27' } });
    fireEvent.change(screen.getByLabelText('Payment Status Water'), { target: { value: 'Unpaid' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createBill).toHaveBeenCalledTimes(1);
    });

    paymentView.unmount();

    renderWithProviders(<RecordsPage />, ['/records?bill=water']);

    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(await screen.findByText('WTR-001')).toBeInTheDocument();
  });

  it('updates selected water row for the same property', async () => {
    mockBills = [
      {
        id: 201,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        water_account_no: 'WTR-001',
        water_amount: '100',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      },
      {
        id: 202,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        water_account_no: 'WTR-001',
        water_amount: '200',
        water_due_date: '2026-03-20',
        water_payment_status: 'Unpaid'
      }
    ];

    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        editing_bill_id: 202,
        water_bill_id: 202,
        electricity_bill_id: 202,
        internet_bill_id: 202,
        association_bill_id: 202,
        water_account_no: 'WTR-001',
        water_amount: '200',
        water_due_date: '2026-03-20',
        water_payment_status: 'Unpaid'
      })
    );

    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    const waterAmountInput = await screen.findByLabelText('Water');
    await waitFor(() => {
      expect(waterAmountInput).toHaveValue('200');
    });

    fireEvent.change(waterAmountInput, { target: { value: '250' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(updateBill).toHaveBeenCalledTimes(1);
    });

    const [updatedId, updatedPayload] = updateBill.mock.calls[0];
    expect(updatedId).toBe(202);
    expect(updatedPayload.target_dd).toBe('24 LPS 9PQ');
    expect(updatedPayload.target_property).toBe('Lafayette');

    paymentView.unmount();

    renderWithProviders(<RecordsPage />, ['/records?bill=water']);

    const rowsWithLafayette = await screen.findAllByText('Lafayette');
    expect(rowsWithLafayette.length).toBeGreaterThan(0);
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('requires an explicit edit section for multi-module monthly records', async () => {
    mockBills = [
      {
        id: 401,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        water_account_no: 'WTR-401',
        water_amount: '900',
        water_due_date: '2026-03-10',
        water_payment_status: 'Unpaid'
      },
      {
        id: 402,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'electricity',
        electricity_account_no: 'ELEC-402',
        electricity_amount: '1900',
        electricity_due_date: '2026-03-11',
        electricity_payment_status: 'Unpaid'
      }
    ];

    renderWithProviders(<RecordsPage />, ['/records?bill=all']);

    const propertyCell = await screen.findByText('Lafayette');
    fireEvent.click(propertyCell.closest('tr'));
    const editButton = screen.getByRole('button', { name: 'Edit' });
    expect(editButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Electricity' }));
    expect(editButton).toBeEnabled();
    fireEvent.click(editButton);

    await waitFor(() => {
      const raw = window.sessionStorage.getItem('finance:records-edit-context');
      expect(raw).not.toBeNull();
      const payload = JSON.parse(raw);
      expect(payload.property).toBe('Lafayette');
      expect(payload.water_bill_id).toBe(402);
      expect(payload.electricity_bill_id).toBe(402);
      expect(payload.bill_type).toBe('electricity');
    });
  });

  it('creates a wifi bill and surfaces it in Records wifi view', async () => {
    const paymentView = renderWithProviders(<WifiBillsPage />, ['/bills/wifi']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });
    const propertyInput = await screen.findByLabelText('Property / DD');
    fireEvent.change(propertyInput, { target: { value: 'Lafayette' } });

    fireEvent.change(screen.getByLabelText('Internet Provider'), { target: { value: 'PLDT' } });
    fireEvent.change(screen.getByLabelText('Account No.'), { target: { value: 'WIFI-999' } });
    fireEvent.change(screen.getByLabelText('Wifi'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Payment Status WiFi'), { target: { value: 'Unpaid' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createBill).toHaveBeenCalledTimes(1);
    });

    paymentView.unmount();

    renderWithProviders(<RecordsPage />, ['/records?bill=wifi']);

    expect(await screen.findByText('1500')).toBeInTheDocument();
    expect(await screen.findByText('WIFI-999')).toBeInTheDocument();
  });

  it('saving a second module for the same property and due period updates the same monthly row', async () => {
    mockBills = [
      {
        id: 777,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        due_period: '2026-03',
        bill_type: 'water',
        water_account_no: 'WTR-777',
        water_amount: '1200',
        water_due_date: '2026-03-27',
        water_payment_status: 'Unpaid'
      }
    ];

    const paymentView = renderWithProviders(<WifiBillsPage />, ['/bills/wifi']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    fireEvent.change(await screen.findByLabelText('Property / DD'), { target: { value: 'Lafayette' } });
    fireEvent.change(screen.getByLabelText('Due Period'), { target: { value: '2026-03' } });
    fireEvent.change(screen.getByLabelText('Internet Provider'), { target: { value: 'PLDT' } });
    fireEvent.change(screen.getByLabelText('Account No.'), { target: { value: 'WIFI-777' } });
    fireEvent.change(screen.getByLabelText('Wifi'), { target: { value: '1500' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createBill).toHaveBeenCalledTimes(1);
    });

    expect(mockBills).toHaveLength(1);
    expect(mockBills[0].id).toBe(777);
    expect(mockBills[0].water_amount).toBe('1200');
    expect(mockBills[0].wifi_amount).toBe('1500');
  });

  it('filters Records by due period', async () => {
    mockBills = [
      {
        id: 781,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        due_period: '2026-03',
        bill_type: 'water',
        water_amount: '1200'
      },
      {
        id: 782,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        due_period: '2026-04',
        bill_type: 'water',
        water_amount: '1500'
      }
    ];

    renderWithProviders(<RecordsPage />, ['/records']);

    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by due period'), { target: { value: '2026-04' } });

    await waitFor(() => {
      expect(screen.queryByText('1200')).not.toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
    });
  });

  it('opens Water Bills in prefilled edit state from Records Edit action', async () => {
    mockBills = [
      {
        id: 901,
        property_list_id: 1,
        dd: 'Palladium',
        property: '8 TP NW 21B',
        unit_owner: 'Amy Lapating',
        bill_type: 'water',
        due_period: '2026-02',
        water_account_no: 'WTR-901',
        water_amount: '430.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    ];

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/records?bill=water']} future={ROUTER_FUTURE_FLAGS}>
          <Routes>
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/bills/water" element={<WaterBillsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const propertyCell = await screen.findByText('8 TP NW 21B');
    fireEvent.click(propertyCell.closest('tr'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => {
      const propertyDdValue = screen.getByLabelText('Property / DD').value;
      expect(['8 TP NW 21B', 'Lafayette']).toContain(propertyDdValue);
      expect(screen.getByLabelText('Due Period')).toHaveValue('2026-02');
      expect(screen.getByLabelText('Water Account No.')).toHaveValue('WTR-901');
      expect(screen.getByLabelText('Water')).toHaveValue('430.00');
      expect(screen.getByLabelText('Due Date Water')).toHaveValue('2026-02-20');
      expect(screen.getByLabelText('Payment Status Water')).toHaveValue('Unpaid');
    });
  });

  it('opens module upload modal from WiFi page instead of navigating to Bill Review', async () => {
    renderWithProviders(<WifiBillsPage />, ['/bills/wifi']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bill' }));

    expect(await screen.findByText('Upload files')).toBeInTheDocument();
    expect(screen.queryByText('Bills Review Queue')).not.toBeInTheDocument();
  });

  it('blocks module upload when OCR workflow health is unhealthy', async () => {
    fetchOcrHealth.mockResolvedValueOnce({
      success: true,
      healthy: false,
      message: 'OCR workflow health check failed: sample upload returned empty response.'
    });

    renderWithProviders(<WifiBillsPage />, ['/bills/wifi']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
      expect(fetchOcrHealth).toHaveBeenCalled();
    });

    const uploadButton = await screen.findByRole('button', { name: 'Upload Bill' });
    expect(uploadButton).toBeDisabled();
    expect(uploadButton).toHaveAttribute(
      'title',
      'OCR workflow health check failed: sample upload returned empty response.'
    );
    expect(
      screen.getByText(
        'OCR upload unavailable: OCR workflow health check failed: sample upload returned empty response.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Upload files')).not.toBeInTheDocument();
    expect(uploadBill).not.toHaveBeenCalled();
  });

  it('shows upload warnings when OCR returns usable WiFi data with optional fields missing', async () => {
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'internet',
        property: 'Lafayette',
        dd: '24 LPS 9PQ',
        due_period: '2026-03',
        internet_account_no: 'ACC-WIFI-901',
        wifi_amount: '1899.00',
        wifi_due_date: '2026-03-20'
      }
    });

    const paymentView = renderWithProviders(<WifiBillsPage />, ['/bills/wifi']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bill' }));
    expect(await screen.findByText('Upload files')).toBeInTheDocument();

    const uploadInput = paymentView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const wifiFile = new File(['dummy content'], 'wifi-warning.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [wifiFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    const statusBanner = await screen.findByRole('status');
    expect(statusBanner).toHaveTextContent('Upload Complete with Warnings');
    expect(statusBanner).toHaveTextContent('Missing optional fields: Internet Provider.');
    expect(screen.getByLabelText('Property / DD')).toHaveValue('Lafayette');
    expect(screen.getByLabelText('Due Period')).toHaveValue('2026-03');
    expect(screen.getByLabelText('Account No.')).toHaveValue('ACC-WIFI-901');
    expect(screen.getByLabelText('Wifi')).toHaveValue('1899.00');
    expect(screen.getByLabelText('Due Date Wifi')).toHaveValue('2026-03-20');
    expect(screen.getByLabelText('Payment Status WiFi')).toHaveValue('Unpaid');
    expect(screen.queryByText('Upload files')).not.toBeInTheDocument();
  });

  it('shows a visible OCR health notice in Bills Review when upload workflow is unhealthy', async () => {
    fetchOcrHealth.mockResolvedValueOnce({
      success: true,
      healthy: false,
      message: 'OCR workflow health check failed: sample upload returned empty response.'
    });

    renderWithProviders(<BillReviewPage />, ['/bills/review']);

    expect(await screen.findByText('OCR Upload Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('OCR workflow health check failed: sample upload returned empty response.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /No scanned bills yet\. Upload is blocked until OCR is healthy\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Bills' })).toBeDisabled();
  });

  it('rejects mismatched module upload and shows bill type mismatch dialog', async () => {
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'electricity',
        electricity_account_no: 'ELEC-777',
        electricity_amount: '2500'
      }
    });

    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bill' }));
    expect(await screen.findByText('Upload files')).toBeInTheDocument();

    const uploadInput = paymentView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const wrongFile = new File(['dummy content'], 'electric-bill.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [wrongFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Bill Type Mismatch')).toBeInTheDocument();
    expect(screen.getByText(/This file was rejected and was not added to Bills Review\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Water Account No.')).toHaveValue('');
    expect(createBill).not.toHaveBeenCalled();
  });

  it('accepts mixed association invoice upload in Water tab when water fields are extracted', async () => {
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'association_dues',
        association_dues: '7440.00',
        association_due_date: '2026-02-20',
        water_amount: '215.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    });

    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bill' }));
    expect(await screen.findByText('Upload files')).toBeInTheDocument();

    const uploadInput = paymentView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const mixedFile = new File(['dummy content'], '8183_SW-9E FEBRUARY 2026 BILLING INVOICE.pdf', {
      type: 'application/pdf'
    });
    fireEvent.change(uploadInput, { target: { files: [mixedFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('Bill Type Mismatch')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Water')).toHaveValue('215.00');
    expect(screen.getByLabelText('Due Date Water')).toHaveValue('2026-02-20');
    expect(screen.getByLabelText('Payment Status Water')).toHaveValue('Unpaid');
  });

  it('creates separate Association and Water rows in Bill Review for mixed invoices', async () => {
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'association_dues',
        due_period: '2026-02',
        association_dues: '7440.00',
        association_due_date: '2026-02-20',
        association_payment_status: 'Unpaid',
        water_amount: '215.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    });

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    expect(await screen.findByText('Upload files')).toBeInTheDocument();

    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const mixedFile = new File(['dummy content'], '8183_SW-9E FEBRUARY 2026 BILLING INVOICE.pdf', {
      type: 'application/pdf'
    });
    fireEvent.change(uploadInput, { target: { files: [mixedFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Association')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('loads the saved Bill Review queue from backend persistence', async () => {
    mockReviewQueueRows = [
      {
        id: 'queue-water-1',
        source_file_name: 'saved-water.pdf',
        bill_type: 'water',
        status: 'needs_review',
        scan_error: 'Choose the property before saving this row.',
        save_error: '',
        data: {
          property: 'Lafayette',
          due_period: '2026-02',
          water_amount: '620.00'
        },
        diagnostics: {
          title: 'Manual review required',
          message: 'Complete the missing OCR fields before saving.'
        }
      }
    ];
    mockReviewQueueSummary = summarizeMockReviewQueue(mockReviewQueueRows);

    renderWithProviders(<BillReviewPage />, ['/bills/review']);

    await waitFor(() => {
      expect(fetchReviewQueueRows).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Water')).toBeInTheDocument();
    expect(screen.getByText('620.00')).toBeInTheDocument();
    expect(screen.getByText('Choose the property before saving this row.')).toBeInTheDocument();
  });

  it('keeps desktop Bill Review rows compact until Review is opened', async () => {
    mockReviewQueueRows = [
      {
        id: 'queue-association-compact',
        source_file_name: 'association.pdf',
        bill_type: 'association_dues',
        status: 'ready',
        scan_error: '',
        save_error: '',
        data: {
          property_list_id: 1,
          property: 'The Palladium',
          dd: 'NW-21 B',
          due_period: '2026-02',
          association_dues: '4680.00',
          association_due_date: '2026-02-20',
          association_payment_status: 'Unpaid'
        },
        diagnostics: {
          title: 'Ready to save',
          message: 'OCR extracted enough bill data to save this row.'
        }
      }
    ];
    mockReviewQueueSummary = summarizeMockReviewQueue(mockReviewQueueRows);

    renderWithProviders(<BillReviewPage />, ['/bills/review']);

    expect(await screen.findByText('Association')).toBeInTheDocument();
    expect(screen.queryByText('OCR extracted enough bill data to save this row.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByText('OCR extracted enough bill data to save this row.')).toBeInTheDocument();
  });

  it('persists Bill Review queue changes to the backend after uploads', async () => {
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'water',
        due_period: '2026-02',
        water_account_no: 'WTR-PERSIST-1',
        water_amount: '410.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    });

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const persistedFile = new File(['dummy content'], 'persisted-water.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [persistedFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(replaceReviewQueueRows).toHaveBeenCalled();
    });

    const latestPersistedRows = replaceReviewQueueRows.mock.calls.at(-1)?.[0] || [];
    expect(latestPersistedRows).toHaveLength(1);
    expect(latestPersistedRows[0].source_file_name).toBe('persisted-water.pdf');
    expect(latestPersistedRows[0].data.water_amount).toBe('410.00');
  });

  it('renders mobile Bill Review cards and sticky actions on phone widths', async () => {
    setPhoneViewport(true);
    mockReviewQueueRows = [
      {
        id: 'mobile-review-1',
        source_file_name: 'mobile-water.pdf',
        bill_type: 'water',
        status: 'needs_review',
        scan_error: '',
        save_error: '',
        data: {
          property: 'Lafayette',
          due_period: '2026-02',
          water_amount: '620.00'
        },
        diagnostics: {
          title: 'Manual review required',
          message: 'Complete the missing OCR fields before saving.'
        }
      }
    ];
    mockReviewQueueSummary = summarizeMockReviewQueue(mockReviewQueueRows);

    renderWithProviders(<BillReviewPage />, ['/bills/review']);

    expect(await screen.findByText('mobile-water.pdf')).toBeInTheDocument();
    expect(screen.getByText('Select review rows')).toBeInTheDocument();
    expect(screen.getByText('620.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });

  it('keeps failed OCR uploads in Bill Review with diagnostics and recovery actions', async () => {
    uploadBill.mockRejectedValueOnce(
      Object.assign(new Error('Document processing service returned an empty response.'), {
        statusCode: 502,
        requestId: 'req-empty-1',
        category: 'ocr_response'
      })
    );

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const failedFile = new File(['dummy content'], 'broken-water.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [failedFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Scan Failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Scan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Requeue' })).toBeInTheDocument();
    expect(screen.queryByText('Document processing service returned an empty response.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByText('Document processing service returned an empty response.')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req-empty-1')).toBeInTheDocument();
  });

  it('retries a failed Bill Review scan and replaces it with recovered OCR rows', async () => {
    uploadBill
      .mockRejectedValueOnce(
        Object.assign(new Error('Unable to reach document processing service.'), {
          statusCode: 502,
          requestId: 'req-retry-1',
          category: 'retryable'
        })
      )
      .mockResolvedValueOnce({
        success: true,
        data: {
          bill_type: 'water',
          due_period: '2026-02',
          water_account_no: 'WTR-RETRY-1',
          water_amount: '410.00',
          water_due_date: '2026-02-20',
          water_payment_status: 'Unpaid'
        }
      });

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);

    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const retryFile = new File(['dummy content'], 'retry-water.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [retryFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Retry Scan' }));

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Water')).toBeInTheDocument();
    expect(screen.getByText('WTR-RETRY-1')).toBeInTheDocument();
    expect(screen.queryByText('Request ID: req-retry-1')).not.toBeInTheDocument();
  });

  it('retries selected failed scans in Bill Review with batch action', async () => {
    uploadBill
      .mockRejectedValueOnce(
        Object.assign(new Error('Unable to reach document processing service.'), {
          statusCode: 502,
          requestId: 'req-batch-1',
          category: 'retryable'
        })
      )
      .mockResolvedValueOnce({
        success: true,
        data: {
          bill_type: 'water',
          due_period: '2026-02',
          water_account_no: 'WTR-BATCH-1',
          water_amount: '510.00',
          water_due_date: '2026-02-20',
          water_payment_status: 'Unpaid'
        }
      });

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);
    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    const retryFile = new File(['dummy content'], 'batch-retry-water.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [retryFile] } });

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(1);
    });

    const checkboxes = reviewView.container.querySelectorAll('tbody input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByRole('button', { name: /Retry Selected/i }));

    await waitFor(() => {
      expect(uploadBill).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('WTR-BATCH-1')).toBeInTheDocument();
  });

  it('shows account lookup candidates in Bill Review and lets the user pick one directly', async () => {
    lookupPropertyByAccountNumber.mockResolvedValueOnce({
      success: true,
      data: {
        match_status: 'needs_review',
        message: 'Multiple properties share this account number. Choose the correct Property / DD.',
        candidates: [
          { property: 'Lafayette', dd: '24 LPS 9PQ', property_list_id: 1 },
          { property: 'Oak Residence', dd: '88 ABC', property_list_id: 2 }
        ]
      }
    });
    mockPropertyRecords = [
      { id: 1, property_list_id: 1, dd: '24 LPS 9PQ', property: 'Lafayette', unit_owner: 'Risty Durbin' },
      { id: 2, property_list_id: 2, dd: '88 ABC', property: 'Oak Residence', unit_owner: 'Ana Cruz' }
    ];
    uploadBill.mockResolvedValueOnce({
      success: true,
      data: {
        bill_type: 'water',
        due_period: '2026-02',
        water_account_no: 'WTR-AMBIG-02',
        water_amount: '620.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    });

    const reviewView = renderWithProviders(<BillReviewPage />, ['/bills/review']);
    fireEvent.click(await screen.findByRole('button', { name: 'Upload Bills' }));
    const uploadInput = reviewView.container.querySelector('.upload-modal input[type="file"]');
    const ambiguousFile = new File(['dummy content'], 'ambiguous-water.pdf', { type: 'application/pdf' });
    fireEvent.change(uploadInput, { target: { files: [ambiguousFile] } });

    expect(await screen.findByText(/Multiple properties share this account number/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lafayette' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Lafayette')).toBeInTheDocument();
    });
  });

  it('does not auto-fill property when account lookup returns needs_review', async () => {
    lookupPropertyByAccountNumber.mockResolvedValueOnce({
      success: true,
      data: {
        match_status: 'needs_review',
        candidate_count: 2,
        candidates: [
          { property: 'Lafayette', property_list_id: 1 },
          { property: 'Oak Residence', property_list_id: 2 }
        ]
      }
    });

    renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });

    const propertyInput = await screen.findByLabelText('Property / DD');
    expect(propertyInput).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Water Account No.'), { target: { value: 'WTR-AMBIG-01' } });

    await waitFor(
      () => {
        expect(lookupPropertyByAccountNumber).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    expect(propertyInput).toHaveValue('');
    expect(
      await screen.findByText(/Multiple properties share this account number/i)
    ).toBeInTheDocument();
  });

  it('uses backend review summary instead of browser-local queue data on Dashboard', async () => {
    mockBills = [];
    mockReviewQueueRows = [];
    mockReviewQueueSummary = {
      total: 0,
      ready: 0,
      needs_review: 0,
      scan_failed: 0,
      save_failed: 0,
      saved: 0
    };
    window.localStorage.setItem(
      'finance:bill-review-rows:v2',
      JSON.stringify([{ id: 'stale-local', status: 'scan_failed' }])
    );

    renderWithProviders(<DashboardPage />, ['/dashboard']);

    await waitFor(() => {
      expect(fetchDashboardSummary).toHaveBeenCalledTimes(1);
      expect(fetchReviewQueueSummary).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('No records have been added for this month yet.')).toBeInTheDocument();
    expect(screen.queryByText('Some bill uploads failed and need attention in Bills Review.')).not.toBeInTheDocument();
  });

  it('creates an electricity bill and surfaces it in Records electricity view', async () => {
    const paymentView = renderWithProviders(<ElectricityBillsPage />, ['/bills/electricity']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });
    const propertyInput = await screen.findByLabelText('Property / DD');
    fireEvent.change(propertyInput, { target: { value: 'Lafayette' } });

    fireEvent.change(screen.getByLabelText('Electricity Account No.'), { target: { value: 'ELEC-555' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: '3500' } });
    fireEvent.change(screen.getByLabelText('Payment Status Electricity'), { target: { value: 'Unpaid' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createBill).toHaveBeenCalledTimes(1);
    });

    paymentView.unmount();

    renderWithProviders(<RecordsPage />, ['/records?bill=electricity']);

    expect(await screen.findByText('3500')).toBeInTheDocument();
    expect(await screen.findByText('ELEC-555')).toBeInTheDocument();
  });

  it('creates an association bill and surfaces it in Records association view', async () => {
    const paymentView = renderWithProviders(<AssociationBillsPage />, ['/bills/association']);

    await waitFor(() => {
      expect(fetchPropertyRecords).toHaveBeenCalled();
    });
    const propertyInput = await screen.findByLabelText('Property / DD');
    fireEvent.change(propertyInput, { target: { value: 'Lafayette' } });

    fireEvent.change(screen.getByLabelText('Association Dues'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Association Payment Status'), { target: { value: 'Unpaid' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createBill).toHaveBeenCalledTimes(1);
    });

    paymentView.unmount();

    renderWithProviders(<RecordsPage />, ['/records?bill=association']);

    expect(await screen.findByText('5000')).toBeInTheDocument();
  });

  it('keeps edit mode and module data when navigating Next between bill tabs', async () => {
    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        due_period: '2026-02',
        bill_type: 'water',
        editing_bill_id: 901,
        water_bill_id: 901,
        electricity_bill_id: 902,
        internet_bill_id: 903,
        association_bill_id: 904,
        water_account_no: 'WTR-901',
        water_amount: '430.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid',
        electricity_account_no: 'ELEC-902',
        electricity_amount: '3500.00',
        electricity_due_date: '2026-02-20',
        electricity_payment_status: 'Unpaid'
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/bills/water']} future={ROUTER_FUTURE_FLAGS}>
          <Routes>
            <Route path="/bills/water" element={<WaterBillsPage />} />
            <Route path="/bills/electricity" element={<ElectricityBillsPage />} />
            <Route path="/bills/wifi" element={<WifiBillsPage />} />
            <Route path="/bills/association" element={<AssociationBillsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Edit Mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Water Account No.')).toHaveValue('WTR-901');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(screen.getByText(/Edit Mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Electricity Account No.')).toHaveValue('ELEC-902');
      expect(screen.getByLabelText('Electricity')).toHaveValue('3500.00');
    });
  });

  it('stays in edit mode after save and exits only on Cancel', async () => {
    mockBills = [
      {
        id: 990,
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        due_period: '2026-02',
        water_account_no: 'WTR-990',
        water_amount: '410.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      }
    ];

    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        property_list_id: 1,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        due_period: '2026-02',
        bill_type: 'water',
        editing_bill_id: 990,
        water_bill_id: 990,
        water_account_no: 'WTR-990',
        water_amount: '410.00',
        water_due_date: '2026-02-20',
        water_payment_status: 'Unpaid'
      })
    );

    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    await waitFor(() => {
      expect(screen.getByText(/Edit Mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Water')).toHaveValue('410.00');
    });

    fireEvent.change(screen.getByLabelText('Water'), { target: { value: '455.00' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(updateBill).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Edit Mode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
      expect(screen.queryByText(/Create Mode/i)).not.toBeInTheDocument();
    });

    const resetButton =
      screen.queryByRole('button', { name: 'Cancel' }) ||
      screen.queryByRole('button', { name: 'Cancel editing' }) ||
      screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/Create Mode/i)).toBeInTheDocument();
    });
  });

  it('keeps API mocks reachable for sanity', () => {
    expect(fetchBills).toBeDefined();
    expect(fetchDashboardSummary).toBeDefined();
    expect(fetchMergedBills).toBeDefined();
    expect(fetchPropertyRecords).toBeDefined();
    expect(uploadBill).toBeDefined();
    expect(fetchOcrHealth).toBeDefined();
  });

  it('editing a February bill does not alter the January bill for the same property', async () => {
    // Seed two water bills for the SAME property but DIFFERENT billing months
    mockBills = [
      {
        id: 301,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        due_period: '2025-01',
        water_account_no: 'WTR-001',
        water_amount: '800',
        water_due_date: '2025-01-28',
        water_payment_status: 'Unpaid'
      },
      {
        id: 302,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        due_period: '2025-02',
        water_account_no: 'WTR-001',
        water_amount: '950',
        water_due_date: '2025-02-28',
        water_payment_status: 'Unpaid'
      }
    ];

    // Set edit context pointing ONLY at the February record (id 302)
    window.sessionStorage.setItem(
      'finance:records-edit-context',
      JSON.stringify({
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        editing_bill_id: 302,
        water_bill_id: 302,
        electricity_bill_id: null,
        internet_bill_id: null,
        association_bill_id: null,
        water_account_no: 'WTR-001',
        water_amount: '950',
        water_due_date: '2025-02-28',
        water_payment_status: 'Unpaid',
        due_period: '2025-02'
      })
    );

    // Open the payment form in edit mode — February record loads
    const paymentView = renderWithProviders(<WaterBillsPage />, ['/bills/water']);

    const waterAmountInput = await screen.findByLabelText('Water');
    await waitFor(() => {
      expect(waterAmountInput).toHaveValue('950');
    });

    // Change ONLY the February amount to 1100
    fireEvent.change(waterAmountInput, { target: { value: '1100' } });

    const form = paymentView.container.querySelector('#payment-form');
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(updateBill).toHaveBeenCalledTimes(1);
    });

    paymentView.unmount();

    // January record in the data store must be completely untouched
    const januaryRecord = mockBills.find((row) => Number(row.id) === 301);
    expect(januaryRecord).toBeDefined();
    expect(januaryRecord.water_amount).toBe('800');
    expect(januaryRecord.due_period).toBe('2025-01');

    // February record must reflect the new amount
    const februaryRecord = mockBills.find((row) => Number(row.id) === 302);
    expect(februaryRecord).toBeDefined();
    expect(String(februaryRecord.water_amount)).toBe('1100');

    // updateBill must have been called exactly once — only for February (id 302)
    expect(updateBill).toHaveBeenCalledTimes(1);
    expect(updateBill.mock.calls[0][0]).toBe(302);
  });
});
