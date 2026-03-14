import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPropertyRecordDraft,
  clearRecordsEditContext,
  clearSelectedPropertyContext,
  clearSharedBillSelection,
  clearWindowRecordsEditContext,
  ensureRecordsEditWindowContext,
  getPersistedRecordsEditContext,
  getPropertyRecordDraft,
  getRecordsEditContext,
  getRecordsEditFallbackContext,
  getSelectedPropertyContext,
  getSharedBillSelection,
  getWindowRecordsEditContext,
  setPropertyRecordDraft,
  setRecordsEditContext,
  setSelectedPropertyContext,
  setSharedBillSelection,
  setWindowRecordsEditContext,
} from '../billingWorkflowState.js';

describe('billingWorkflowState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    clearWindowRecordsEditContext();
  });

  it('persists and clears records edit context across session/local storage', () => {
    const payload = { dd: 'DD-001', property: 'Unit A', editing_bill_id: 7 };

    setRecordsEditContext(payload);

    expect(getRecordsEditContext()).toEqual(payload);
    expect(getRecordsEditFallbackContext()).toEqual(payload);
    expect(getPersistedRecordsEditContext()).toEqual(payload);

    clearRecordsEditContext();

    expect(getRecordsEditContext()).toBeNull();
    expect(getRecordsEditFallbackContext()).toBeNull();
    expect(getPersistedRecordsEditContext()).toBeNull();
  });

  it('persists shared selection, property context, and property drafts', () => {
    const selection = { property: 'Unit B', due_period: '2026-03' };
    const propertyContext = { property_list_id: 9, property: 'Unit B' };
    const draft = { form: { property: 'Unit B' }, selectedId: 9 };

    setSharedBillSelection(selection);
    setSelectedPropertyContext(propertyContext);
    setPropertyRecordDraft(draft);

    expect(getSharedBillSelection()).toEqual(selection);
    expect(getSelectedPropertyContext()).toEqual(propertyContext);
    expect(getPropertyRecordDraft()).toEqual(draft);

    clearSharedBillSelection();
    clearSelectedPropertyContext();
    clearPropertyRecordDraft();

    expect(getSharedBillSelection()).toBeNull();
    expect(getSelectedPropertyContext()).toBeNull();
    expect(getPropertyRecordDraft()).toBeNull();
  });

  it('tracks records edit context on window for cross-screen navigation', () => {
    ensureRecordsEditWindowContext();
    expect(getWindowRecordsEditContext()).toBeNull();

    const payload = { dd: 'DD-002', property: 'Unit C' };
    setWindowRecordsEditContext(payload);
    expect(getWindowRecordsEditContext()).toEqual(payload);

    clearWindowRecordsEditContext();
    expect(getWindowRecordsEditContext()).toBeNull();
  });
});
