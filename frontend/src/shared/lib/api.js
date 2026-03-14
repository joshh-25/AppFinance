import { clearStoredSession } from './auth.js';
import { optimizeBillUploadFile } from './uploadOptimizer.js';
import { getRuntimeConfig } from './runtimeConfig.js';

// Finance App File: frontend\src\lib\api.js
// Purpose: Frontend/support source file for the Finance app.

const API_BASE = getRuntimeConfig().apiBase;
const UPLOAD_TIMEOUT_MS = 40000;
let csrfTokenCache = '';
const LOGIN_ROUTE = getRuntimeConfig().loginPath || '/login';

function handleUnauthorizedSession() {
  clearStoredSession();
  const path = String(window.location.pathname || '');
  const isAlreadyOnLogin = path === '/login' || path.endsWith('/login');
  if (!isAlreadyOnLogin) {
    window.location.assign(LOGIN_ROUTE);
  }
}

async function ensureCsrfToken() {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  const response = await fetch(`${API_BASE}?action=csrf`, {
    method: 'GET',
    credentials: 'same-origin'
  });

  let result = null;
  try {
    result = await response.json();
  } catch (error) {
    result = null;
  }

  if (!response.ok || !result || result.success !== true || !result.csrf_token) {
    throw new Error(result?.message || 'Failed to initialize security token.');
  }

  csrfTokenCache = result.csrf_token;
  return csrfTokenCache;
}

async function requestJson(action, options = {}) {
  const { method = 'GET', payload, defaultMessage = 'Request failed.' } = options;

  const fetchOptions = {
    method,
    credentials: 'same-origin'
  };

  if (method !== 'GET') {
    const csrfToken = await ensureCsrfToken();
    fetchOptions.headers = {
      ...(fetchOptions.headers || {}),
      'X-CSRF-Token': csrfToken
    };
  }

  if (payload !== undefined) {
    fetchOptions.headers = {
      ...(fetchOptions.headers || {}),
      'Content-Type': 'application/json'
    };
    fetchOptions.body = JSON.stringify(payload);
  }

  const response = await fetch(`${API_BASE}?action=${action}`, fetchOptions);

  let result = null;
  try {
    result = await response.json();
  } catch (error) {
    result = null;
  }

  if (!response.ok || !result || result.success !== true) {
    if (response.status === 401) {
      handleUnauthorizedSession();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(result?.message || defaultMessage);
  }

  return result;
}

function normalizeBillTypeFilter(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'wifi') {
    return 'internet';
  }
  if (normalized === 'association') {
    return 'association_dues';
  }
  return normalized;
}

export async function fetchBills(options = {}) {
  const query = new URLSearchParams();
  const page = Number(options.page || 0);
  const perPage = Number(options.perPage || 0);
  const search = String(options.search || '').trim();
  const billType = normalizeBillTypeFilter(options.billType || '');

  if (Number.isFinite(page) && page > 0) {
    query.set('page', String(page));
  }
  if (Number.isFinite(perPage) && perPage > 0) {
    query.set('per_page', String(perPage));
  }
  if (search !== '') {
    query.set('q', search);
  }
  if (billType !== '') {
    query.set('bill_type', billType);
  }

  const action = query.size > 0 ? `list&${query.toString()}` : 'list';
  const result = await requestJson(action, {
    defaultMessage: 'Failed to load records.'
  });

  const data = result.data || [];
  if (options.includeMeta) {
    return {
      data,
      meta: result.meta || null
    };
  }

  return data;
}

export async function fetchMergedBills(options = {}) {
  const query = new URLSearchParams();
  const page = Number(options.page || 0);
  const perPage = Number(options.perPage || 0);
  const search = String(options.search || '').trim();
  const duePeriod = String(options.duePeriod || '').trim();

  if (Number.isFinite(page) && page > 0) {
    query.set('page', String(page));
  }
  if (Number.isFinite(perPage) && perPage > 0) {
    query.set('per_page', String(perPage));
  }
  if (search !== '') {
    query.set('q', search);
  }
  if (duePeriod !== '') {
    query.set('due_period', duePeriod);
  }

  const action = query.size > 0 ? `list_merged&${query.toString()}` : 'list_merged';
  const result = await requestJson(action, {
    defaultMessage: 'Failed to load merged records.'
  });

  const data = result.data || [];
  if (options.includeMeta) {
    return {
      data,
      meta: result.meta || null
    };
  }

  return data;
}

export async function fetchDashboardSummary() {
  const result = await requestJson('dashboard_summary', {
    defaultMessage: 'Failed to load dashboard summary.'
  });

  return result.data || {};
}

export async function fetchReviewQueueRows() {
  const result = await requestJson('review_queue_list', {
    defaultMessage: 'Failed to load the Bills Review queue.'
  });

  return result.data || [];
}

export async function replaceReviewQueueRows(rows) {
  const result = await requestJson('review_queue_replace', {
    method: 'POST',
    payload: { rows },
    defaultMessage: 'Failed to save Bills Review queue changes.'
  });

  return result.data || [];
}

export async function fetchReviewQueueSummary() {
  const result = await requestJson('review_queue_summary', {
    defaultMessage: 'Failed to load Bills Review summary.'
  });

  return result.data || {};
}

export async function createBill(payload) {
  return requestJson('add', {
    method: 'POST',
    payload,
    defaultMessage: 'Failed to save payment.'
  });
}

export async function updateBill(id, payload) {
  return requestJson('bill_update', {
    method: 'POST',
    payload: { id, ...payload },
    defaultMessage: 'Failed to update payment.'
  });
}

export async function uploadBill(file, context = {}) {
  const optimizedFile = await optimizeBillUploadFile(file);
  const formData = new FormData();
  formData.append('bill_file', optimizedFile);
  formData.append('bill_type', String(context.bill_type || ''));
  formData.append('property_list_id', String(context.property_list_id || ''));
  formData.append('dd', String(context.dd || ''));
  formData.append('property', String(context.property || ''));
  formData.append('due_period', String(context.due_period || ''));
  formData.append('csrf_token', await ensureCsrfToken());

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort();
  }, UPLOAD_TIMEOUT_MS);

  let response = null;
  try {
    response = await fetch(`${API_BASE}?action=upload_bill`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Upload timed out while waiting for document processing.');
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  let result = null;
  try {
    result = await response.json();
  } catch (error) {
    result = null;
  }

  if (!response.ok || !result || result.success !== true) {
    const status = Number(result?.status_code || response.status || 0);
    const details = result?.details ? ` ${String(result.details)}` : '';
    const defaultMessage = status > 0 ? `Upload failed (HTTP ${status}).` : 'Upload failed.';
    const error = new Error((result?.message || defaultMessage) + details);
    error.statusCode = status;
    error.requestId = String(result?.request_id || '');
    error.details = String(result?.details || '');
    error.category =
      status === 408 || status === 429 || status >= 500
        ? 'retryable'
        : result?.message && /empty response|invalid response|document processing service/i.test(String(result.message))
          ? 'ocr_response'
          : 'validation';
    throw error;
  }

  return result;
}

export async function fetchOcrHealth() {
  const result = await requestJson('ocr_health', {
    defaultMessage: 'Failed to check OCR service health.'
  });
  return result;
}

export async function importAccountLookupEntries(payload) {
  return requestJson('account_lookup_import', {
    method: 'POST',
    payload,
    defaultMessage: 'Failed to import account directory entries.'
  });
}

export async function lookupPropertyByAccountNumber(options = {}) {
  const query = new URLSearchParams();
  const accountNumber = String(options.accountNumber || '').trim();
  const utilityType = normalizeBillTypeFilter(options.utilityType || '');
  const duePeriod = String(options.duePeriod || '').trim();

  if (accountNumber === '') {
    throw new Error('Account number is required.');
  }

  query.set('account_number', accountNumber);
  if (utilityType !== '') {
    query.set('utility_type', utilityType);
  }
  if (duePeriod !== '') {
    query.set('due_period', duePeriod);
  }

  return requestJson(`account_lookup_search&${query.toString()}`, {
    defaultMessage: 'No matching property found for this account number.'
  });
}

export async function createPropertyRecord(payload) {
  return requestJson('property_record_create', {
    method: 'POST',
    payload,
    defaultMessage: 'Failed to save property record.'
  });
}

export async function fetchPropertyRecords() {
  const result = await requestJson('property_record_list', {
    defaultMessage: 'Failed to load property records.'
  });

  return result.data || [];
}

export async function updatePropertyRecord(id, payload) {
  return requestJson('property_record_update', {
    method: 'POST',
    payload: { id, ...payload },
    defaultMessage: 'Failed to update property record.'
  });
}

export async function deletePropertyRecord(id) {
  return requestJson('property_record_delete', {
    method: 'POST',
    payload: { id },
    defaultMessage: 'Failed to delete property record.'
  });
}

export async function fetchExpenses(options = {}) {
  const query = new URLSearchParams();
  const page = Number(options.page || 0);
  const perPage = Number(options.perPage || 0);
  const search = String(options.search || '').trim();

  if (Number.isFinite(page) && page > 0) {
    query.set('page', String(page));
  }
  if (Number.isFinite(perPage) && perPage > 0) {
    query.set('per_page', String(perPage));
  }
  if (search !== '') {
    query.set('q', search);
  }

  const action = query.size > 0 ? `expense_list&${query.toString()}` : 'expense_list';
  const result = await requestJson(action, {
    defaultMessage: 'Failed to load expenses.'
  });

  const data = result.data || [];
  if (options.includeMeta) {
    return {
      data,
      meta: result.meta || null
    };
  }

  return data;
}

export async function createExpense(payload) {
  return requestJson('expense_create', {
    method: 'POST',
    payload,
    defaultMessage: 'Failed to save expense.'
  });
}

export async function updateExpense(id, payload) {
  return requestJson('expense_update', {
    method: 'POST',
    payload: { id, ...payload },
    defaultMessage: 'Failed to update expense.'
  });
}

export async function deleteExpense(id) {
  return requestJson('expense_delete', {
    method: 'POST',
    payload: { id },
    defaultMessage: 'Failed to delete expense.'
  });
}

