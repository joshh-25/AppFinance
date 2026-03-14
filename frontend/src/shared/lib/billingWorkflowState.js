const SHARED_BILL_SELECTION_KEY = 'finance-bill-selection:shared';
const SELECTED_PROPERTY_CONTEXT_KEY = 'finance:selected-property-record';
const RECORDS_EDIT_CONTEXT_KEY = 'finance:records-edit-context';
const RECORDS_EDIT_FALLBACK_KEY = 'finance:records-edit-context:fallback';
const RECORDS_EDIT_PERSISTED_KEY = 'finance:records-edit-context:persisted';
const PROPERTY_RECORD_DRAFT_KEY = 'finance:property-record-draft';
const RECORDS_EDIT_WINDOW_KEY = '__finance_records_edit_context';

function parseStoredJson(raw) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage;
}

function getLocalStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function ensureRecordsEditWindowContext() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(window, RECORDS_EDIT_WINDOW_KEY)) {
    window[RECORDS_EDIT_WINDOW_KEY] = null;
  }
}

export function getWindowRecordsEditContext() {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = window[RECORDS_EDIT_WINDOW_KEY];
  return value && typeof value === 'object' ? value : null;
}

export function setWindowRecordsEditContext(value) {
  if (typeof window === 'undefined') {
    return;
  }
  window[RECORDS_EDIT_WINDOW_KEY] = value && typeof value === 'object' ? value : null;
}

export function clearWindowRecordsEditContext() {
  if (typeof window === 'undefined') {
    return;
  }
  delete window[RECORDS_EDIT_WINDOW_KEY];
}

export function getRecordsEditContext() {
  const storage = getSessionStorage();
  return parseStoredJson(storage?.getItem(RECORDS_EDIT_CONTEXT_KEY));
}

export function getRecordsEditFallbackContext() {
  const storage = getSessionStorage();
  return parseStoredJson(storage?.getItem(RECORDS_EDIT_FALLBACK_KEY));
}

export function getPersistedRecordsEditContext() {
  const storage = getLocalStorage();
  return parseStoredJson(storage?.getItem(RECORDS_EDIT_PERSISTED_KEY));
}

export function setRecordsEditContext(context) {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  const serialized = JSON.stringify(context && typeof context === 'object' ? context : {});
  sessionStorage?.setItem(RECORDS_EDIT_CONTEXT_KEY, serialized);
  sessionStorage?.setItem(RECORDS_EDIT_FALLBACK_KEY, serialized);
  localStorage?.setItem(RECORDS_EDIT_PERSISTED_KEY, serialized);
}

export function clearRecordsEditContext() {
  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();
  sessionStorage?.removeItem(RECORDS_EDIT_CONTEXT_KEY);
  sessionStorage?.removeItem(RECORDS_EDIT_FALLBACK_KEY);
  localStorage?.removeItem(RECORDS_EDIT_PERSISTED_KEY);
}

export function getSharedBillSelection() {
  const storage = getSessionStorage();
  return parseStoredJson(storage?.getItem(SHARED_BILL_SELECTION_KEY));
}

export function setSharedBillSelection(payload) {
  getSessionStorage()?.setItem(SHARED_BILL_SELECTION_KEY, JSON.stringify(payload && typeof payload === 'object' ? payload : {}));
}

export function clearSharedBillSelection() {
  getSessionStorage()?.removeItem(SHARED_BILL_SELECTION_KEY);
}

export function getSelectedPropertyContext() {
  const storage = getSessionStorage();
  return parseStoredJson(storage?.getItem(SELECTED_PROPERTY_CONTEXT_KEY));
}

export function setSelectedPropertyContext(payload) {
  getSessionStorage()?.setItem(
    SELECTED_PROPERTY_CONTEXT_KEY,
    JSON.stringify(payload && typeof payload === 'object' ? payload : {})
  );
}

export function clearSelectedPropertyContext() {
  getSessionStorage()?.removeItem(SELECTED_PROPERTY_CONTEXT_KEY);
}

export function getPropertyRecordDraft() {
  const storage = getSessionStorage();
  return parseStoredJson(storage?.getItem(PROPERTY_RECORD_DRAFT_KEY));
}

export function setPropertyRecordDraft(payload) {
  getSessionStorage()?.setItem(PROPERTY_RECORD_DRAFT_KEY, JSON.stringify(payload && typeof payload === 'object' ? payload : {}));
}

export function clearPropertyRecordDraft() {
  getSessionStorage()?.removeItem(PROPERTY_RECORD_DRAFT_KEY);
}

export function clearBillEditDrafts(keys = []) {
  const storage = getSessionStorage();
  keys.forEach((key) => storage?.removeItem(key));
}

export {
  PROPERTY_RECORD_DRAFT_KEY,
  RECORDS_EDIT_CONTEXT_KEY,
  RECORDS_EDIT_FALLBACK_KEY,
  RECORDS_EDIT_PERSISTED_KEY,
  SELECTED_PROPERTY_CONTEXT_KEY,
  SHARED_BILL_SELECTION_KEY,
};
