import { cleanTextValue } from './billPropertyUtils.js';

const REVIEW_QUEUE_STATUSES = ['ready', 'needs_review', 'scan_failed', 'save_failed', 'saving', 'saved'];

function normalizeReviewQueueBillType(value) {
  const normalized = cleanTextValue(value).toLowerCase();
  if (normalized === 'wifi') {
    return 'internet';
  }
  if (normalized === 'association') {
    return 'association_dues';
  }
  return normalized;
}

export function normalizeReviewQueueStatus(value) {
  const normalized = cleanTextValue(value).toLowerCase();
  return REVIEW_QUEUE_STATUSES.includes(normalized) ? normalized : 'needs_review';
}

export function normalizeReviewQueueDiagnostics(value) {
  const diagnostics = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    code: cleanTextValue(diagnostics.code || ''),
    title: cleanTextValue(diagnostics.title || ''),
    message: cleanTextValue(diagnostics.message || ''),
    details: cleanTextValue(diagnostics.details || ''),
    request_id: cleanTextValue(diagnostics.request_id || ''),
    status_code: Number(diagnostics.status_code || 0),
    retry_count: Number(diagnostics.retry_count || 0)
  };
}

export function normalizeReviewQueueRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }

  const rowId = cleanTextValue(row.id || row.client_row_id || '');
  if (rowId === '') {
    return null;
  }

  const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {};

  return {
    id: rowId,
    source_file_name: cleanTextValue(row.source_file_name || ''),
    bill_type: normalizeReviewQueueBillType(row.bill_type || ''),
    status: normalizeReviewQueueStatus(row.status || ''),
    scan_error: cleanTextValue(row.scan_error || ''),
    save_error: cleanTextValue(row.save_error || ''),
    data: { ...data },
    diagnostics: normalizeReviewQueueDiagnostics(row.diagnostics || {})
  };
}

export function normalizeReviewQueueRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => normalizeReviewQueueRow(row)).filter(Boolean);
}

export function normalizeReviewQueueSummary(summary) {
  const source = summary && typeof summary === 'object' && !Array.isArray(summary) ? summary : {};
  return {
    total: Math.max(0, Number(source.total || 0)),
    ready: Math.max(0, Number(source.ready || 0)),
    needs_review: Math.max(0, Number(source.needs_review || 0)),
    scan_failed: Math.max(0, Number(source.scan_failed || 0)),
    save_failed: Math.max(0, Number(source.save_failed || 0)),
    saved: Math.max(0, Number(source.saved || 0))
  };
}

export function summarizeReviewQueueRows(rows) {
  return normalizeReviewQueueRows(rows).reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { total: 0, ready: 0, needs_review: 0, scan_failed: 0, save_failed: 0, saved: 0 }
  );
}
