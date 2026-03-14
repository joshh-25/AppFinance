// Finance App File: frontend/src/pages/DashboardPage.jsx
// Purpose: Senior-friendly dashboard with simple monthly summaries and recent records.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import { SkeletonButton, SkeletonLine } from '../../shared/components/Skeleton.jsx';
import { fetchDashboardSummary, fetchReviewQueueSummary } from '../../shared/lib/api.js';
import { normalizeReviewQueueSummary } from '../../shared/lib/reviewQueue.js';

const LIVE_REFRESH_MS = 60000;
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
  return MODULE_AMOUNT_STATUS_FIELDS.reduce((sum, [amountField]) => sum + normalizeAmount(row[amountField]), 0);
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

function formatBillSections(row) {
  const labels = [];
  if (normalizeAmount(row.wifi_amount) > 0) {
    labels.push('WiFi');
  }
  if (normalizeAmount(row.water_amount) > 0) {
    labels.push('Water');
  }
  if (normalizeAmount(row.electricity_amount) > 0) {
    labels.push('Electricity');
  }
  if (normalizeAmount(row.association_dues) > 0) {
    labels.push('Association');
  }
  return labels.length > 0 ? labels.join(', ') : 'Property only';
}

function summarizeRowStatus(row) {
  const pending = computeRowPending(row);
  if (pending > 0) {
    return 'Unpaid';
  }
  if (computeRowTotal(row) > 0) {
    return 'Paid';
  }
  return 'No charges';
}

function formatLiveTimestamp(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 'Waiting for live data';
  }
  return `Updated ${new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  })}`;
}

function DashboardCardSkeleton() {
  return (
    <article className="card kpi-card" aria-hidden="true">
      <SkeletonLine width="55%" height={12} />
      <div style={{ height: 10 }} />
      <SkeletonLine width="70%" height={24} radius={10} />
    </article>
  );
}

function DashboardLoadingState() {
  return (
    <AppLayout title="Dashboard">
      <section className="dashboard-live-strip" aria-hidden="true">
        <SkeletonLine width="180px" height={18} radius={9} />
        <div className="dashboard-live-meta">
          <SkeletonLine width="120px" height={18} radius={9} />
          <SkeletonButton width={120} height={38} radius={10} />
        </div>
      </section>

      <section className="kpi-grid" role="status" aria-live="polite" aria-label="Loading dashboard data">
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </section>

      <section className="dashboard-main-grid">
        <article className="card dashboard-recent-card" aria-hidden="true">
          <div className="card-title-row">
            <div className="card-title-left">
              <SkeletonLine width="160px" height={18} radius={8} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <SkeletonLine width="100%" height={14} radius={7} />
            <SkeletonLine width="100%" height={14} radius={7} />
            <SkeletonLine width="92%" height={14} radius={7} />
          </div>
        </article>

        <article className="card dashboard-quick-actions" aria-hidden="true">
          <SkeletonLine width="140px" height={18} radius={8} />
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <SkeletonButton width="100%" height={40} radius={10} />
            <SkeletonButton width="100%" height={40} radius={10} />
          </div>
        </article>
      </section>
    </AppLayout>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: dashboardSummary = {},
    isLoading,
    isError,
    error,
    isFetching,
    dataUpdatedAt,
    refetch
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    retry: false,
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: LIVE_REFRESH_MS / 2
  });
  const {
    data: reviewQueueSummaryData = {},
    isError: isReviewQueueError
  } = useQuery({
    queryKey: ['dashboard-review-queue-summary'],
    queryFn: fetchReviewQueueSummary,
    retry: false,
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: LIVE_REFRESH_MS / 2
  });

  const dashboardData = useMemo(() => {
    const summarySource =
      dashboardSummary && typeof dashboardSummary === 'object' && !Array.isArray(dashboardSummary) ? dashboardSummary : {};
    const currentDuePeriod = String(summarySource.current_due_period || new Date().toISOString().slice(0, 7));
    const currentPeriodCount = Number(summarySource.current_period_count || 0);
    const totalBilled = Number(summarySource.total_billed || 0);
    const pendingCollections = Number(summarySource.pending_collections || 0);
    const unpaidCount = Number(summarySource.unpaid_count || 0);
    const recentRows = Array.isArray(summarySource.recent_rows) ? summarySource.recent_rows : [];
    const reviewQueue = normalizeReviewQueueSummary(reviewQueueSummaryData);
    const reviewNeedsAttention = reviewQueue.needs_review + reviewQueue.scan_failed + reviewQueue.save_failed;

    let alertMessage = 'Everything looks normal this month.';
    let alertLevel = 'ok';

    if (isReviewQueueError) {
      alertMessage = 'Bills Review status could not be loaded right now.';
      alertLevel = 'warning';
    } else if (reviewQueue.scan_failed > 0 || reviewQueue.save_failed > 0) {
      alertMessage = 'Some bill uploads failed and need attention in Bills Review.';
      alertLevel = 'danger';
    } else if (reviewQueue.needs_review > 0) {
      alertMessage = 'Some uploaded bills still need manual review.';
      alertLevel = 'warning';
    } else if (unpaidCount > 0) {
      alertMessage = `${unpaidCount} monthly record(s) are still unpaid this period.`;
      alertLevel = 'warning';
    } else if (currentPeriodCount === 0) {
      alertMessage = 'No records have been added for this month yet.';
      alertLevel = 'warning';
    }

    return {
      currentDuePeriod,
      totalBilled,
      pendingCollections,
      reviewNeedsAttention,
      recentRows,
      alertMessage,
      alertLevel
    };
  }, [dashboardSummary, isReviewQueueError, reviewQueueSummaryData]);

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  return (
    <AppLayout title="Dashboard">
      <section className="dashboard-live-strip">
        <div className="dashboard-live-pill">
          <span className={`dashboard-live-dot${isFetching ? ' syncing' : ''}`} aria-hidden="true" />
          <span>Live monthly data</span>
        </div>
        <div className="dashboard-live-meta">
          <span>{dashboardData.currentDuePeriod}</span>
          <span>{formatLiveTimestamp(dataUpdatedAt)}</span>
          <button type="button" className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="kpi-grid dashboard-kpi-simple">
        <article className="card kpi-card total-kpi-card">
          <p className="kpi-label">Total This Month</p>
          <p className="kpi-value">{formatCurrency(dashboardData.totalBilled)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Unpaid This Month</p>
          <p className="kpi-value">{formatCurrency(dashboardData.pendingCollections)}</p>
        </article>

        <article className="card kpi-card">
          <p className="kpi-label">Bills Need Review</p>
          <p className="kpi-value">{dashboardData.reviewNeedsAttention}</p>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="card dashboard-recent-card">
          <div className="card-title-row">
            <div className="card-title-left">
              <h3>Important Notice</h3>
            </div>
            <div className="card-title-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/review')}>
                Bills Review
              </button>
            </div>
          </div>

          <div className={`dashboard-alert dashboard-alert-${dashboardData.alertLevel}`}>
            <p>{dashboardData.alertMessage}</p>
          </div>

          <div className="dashboard-report-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/records/bills')}>
              Open Records
            </button>
          </div>
        </article>

        <article className="card dashboard-quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/water')}>
              Add Water Bill
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/bills/wifi')}>
              Add WiFi Bill
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/property-records')}>
              Property Records
            </button>
          </div>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="card dashboard-recent-card">
          <div className="card-title-row">
            <div className="card-title-left">
              <h3>Recent Monthly Records</h3>
            </div>
          </div>

          {isError && <p className="error">{error?.message || 'Failed to load dashboard data.'}</p>}

          {!isLoading && !isError && dashboardData.recentRows.length === 0 && (
            <div className="empty-state">
              <p>No monthly records yet.</p>
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
                    <th>Due Period</th>
                    <th>Bill Sections</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentRows.map((row) => (
                    <tr key={`${row.id || 0}-${row.property_list_id || 0}-${row.due_period || ''}`}>
                      <td>
                        <strong>{row.property || '-'}</strong>
                        <br />
                        <small>{row.dd || '-'}</small>
                      </td>
                      <td>{row.due_period || '-'}</td>
                      <td>{formatBillSections(row)}</td>
                      <td>{formatCurrency(computeRowTotal(row))}</td>
                      <td>{summarizeRowStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card dashboard-quick-actions dashboard-help-card">
          <h3>Simple Guide</h3>
          <div className="dashboard-help-list">
            <p>Use `Bills Review` if uploaded bills need checking.</p>
            <p>Use `Open Records` to see saved monthly bills.</p>
            <p>Use `Property Records` when adding or updating property details.</p>
          </div>
        </article>
      </section>
    </AppLayout>
  );
}
