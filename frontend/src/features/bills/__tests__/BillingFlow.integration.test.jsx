// Finance App File: frontend\src\features\bills\__tests__\BillingFlow.integration.test.jsx
// Purpose: Integration-style tests for critical monthly billing flows.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterBillsPage from '../WaterBillsPage.jsx';
import WifiBillsPage from '../WifiBillsPage.jsx';
import ElectricityBillsPage from '../ElectricityBillsPage.jsx';
import AssociationBillsPage from '../AssociationBillsPage.jsx';
import RecordsPage from '../RecordsPage.jsx';
import { clearGlobalEditMode } from '../../../shared/lib/globalEditMode.js';
import {
  createBill,
  fetchBills,
  fetchMergedBills,
  fetchPropertyRecords,
  updateBill,
  uploadBill
} from '../../../shared/lib/api.js';

let mockBills = [];
let mockPropertyRecords = [];
let nextBillId = 1;

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
  fetchMergedBills: vi.fn(async () => {
    const groups = {};
    for (const row of mockBills) {
      const dd = String(row.dd || '').trim();
      const property = String(row.property || '').trim();
      const key = `${dd.toLowerCase()}|${property.toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          property_list_id: Number(row.property_list_id || 0),
          dd,
          property,
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
          water_bill_id: null,
          electricity_bill_id: null,
          internet_bill_id: null,
          association_bill_id: null
        };
      }

      const target = groups[key];
      Object.keys(target).forEach((field) => {
        if (row[field] !== undefined && row[field] !== '') {
          target[field] = row[field];
        }
      });

      const billType = String(row.bill_type || 'water').toLowerCase();
      if (billType === 'internet') {
        target.internet_bill_id = Number(row.id || 0);
      } else if (billType === 'electricity') {
        target.electricity_bill_id = Number(row.id || 0);
      } else if (billType === 'association_dues') {
        target.association_bill_id = Number(row.id || 0);
      } else {
        target.water_bill_id = Number(row.id || 0);
      }
    }

    return Object.values(groups);
  }),
  createBill: vi.fn(async (payload) => {
    const row = {
      id: nextBillId++,
      ...payload
    };
    mockBills = [row, ...mockBills];
    return { success: true, message: 'Bill entry saved successfully.' };
  }),
  updateBill: vi.fn(async (id, payload) => {
    mockBills = mockBills.map((row) => (Number(row.id) === Number(id) ? { ...row, ...payload } : row));
    return { success: true, message: 'Bill record updated successfully.' };
  }),
  uploadBill: vi.fn(async () => ({ success: true, data: {} }))
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
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Billing flow integration coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    nextBillId = 100;
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

  it('keeps API mocks reachable for sanity', () => {
    expect(fetchBills).toBeDefined();
    expect(fetchMergedBills).toBeDefined();
    expect(fetchPropertyRecords).toBeDefined();
    expect(uploadBill).toBeDefined();
  });

  it('editing a February bill does not alter the January bill for the same property', async () => {
    // Seed two water bills for the SAME property but DIFFERENT billing months
    mockBills = [
      {
        id: 301,
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        bill_type: 'water',
        billing_period: '2025-01',
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
        billing_period: '2025-02',
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
        billing_period: '2025-02'
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
    expect(januaryRecord.billing_period).toBe('2025-01');

    // February record must reflect the new amount
    const februaryRecord = mockBills.find((row) => Number(row.id) === 302);
    expect(februaryRecord).toBeDefined();
    expect(String(februaryRecord.water_amount)).toBe('1100');

    // updateBill must have been called exactly once — only for February (id 302)
    expect(updateBill).toHaveBeenCalledTimes(1);
    expect(updateBill.mock.calls[0][0]).toBe(302);
  });
});
