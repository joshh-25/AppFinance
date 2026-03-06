// Finance App File: frontend/src/pages/DashboardPage.jsx
// Purpose: Dashboard landing page with KPI summaries and recent billing activity.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import ReelsSkeletonLoader from '../../shared/components/ReelsSkeletonLoader.jsx';
import { fetchBills } from '../../shared/lib/api.js';

const MODULE_AMOUNT_STATUS_FIELDS = [
  ['wifi_amount', 'wifi_payment_status'],
  ['water_amount', 'water_payment_status'],
  ['electricity_amount', 'electricity_payment_status'],
  ['association_dues', 'association_payment_status']
];

function normalizeAmount(value) {
  const text = String(value ?? '').trim();
  if (text === '') {
    return 0;
  }
  const cleaned = text.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPaidStatus(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  if (normalized === '') {
    return false;
  }
  return normalized === 'paid' || normalized === 'settled' || normalized === 'completed';
}

function computeRowTotal(row) {
  return MODULE_AMOUNT_STATUS_FIELDS.reduce((sum, [amountField]) => {
    return sum + normalizeAmount(row[amountField]);
  }, 0);
}

function computeRowPending(row) {
  return MODULE_AMOUNT_STATUS_FIELDS.reduce((sum, [amountField, statusField]) => {
    const amount = normalizeAmount(row[amountField]);
    if (amount <= 0) {
      return sum;
    }
    return isPaidStatus(row[statusField]) ? sum : sum + amount;
  }, 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatBillType(type) {
  const normalized = String(type ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'association_dues') {
    return 'Association';
  }
  if (normalized === 'internet') {
    return 'WiFi';
  }
  if (normalized === 'electricity') {
    return 'Electricity';
  }
  if (normalized === 'water') {
    return 'Water';
  }
  return normalized ? normalized : '-';
}

function summarizeRowStatus(row) {
  const statuses = MODULE_AMOUNT_STATUS_FIELDS.map(([, statusField]) =>
    String(row[statusField] ?? '')
      .trim()
      .toLowerCase()
  ).filter(Boolean);

  if (statuses.length === 0) {
    return 'No status';
  }
  if (statuses.some((status) => status.includes('overdue'))) {
    return 'Overdue';
  }
  if (statuses.some((status) => !isPaidStatus(status))) {
    return 'Pending';
  }
  return 'Paid';
}

function sortByMostRecent(rows) {
  return [...rows].sort((a, b) => {
    const aDate = Date.parse(a.created_at || '');
    const bDate = Date.parse(b.created_at || '');
    if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
      return bDate - aDate;
    }
    const aId = Number(a.id || 0);
    const bId = Number(b.id || 0);
    return bId - aId;
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: records = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['records-list'],
    queryFn: fetchBills
  });

  const dashboardData = useMemo(() => {
    const currentBillingPeriod = new Date().toISOString().slice(0, 7);
    const currentMonthRows = records.filter((row) => {
      const createdAt = String(row.created_at || '').trim();
      if (createdAt === '') {
        return false;
      }
      const parsed = Date.parse(createdAt);
      if (!Number.isFinite(parsed)) {
        return false;
      }
      return new Date(parsed).toISOString().slice(0, 7) === currentBillingPeriod;
    });
    const totalBilled = currentMonthRows.reduce((sum, row) => sum + computeRowTotal(row), 0);
    const pendingCollections = currentMonthRows.reduce((sum, row) => sum + computeRowPending(row), 0);
    const wifiTotal = currentMonthRows.reduce((sum, row) => sum + normalizeAmount(row.wifi_amount), 0);
    const waterTotal = currentMonthRows.reduce((sum, row) => sum + normalizeAmount(row.water_amount), 0);
    const electricityTotal = currentMonthRows.reduce((sum, row) => sum + normalizeAmount(row.electricity_amount), 0);
    const associationDuesTotal = currentMonthRows.reduce((sum, row) => sum + normalizeAmount(row.association_dues), 0);
    const recentRows = sortByMostRecent(records).slice(0, 8);

    return {
      totalBilled,
      pendingCollections,
      wifiTotal,
      waterTotal,
      electricityTotal,
      associationDuesTotal,
      activeRecords: records.length,
      currentMonthCount: currentMonthRows.length,
      recentRows
    };
  }, [records]);

  if (isLoading) {
    return <ReelsSkeletonLoader />;
  }

  return (
    <AppLayout title="Dashboard">
      <section className="kpi-grid">
        <article className="card kpi-card total-kpi-card">
          <p className="kpi-label">Total Billed This Month</p>
          <p className="kpi-value">{formatCurrency(dashboardData.totalBilled)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Total WiFi</p>
          <p className="kpi-value">{formatCurrency(dashboardData.wifiTotal)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Total Water</p>
          <p className="kpi-value">{formatCurrency(dashboardData.waterTotal)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Total Electricity</p>
          <p className="kpi-value">{formatCurrency(dashboardData.electricityTotal)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Total Association Dues</p>
          <p className="kpi-value">{formatCurrency(dashboardData.associationDuesTotal)}</p>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="card dashboard-recent-card">
          <div className="card-title-row">
            <div className="card-title-left">
              <h3>Recent Activity</h3>
            </div>
            <div className="card-title-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/records')}>
                Open Records
              </button>
            </div>
          </div>

          {isError && <p className="error">{error?.message || 'Failed to load dashboard data.'}</p>}

          {!isLoading && !isError && dashboardData.recentRows.length === 0 && (
            <div className="empty-state">
              <p>No recent activity yet.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/property-records')}>
                Create Property Record
              </button>
            </div>
          )}

          {!isLoading && !isError && dashboardData.recentRows.length > 0 && (
            <div className="table-wrap dashboard-recent-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Property / DD</th>
                    <th>Bill Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentRows.map((row) => (
                    <tr key={`${row.id || 0}-${row.dd || ''}-${row.property || ''}`}>
                      <td>
                        <strong>{row.property || '-'}</strong>
                        <br />
                        <small>{row.dd || '-'}</small>
                      </td>
                      <td>{formatBillType(row.bill_type)}</td>
                      <td>{formatCurrency(computeRowTotal(row))}</td>
                      <td>{summarizeRowStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card dashboard-quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/property-records')}>
              Property Records
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/water')}>
              Add Water Bill
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/electricity')}>
              Add Electricity Bill
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/wifi')}>
              Add WiFi Bill
            </button>
          </div>
        </article>
      </section>
    </AppLayout>
  );
}
