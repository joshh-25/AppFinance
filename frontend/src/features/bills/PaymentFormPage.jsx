// Finance App File: frontend\src\pages\PaymentFormPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import BillingsFlowTabs from '../../shared/components/BillingsFlowTabs.jsx';
import Toast from '../../shared/components/Toast.jsx';
import PaymentForm from '../../shared/components/PaymentForm.jsx';
import UploadModal from '../../shared/components/UploadModal.jsx';
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx';
import ErrorDialog from '../../shared/components/ErrorDialog.jsx';
import {
  createBill,
  fetchOcrHealth,
  fetchBills,
  fetchPropertyRecords,
  lookupPropertyByAccountNumber,
  updateBill,
  uploadBill
} from '../../shared/lib/api.js';
import { cleanTextValue, getPropertyRecordLabel } from '../../shared/lib/billPropertyUtils.js';
import { getBillingsFlowNextPath, getBillingsFlowPrevPath } from '../../shared/lib/billingsFlow.js';
import { normalizeAccountNumberForLookup } from '../../shared/lib/accountLookupParser.js';
import { detectBillTypeFromData, normalizeUploadData, validateUploadExtraction } from '../../shared/lib/ocrParser.js';
import {
  clearPropertyRecordDraft,
  clearRecordsEditContext,
  clearSelectedPropertyContext,
  clearSharedBillSelection,
  clearWindowRecordsEditContext,
  ensureRecordsEditWindowContext,
  getPersistedRecordsEditContext,
  getRecordsEditContext,
  getRecordsEditFallbackContext,
  getSelectedPropertyContext,
  getSharedBillSelection,
  getWindowRecordsEditContext,
  RECORDS_EDIT_CONTEXT_KEY,
  RECORDS_EDIT_FALLBACK_KEY,
  SELECTED_PROPERTY_CONTEXT_KEY,
  SHARED_BILL_SELECTION_KEY,
  setRecordsEditContext,
  setSelectedPropertyContext,
  setSharedBillSelection,
} from '../../shared/lib/billingWorkflowState.js';
import { resolveUploadPropertyBeforeRender } from './lib/uploadPropertyResolver.js';
import {
  clearScopedGlobalEditMode,
  getGlobalEditMode,
  getScopedGlobalEditMode,
  setScopedGlobalEditMode,
  subscribeGlobalEditMode
} from '../../shared/lib/globalEditMode.js';
import { useToast } from '../../shared/hooks/useToast.js';
import {
  ACCOUNT_LOOKUP_FIELD_BY_BILL_TYPE,
  ALL_TYPE_FIELDS,
  BILL_DUE_DATE_FIELDS,
  BILL_FLOW_MODES,
  BILL_MODE_TO_TYPE,
  BILL_TYPE_FIELDS,
  BILL_TYPE_RECORD_FIELDS,
  EDIT_DRAFT_KEY_PREFIX,
  INITIAL_EDIT_LOCK,
  INITIAL_FORM,
  ROWS_PER_PAGE,
  SHARED_BILL_SAVE_FIELDS,
  buildClearedFormForBillType,
  buildEditLock,
  buildPropertyRecordContextFromBillForm,
  buildTabScopedPayload,
  buildUpdatePayloadForType,
  deriveDuePeriodFromDueDate,
  getBillTypeUploadLabel,
  getContextBillIdByType,
  getPreSaveBillError,
  mapRecordsContextToForm,
  normalizeBillTypeValue,
  shouldIncludeBillRowForType,
  toFriendlyErrorMessage
} from './lib/paymentFormState.js';

ensureRecordsEditWindowContext();

export default function PaymentFormPage({ billMode: billModeProp } = {}) {
  const { billType: urlBillType } = useParams();
  // Prop takes priority (used by integration test stub wrappers).
  // URL param is used when rendered directly by the router.
  const rawBillMode = billModeProp || urlBillType || 'water';
  const billMode = BILL_FLOW_MODES.includes(rawBillMode) ? rawBillMode : 'water';
  const location = useLocation();
  const navigate = useNavigate();
  const recordsEditContextFromQuery = useMemo(() => {
    try {
      const raw = new URLSearchParams(location.search).get('ctx');
      if (!raw) {
        return null;
      }
      const decoded = decodeURIComponent(raw);
      const json = decodeURIComponent(escape(window.atob(decoded)));
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }, [location.search]);
  const recordsEditContextFromState =
    location.state && typeof location.state === 'object' && location.state.recordsEditContext &&
    typeof location.state.recordsEditContext === 'object'
      ? location.state.recordsEditContext
      : null;
  // Track when bill type changes to trigger fields animation
  const [fieldsAnimating, setFieldsAnimating] = useState(false);
  const prevBillModeRef = useRef(billMode);
  const fromPropertyRecordsNext = location.state?.fromPropertyRecordsNext === true;
  const isListRoute = location.pathname.endsWith('/list');

  // Trigger slide-fade animation ONLY on the fields section when bill type changes.
  // The card container / AppLayout never re-mounts, so no background flash.
  useEffect(() => {
    if (prevBillModeRef.current !== billMode) {
      prevBillModeRef.current = billMode;
      setFieldsAnimating(true);
      const timer = window.setTimeout(() => setFieldsAnimating(false), 220);
      return () => window.clearTimeout(timer);
    }
  }, [billMode]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMismatchDialog, setUploadMismatchDialog] = useState({
    open: false,
    title: 'Bill Type Mismatch',
    message: ''
  });
  const [unsavedNavigationDialog, setUnsavedNavigationDialog] = useState({
    open: false,
    to: ''
  });
  const [comboSearch, setComboSearch] = useState('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState(false);
  const [ocrUploadHealthy, setOcrUploadHealthy] = useState(true);
  const [ocrUploadHealthMessage, setOcrUploadHealthMessage] = useState('');
  const [editingBillId, setEditingBillId] = useState(null);
  const [editLock, setEditLock] = useState(INITIAL_EDIT_LOCK);
  const [panelMode, setPanelMode] = useState(isListRoute ? 'table' : 'form');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => ({
    form: INITIAL_FORM,
    comboSearch: ''
  }));
  const [hasAppliedPropertyContext, setHasAppliedPropertyContext] = useState(false);
  const [isNavigationStateHydrated, setIsNavigationStateHydrated] = useState(false);
  const [globalEditSnapshot, setGlobalEditSnapshot] = useState(() => getGlobalEditMode());
  const pendingReviewNavigationResolverRef = useRef(null);
  const formRef = useRef(INITIAL_FORM);
  const comboSearchRef = useRef('');
  const autoLookupRequestRef = useRef(0);
  const lastAutoLookupKeyRef = useRef('');
  const saveBillRef = useRef(async () => false);
  const baselineSnapshotRef = useRef({
    form: INITIAL_FORM,
    comboSearch: ''
  });
  const { toasts, showToast, removeToast } = useToast();
  const normalizedBillMode = BILL_MODE_TO_TYPE[billMode] !== undefined ? billMode : 'water';
  const currentBaseRoute = `/bills/${normalizedBillMode}`;
  const forcedBillType = BILL_MODE_TO_TYPE[normalizedBillMode];
  const nextFlowPath = getBillingsFlowNextPath(currentBaseRoute);
  const prevFlowPath = getBillingsFlowPrevPath(currentBaseRoute);
  const isLastFlowStep = nextFlowPath === null;
  const finalStepBackPath = '/property-records';
  const activeBillType = forcedBillType;
  const editDraftKey = `${EDIT_DRAFT_KEY_PREFIX}${normalizedBillMode}`;
  const billSelectionKey = SHARED_BILL_SELECTION_KEY;
  const billsScopedSnapshot = globalEditSnapshot.scopes?.bills || { active: false, context: null };
  const isRecordsEditMode = billsScopedSnapshot.active === true && billsScopedSnapshot.context?.source === 'records';
  const isEditMode = editingBillId !== null;
  const isUiEditMode = isRecordsEditMode || isEditMode;
  const formModeLabel =
    isRecordsEditMode ? 'Editing from Records' : isUiEditMode ? 'Editing Bill' : 'New Bill';
  const isDirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(baselineSnapshot.form) || comboSearch !== baselineSnapshot.comboSearch,
    [form, comboSearch, baselineSnapshot]
  );

  const isRecordsEditModeActive = useCallback(() => {
    const snapshot = getScopedGlobalEditMode('bills');
    return snapshot.active === true && snapshot.context?.source === 'records';
  }, []);

  const setBillsGlobalEditMode = useCallback(
    (nextContext) => {
      if (isRecordsEditModeActive()) {
        return;
      }

      setScopedGlobalEditMode('bills', nextContext);
    },
    [isRecordsEditModeActive]
  );

  const clearGlobalEditModeIfNotRecords = useCallback(() => {
    if (isRecordsEditModeActive()) {
      return;
    }

    clearScopedGlobalEditMode('bills');
  }, [isRecordsEditModeActive]);

  useEffect(() => {
    setPanelMode(isListRoute ? 'table' : 'form');
  }, [isListRoute]);

  useEffect(() => {
    formRef.current = form;
    comboSearchRef.current = comboSearch;
    baselineSnapshotRef.current = baselineSnapshot;
  }, [form, comboSearch, baselineSnapshot]);

  useEffect(() => subscribeGlobalEditMode(setGlobalEditSnapshot), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetchOcrHealth();
        if (cancelled) {
          return;
        }
        const healthy = health?.healthy !== false;
        setOcrUploadHealthy(healthy);
        setOcrUploadHealthMessage(String(health?.message || 'OCR service is not reachable.'));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setOcrUploadHealthy(false);
        setOcrUploadHealthMessage(String(error?.message || 'OCR service health check failed.'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => setIsNavigationStateHydrated(true), 0);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY);
    const hasStateContext = recordsEditContextFromState && typeof recordsEditContextFromState === 'object';
    const hasQueryContext = recordsEditContextFromQuery && typeof recordsEditContextFromQuery === 'object';
    const rawFallback = window.sessionStorage.getItem(RECORDS_EDIT_FALLBACK_KEY);
    const rawPersisted = getPersistedRecordsEditContext();
    const windowContext = getWindowRecordsEditContext();
    const scopedSnapshot = getScopedGlobalEditMode('bills');
    const scopedContext =
      scopedSnapshot.active === true &&
      scopedSnapshot.context &&
      typeof scopedSnapshot.context.records_edit_context === 'object'
        ? scopedSnapshot.context.records_edit_context
        : null;
    if (!raw && !hasStateContext && !hasQueryContext && !rawFallback && !scopedContext && !rawPersisted && !windowContext) {
      return;
    }

    let context = null;
    if (hasStateContext) {
      context = recordsEditContextFromState;
    } else if (hasQueryContext) {
      context = recordsEditContextFromQuery;
    } else if (raw) {
      try {
        context = JSON.parse(raw);
      } catch {
        window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
        return;
      }
    } else if (rawFallback) {
      try {
        context = JSON.parse(rawFallback);
      } catch {
        window.sessionStorage.removeItem(RECORDS_EDIT_FALLBACK_KEY);
        return;
      }
    } else if (scopedContext) {
      context = scopedContext;
    } else if (rawPersisted) {
      context = rawPersisted;
    } else if (windowContext) {
      context = windowContext;
    }

    if (!context || typeof context !== 'object') {
      clearRecordsEditContext();
      clearWindowRecordsEditContext();
      return;
    }

    setRecordsEditContext(context);

    const contextBillType = normalizeBillTypeValue(context.bill_type || '');
    let resolvedContext = context;
    if (contextBillType !== '' && contextBillType !== activeBillType) {
      // Keep Records context during Billings tab switches and align bill_type
      // to the currently opened tab.
      resolvedContext = {
        ...context,
        bill_type: activeBillType
      };
      setRecordsEditContext(resolvedContext);
    }

    const contextBillId = getContextBillIdByType(resolvedContext, activeBillType);

    const nextForm = mapRecordsContextToForm(resolvedContext, activeBillType);
    const nextLabel =
      nextForm.property && String(nextForm.property).trim() !== '' ? nextForm.property : nextForm.dd || '';
    const nextBaseline = {
      form: nextForm,
      comboSearch: nextLabel
    };

    window.sessionStorage.removeItem(editDraftKey);
    clearSelectedPropertyContext();

    formRef.current = nextForm;
    comboSearchRef.current = nextLabel;
    baselineSnapshotRef.current = nextBaseline;
    setForm(nextForm);
    setComboSearch(nextLabel);
    setBaselineSnapshot(nextBaseline);
    setEditingBillId(contextBillId > 0 ? contextBillId : null);
    setEditLock(contextBillId > 0 ? buildEditLock(resolvedContext, activeBillType) : INITIAL_EDIT_LOCK);
    setPanelMode('form');
    setHasAppliedPropertyContext(true);
    if (contextBillId > 0) {
      setBillsGlobalEditMode({
        source: 'bills',
        bill_mode: normalizedBillMode,
        bill_type: activeBillType,
        editing_bill_id: contextBillId
      });
    } else {
      // Keep Records edit mode active even when this tab has no module-specific bill row yet.
      // This prevents mode flip to "Create Mode" while navigating bill tabs.
      setScopedGlobalEditMode('bills', {
        source: 'records',
        bill_type: activeBillType,
        records_edit_context: resolvedContext
      });
      window.sessionStorage.setItem(
        billSelectionKey,
        JSON.stringify({
          form: nextForm,
          property_list_id: Number(nextForm.property_list_id || 0),
          dd: nextForm.dd || '',
          property: nextForm.property || '',
          due_period: nextForm.due_period || '',
          comboSearch: nextLabel
        })
      );
    }
  }, [
    activeBillType,
    billSelectionKey,
    editDraftKey,
    normalizedBillMode,
    recordsEditContextFromQuery,
    recordsEditContextFromState,
    setBillsGlobalEditMode
  ]);

  useEffect(() => {
    if (
      window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY) ||
      window.sessionStorage.getItem(RECORDS_EDIT_FALLBACK_KEY)
    ) {
      return;
    }
    const hasEditDraft = !!window.sessionStorage.getItem(editDraftKey);
    const hasBillSelection = !!window.sessionStorage.getItem(billSelectionKey);
    const hasPropertyContext = !!window.sessionStorage.getItem(SELECTED_PROPERTY_CONTEXT_KEY);
    if (fromPropertyRecordsNext || hasEditDraft || hasBillSelection || hasPropertyContext) {
      return;
    }

    // Direct access baseline: empty create form.
    const emptyForm = buildClearedFormForBillType(activeBillType);
    const emptyBaseline = {
      form: emptyForm,
      comboSearch: ''
    };
    formRef.current = emptyForm;
    comboSearchRef.current = '';
    baselineSnapshotRef.current = emptyBaseline;
    setForm(emptyForm);
    setComboSearch('');
    setBaselineSnapshot(emptyBaseline);
    setEditingBillId(null);
    setEditLock(INITIAL_EDIT_LOCK);
    clearGlobalEditModeIfNotRecords();
  }, [activeBillType, billSelectionKey, clearGlobalEditModeIfNotRecords, editDraftKey, fromPropertyRecordsNext]);

  useEffect(() => {
    const rawRecordsContext = getRecordsEditContext();
    const rawFallbackContext = getRecordsEditFallbackContext();
    if (rawRecordsContext || rawFallbackContext) {
      window.sessionStorage.removeItem(editDraftKey);
      return;
    }

    const hasExistingEditDraft = window.sessionStorage.getItem(editDraftKey);
    const rawContext = getSelectedPropertyContext();
    if (rawContext) {
      // Preserve current bill edit draft when switching tabs while still in edit mode.
      if (hasExistingEditDraft) {
        return;
      }
      // No draft exists: apply fresh Property Records context.
      window.sessionStorage.removeItem(editDraftKey);
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(editDraftKey);
      if (!raw) {
        return;
      }
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object' || !draft.editingBillId) {
        return;
      }

      const restoredForm = {
        ...INITIAL_FORM,
        ...(draft.form || {}),
        bill_type: activeBillType
      };
      const restoredBaseline = {
        form: {
          ...INITIAL_FORM,
          ...(draft.baselineSnapshot?.form || restoredForm),
          bill_type: activeBillType
        },
        comboSearch: String(draft.baselineSnapshot?.comboSearch || draft.comboSearch || '')
      };
      const restoredComboSearch = String(draft.comboSearch || '');

      formRef.current = restoredForm;
      comboSearchRef.current = restoredComboSearch;
      baselineSnapshotRef.current = restoredBaseline;
      setForm(restoredForm);
      setComboSearch(restoredComboSearch);
      setBaselineSnapshot(restoredBaseline);
      setEditingBillId(draft.editingBillId);
      setEditLock(
        draft.editLock && typeof draft.editLock === 'object'
          ? { ...INITIAL_EDIT_LOCK, ...draft.editLock }
          : buildEditLock(draft.form || restoredForm, activeBillType)
      );
      setPanelMode('form');
      setBillsGlobalEditMode({
        source: 'bills',
        bill_mode: normalizedBillMode,
        bill_type: activeBillType,
        editing_bill_id: Number(draft.editingBillId || 0)
      });
    } catch {
      window.sessionStorage.removeItem(editDraftKey);
    }
  }, [activeBillType, editDraftKey, normalizedBillMode, setBillsGlobalEditMode]);

  useEffect(() => {
    if (editingBillId === null) {
      return;
    }

    const draft = {
      editingBillId,
      editLock,
      form,
      comboSearch,
      baselineSnapshot
    };
    window.sessionStorage.setItem(editDraftKey, JSON.stringify(draft));
  }, [editingBillId, editLock, form, comboSearch, baselineSnapshot, editDraftKey]);

  useEffect(() => {
    if (editingBillId !== null) {
      return;
    }
    if (window.sessionStorage.getItem(editDraftKey)) {
      return;
    }
    if (window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY)) {
      return;
    }
    if (window.sessionStorage.getItem(RECORDS_EDIT_FALLBACK_KEY)) {
      return;
    }

    try {
      const selection = getSharedBillSelection();
      if (!selection) {
        return;
      }

      const persistedForm = selection.form && typeof selection.form === 'object' ? selection.form : null;
      const persistedPropertyListId = Number(selection.property_list_id || persistedForm?.property_list_id || 0);
      const persistedDd = String(selection.dd || persistedForm?.dd || '');
      const persistedProperty = String(selection.property || persistedForm?.property || '');
      const persistedBillingPeriod = String(selection.due_period || persistedForm?.due_period || '');
      const persistedComboSearch = String(selection.comboSearch || '');

      const nextForm = {
        ...INITIAL_FORM,
        ...(persistedForm || {}),
        bill_type: activeBillType,
        property_list_id: persistedPropertyListId,
        dd: persistedDd,
        property: persistedProperty,
        due_period: persistedBillingPeriod
      };
      const nextBaseline = {
        form: nextForm,
        comboSearch: persistedComboSearch
      };

      formRef.current = nextForm;
      comboSearchRef.current = persistedComboSearch;
      baselineSnapshotRef.current = nextBaseline;
      setForm(nextForm);
      setComboSearch(persistedComboSearch);
      setBaselineSnapshot(nextBaseline);
    } catch {
      window.sessionStorage.removeItem(billSelectionKey);
    }
  }, [activeBillType, editingBillId, editDraftKey, billSelectionKey]);

  useEffect(() => {
    if (!isNavigationStateHydrated) {
      return;
    }

    const persistedPropertyListId = Number(form.property_list_id || 0);
    const persistedDd = String(form.dd || '').trim();
    const persistedProperty = String(form.property || '').trim();
    const persistedComboSearch = String(comboSearch || '').trim();

    if (persistedPropertyListId <= 0 && persistedDd === '' && persistedProperty === '' && persistedComboSearch === '') {
      window.sessionStorage.removeItem(billSelectionKey);
      return;
    }

    const payload = {
      form,
      property_list_id: Number(form.property_list_id || 0),
      dd: form.dd || '',
      property: form.property || '',
      due_period: form.due_period || '',
      comboSearch: comboSearch || ''
    };
    window.sessionStorage.setItem(billSelectionKey, JSON.stringify(payload));
  }, [form, comboSearch, billSelectionKey, isNavigationStateHydrated]);

  useEffect(() => {
    if (hasAppliedPropertyContext) {
      return;
    }
    if (editingBillId !== null) {
      return;
    }
    if (isDirty) {
      return;
    }
    if (window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY)) {
      return;
    }

    const rawContext = window.sessionStorage.getItem(SELECTED_PROPERTY_CONTEXT_KEY);
    if (!rawContext) {
      return;
    }

    let context = null;
    try {
      context = JSON.parse(rawContext);
    } catch {
      window.sessionStorage.removeItem(SELECTED_PROPERTY_CONTEXT_KEY);
      return;
    }

    if (!context || typeof context !== 'object') {
      return;
    }

    const contextPropertyListId = Number(context.property_list_id || context.id || 0);
    const ddValue = String(context.dd || '').trim();
    const propertyValue = String(context.property || '').trim();
    if (contextPropertyListId <= 0 && ddValue === '' && propertyValue === '') {
      return;
    }

    let selection = null;
    try {
      const rawSelection = window.sessionStorage.getItem(billSelectionKey);
      if (rawSelection) {
        selection = JSON.parse(rawSelection);
      }
    } catch {
      selection = null;
    }

    const baseContextLabel = propertyValue !== '' ? propertyValue : ddValue;
    const contextLabel = baseContextLabel;
    const shouldStartFreshFromPropertyRecords = fromPropertyRecordsNext === true;
    const persistedForm =
      !shouldStartFreshFromPropertyRecords && selection?.form && typeof selection.form === 'object'
        ? selection.form
        : null;
    const nextComboSearch = String(
      shouldStartFreshFromPropertyRecords ? contextLabel || '' : selection?.comboSearch || contextLabel || ''
    );
    const nextPropertyListId = Number(
      shouldStartFreshFromPropertyRecords
        ? contextPropertyListId || 0
        : selection?.property_list_id || persistedForm?.property_list_id || contextPropertyListId || 0
    );
    const nextDdValue = String(
      shouldStartFreshFromPropertyRecords ? ddValue || '' : selection?.dd || persistedForm?.dd || ddValue || ''
    );
    const nextPropertyValue = String(
      shouldStartFreshFromPropertyRecords
        ? propertyValue || ''
        : selection?.property || persistedForm?.property || propertyValue || ''
    );
    const nextBillingPeriod = String(
      shouldStartFreshFromPropertyRecords
        ? context.due_period || ''
        : selection?.due_period || persistedForm?.due_period || context.due_period || ''
    );
    const prefilledCreateForm = {
      ...buildClearedFormForBillType(activeBillType),
      ...(persistedForm || {}),
      bill_type: activeBillType,
      property_list_id: nextPropertyListId,
      dd: nextDdValue,
      property: nextPropertyValue,
      due_period: nextBillingPeriod,
      unit_owner: context.unit_owner || '',
      classification: context.classification || '',
      deposit: context.deposit || '',
      rent: context.rent || '',
      association_payment_status: context.association_payment_status || context.payment_status_assoc || '',
      real_property_tax: context.real_property_tax || context.rent_property_tax || '',
      rpt_payment_status: context.rpt_payment_status || context.payment_status_rpt || '',
      penalty: context.penalty || '',
      per_property_status: context.per_property_status || ''
    };

    const prefilledBaseline = {
      form: prefilledCreateForm,
      comboSearch: nextComboSearch
    };
    formRef.current = prefilledCreateForm;
    comboSearchRef.current = nextComboSearch;
    baselineSnapshotRef.current = prefilledBaseline;
    setForm(prefilledCreateForm);
    setComboSearch(nextComboSearch);
    setBaselineSnapshot(prefilledBaseline);
    setEditingBillId(null);
    setEditLock(INITIAL_EDIT_LOCK);
    clearScopedGlobalEditMode('bills');
    setPanelMode('form');
    setHasAppliedPropertyContext(true);
  }, [activeBillType, editingBillId, isDirty, hasAppliedPropertyContext, billSelectionKey, fromPropertyRecordsNext]);

  const { data: propertyRecords = [], isLoading: loadingPropertyRecords } = useQuery({
    queryKey: ['property-record-options'],
    queryFn: fetchPropertyRecords,
    enabled: true
  });

  const {
    data: billRows = [],
    isLoading: loadingBillRows,
    isError: isBillRowsError,
    error: billRowsError,
    refetch: refetchBillRows
  } = useQuery({
    queryKey: ['bill-records-list'],
    queryFn: fetchBills,
    enabled: panelMode === 'table'
  });

  useEffect(() => {
    if (forcedBillType && form.bill_type !== forcedBillType) {
      setForm((prev) => {
        const next = { ...prev, bill_type: forcedBillType };
        formRef.current = next;
        return next;
      });
      setBaselineSnapshot((prev) => {
        const nextBaseline = {
          ...prev,
          form: {
            ...prev.form,
            bill_type: forcedBillType
          }
        };
        baselineSnapshotRef.current = nextBaseline;
        return nextBaseline;
      });
    }
  }, [forcedBillType, form.bill_type]);

  function updateField(event) {
    const { name, value } = event.target;
    const next = { ...formRef.current, [name]: value };
    if (BILL_DUE_DATE_FIELDS.has(name)) {
      const derivedDuePeriod = deriveDuePeriodFromDueDate(value);
      if (derivedDuePeriod !== '') {
        next.due_period = derivedDuePeriod;
      }
    }
    formRef.current = next;
    setForm(next);
  }

  const filteredPropertyOptions = useMemo(() => {
    const query = comboSearch.trim().toLowerCase();
    return propertyRecords.filter((record) => {
      const label = getPropertyRecordLabel(record).toLowerCase();
      const owner = String(record.unit_owner || '').toLowerCase();
      return query === '' || label.includes(query) || owner.includes(query);
    });
  }, [propertyRecords, comboSearch]);

  const persistBillSelection = useCallback((nextForm, label) => {
    window.sessionStorage.setItem(
      billSelectionKey,
      JSON.stringify({
        form: nextForm,
        property_list_id: Number(nextForm.property_list_id || 0),
        dd: nextForm.dd || '',
        property: nextForm.property || '',
        due_period: nextForm.due_period || '',
        comboSearch: label
      })
    );
    window.sessionStorage.setItem(
      SELECTED_PROPERTY_CONTEXT_KEY,
      JSON.stringify(buildPropertyRecordContextFromBillForm(nextForm))
    );
  }, [billSelectionKey]);

  const applyResolvedPropertyMatch = useCallback((match) => {
    if (!match || typeof match !== 'object') {
      return false;
    }

    const resolvedPropertyListId = Number(match.property_list_id || 0);
    const resolvedPropertyName = String(match.property || match.property_name || '').trim();
    const resolvedDd = String(match.dd || '').trim();
    if (resolvedPropertyListId <= 0 && resolvedPropertyName === '' && resolvedDd === '') {
      return false;
    }

    const canonicalRecord =
      resolvedPropertyListId > 0
        ? propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === resolvedPropertyListId)
        : null;
    const canonicalProperty = String(canonicalRecord?.property || '').trim();
    const canonicalDd = String(canonicalRecord?.dd || '').trim();

    const next = {
      ...formRef.current,
      bill_type: activeBillType,
      property_list_id: resolvedPropertyListId > 0 ? resolvedPropertyListId : Number(formRef.current.property_list_id || 0),
      dd: canonicalDd || resolvedDd || formRef.current.dd || '',
      property: canonicalProperty || resolvedPropertyName || formRef.current.property || '',
      due_period: formRef.current.due_period || match.due_period || '',
      unit_owner: match.unit_owner || formRef.current.unit_owner || '',
      classification: match.classification || formRef.current.classification || '',
      deposit: match.deposit || formRef.current.deposit || '',
      rent: match.rent || formRef.current.rent || '',
      per_property_status: match.per_property_status || formRef.current.per_property_status || '',
      real_property_tax: match.real_property_tax || formRef.current.real_property_tax || '',
      rpt_payment_status: match.rpt_payment_status || formRef.current.rpt_payment_status || '',
      penalty: match.penalty || formRef.current.penalty || ''
    };

    const label = next.property && String(next.property).trim() !== '' ? next.property : next.dd || '';
    formRef.current = next;
    setForm(next);
    comboSearchRef.current = label;
    setComboSearch(label);
    setIsComboDropdownOpen(false);
    persistBillSelection(next, label);
    return true;
  }, [activeBillType, persistBillSelection, propertyRecords]);

  useEffect(() => {
    const propertyListId = Number(form.property_list_id || 0);
    if (propertyListId <= 0 || !Array.isArray(propertyRecords) || propertyRecords.length === 0) {
      return;
    }

    const canonicalRecord = propertyRecords.find(
      (record) => Number(record.property_list_id || record.id || 0) === propertyListId
    );
    if (!canonicalRecord) {
      return;
    }

    const canonicalProperty = String(canonicalRecord.property || '').trim();
    const canonicalDd = String(canonicalRecord.dd || '').trim();
    if (canonicalProperty === '' && canonicalDd === '') {
      return;
    }

    if (canonicalProperty === String(form.property || '').trim() && canonicalDd === String(form.dd || '').trim()) {
      return;
    }

    const next = {
      ...formRef.current,
      property: canonicalProperty || formRef.current.property || '',
      dd: canonicalDd || formRef.current.dd || '',
      unit_owner: canonicalRecord.unit_owner || formRef.current.unit_owner || '',
      classification: canonicalRecord.classification || formRef.current.classification || '',
      deposit: canonicalRecord.deposit || formRef.current.deposit || '',
      rent: canonicalRecord.rent || formRef.current.rent || '',
      per_property_status: canonicalRecord.per_property_status || formRef.current.per_property_status || '',
      real_property_tax: canonicalRecord.real_property_tax || formRef.current.real_property_tax || '',
      rpt_payment_status: canonicalRecord.rpt_payment_status || formRef.current.rpt_payment_status || '',
      penalty: canonicalRecord.penalty || formRef.current.penalty || ''
    };

    const label = next.property && String(next.property).trim() !== '' ? next.property : next.dd || '';
    formRef.current = next;
    setForm(next);
    comboSearchRef.current = label;
    setComboSearch(label);
    persistBillSelection(next, label);
  }, [form.property_list_id, form.property, form.dd, persistBillSelection, propertyRecords]);

  function handleOptionSelect(record) {
    const selectedPropertyListId = Number(record.property_list_id || record.id || 0);
    if (!isEditMode) {
      setEditingBillId(null);
      setEditLock(INITIAL_EDIT_LOCK);
      window.sessionStorage.removeItem(editDraftKey);
      clearScopedGlobalEditMode('bills');
    }
    const next = {
      ...formRef.current,
      bill_type: activeBillType,
      property_list_id: selectedPropertyListId,
      dd: record.dd || '',
      property: record.property || '',
      due_period: record.due_period || formRef.current.due_period || '',
      unit_owner: record.unit_owner || '',
      classification: record.classification || '',
      deposit: record.deposit || '',
      rent: record.rent || '',
      per_property_status: record.per_property_status || '',
      real_property_tax: record.real_property_tax || '',
      rpt_payment_status: record.rpt_payment_status || '',
      penalty: record.penalty || ''
    };
    formRef.current = next;
    setForm(next);
    const label = getPropertyRecordLabel(record);
    comboSearchRef.current = label;
    setComboSearch(label);
    setIsComboDropdownOpen(false);
    persistBillSelection(next, label);
  }

  async function saveBill() {
    const currentForm = formRef.current;
    const preSaveError = getPreSaveBillError(currentForm, activeBillType);
    if (preSaveError !== '') {
      setFormFeedback({
        tone: 'warning',
        title: 'Check Before Saving',
        message: preSaveError
      });
      showToast('error', preSaveError);
      return false;
    }

    setFormFeedback({
      tone: 'info',
      title: editingBillId !== null ? 'Saving Changes' : 'Saving Bill',
      message: 'Please wait while your bill record is being saved.'
    });
    setSaving(true);

    try {
      const shouldUpdate = editingBillId !== null;
      const runWaterUpdate = () => updateBill(editingBillId, buildUpdatePayloadForType(currentForm, 'water', editLock));
      const runElectricityUpdate = () =>
        updateBill(editingBillId, buildUpdatePayloadForType(currentForm, 'electricity', editLock));
      const runInternetUpdate = () =>
        updateBill(editingBillId, buildUpdatePayloadForType(currentForm, 'internet', editLock));
      const runAssociationUpdate = () =>
        updateBill(editingBillId, buildUpdatePayloadForType(currentForm, 'association_dues', editLock));

      const createPayload = buildTabScopedPayload(currentForm, activeBillType);

      let result = null;
      if (shouldUpdate) {
        if (activeBillType === 'water') {
          result = await runWaterUpdate();
        } else if (activeBillType === 'electricity') {
          result = await runElectricityUpdate();
        } else if (activeBillType === 'internet') {
          result = await runInternetUpdate();
        } else {
          result = await runAssociationUpdate();
        }
      } else {
        result = await createBill(createPayload);
      }
      showToast(
        'success',
        result.message || (shouldUpdate ? 'Record updated successfully.' : 'Record saved successfully.')
      );
      setFormFeedback({
        tone: 'success',
        title: shouldUpdate ? 'Changes Saved' : 'Bill Saved',
        message: shouldUpdate
          ? 'Your bill changes were saved. You can keep editing or move to another step.'
          : 'Your bill was saved successfully.'
      });
      const nextForm = {
        ...INITIAL_FORM,
        ...currentForm,
        bill_type: activeBillType
      };
      const nextLabel =
        nextForm.property && String(nextForm.property).trim() !== '' ? nextForm.property : nextForm.dd || '';
      formRef.current = nextForm;
      setForm(nextForm);
      comboSearchRef.current = nextLabel;
      setComboSearch(nextLabel);
      if (shouldUpdate) {
        // Stay in edit mode after saving; user exits edit mode only via Cancel.
        const activeEditId = Number(editingBillId || 0);
        if (activeEditId > 0) {
          setEditingBillId(activeEditId);
          setBillsGlobalEditMode({
            source: isRecordsEditMode ? 'records' : 'bills',
            bill_mode: normalizedBillMode,
            bill_type: activeBillType,
            editing_bill_id: activeEditId
          });
        }
      } else {
        setEditingBillId(null);
        setEditLock(INITIAL_EDIT_LOCK);
        window.sessionStorage.removeItem(editDraftKey);
      }
      const nextBaseline = {
        form: nextForm,
        comboSearch: nextLabel
      };
      baselineSnapshotRef.current = nextBaseline;
      setBaselineSnapshot(nextBaseline);
      window.sessionStorage.setItem(
        billSelectionKey,
        JSON.stringify({
          form: nextForm,
          property_list_id: Number(nextForm.property_list_id || 0),
          dd: nextForm.dd || '',
          property: nextForm.property || '',
          due_period: nextForm.due_period || '',
          comboSearch: nextLabel
        })
      );
      if (panelMode === 'table') {
        await refetchBillRows();
      }
      return true;
    } catch (error) {
      setFormFeedback({
        tone: 'error',
        title: 'Save Did Not Finish',
        message: toFriendlyErrorMessage(error.message)
      });
      showToast('error', toFriendlyErrorMessage(error.message));
      return false;
    } finally {
      setSaving(false);
    }
  }

  saveBillRef.current = saveBill;

  const visibleBillRows = useMemo(
    () => billRows.filter((row) => shouldIncludeBillRowForType(row, activeBillType)),
    [billRows, activeBillType]
  );

  const billTableColumns = useMemo(
    () => [['display_property_dd', 'Property / DD'], ...(BILL_TYPE_FIELDS[activeBillType] || [])],
    [activeBillType]
  );

  const filteredBillRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return visibleBillRows;
    }

    return visibleBillRows.filter((row) =>
      billTableColumns.some(([key]) => {
        const rawValue =
          key === 'display_property_dd'
            ? row.property && String(row.property).trim() !== ''
              ? row.property
              : row.dd || ''
            : row[key] || '';
        return String(rawValue).toLowerCase().includes(query);
      })
    );
  }, [visibleBillRows, tableSearch, billTableColumns]);

  const totalPages = Math.max(1, Math.ceil(filteredBillRows.length / ROWS_PER_PAGE));
  const safePage = Math.min(tablePage, totalPages);
  const pageStartIndex = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredBillRows.slice(pageStartIndex, pageStartIndex + ROWS_PER_PAGE);
  const pageStart = filteredBillRows.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = pageStartIndex + pageRows.length;

  function handleEditBill(row) {
    const nextForm = {
      ...INITIAL_FORM,
      ...row,
      property_list_id: Number(row.property_list_id || 0),
      bill_type: activeBillType
    };
    const nextLabel = row.property && String(row.property).trim() !== '' ? row.property : row.dd || '';

    formRef.current = nextForm;
    comboSearchRef.current = nextLabel;
    setForm(nextForm);
    setComboSearch(nextLabel);
    setEditingBillId(row.id);
    setEditLock(buildEditLock(row, activeBillType));
    setBillsGlobalEditMode({
      source: 'bills',
      bill_mode: normalizedBillMode,
      bill_type: activeBillType,
      editing_bill_id: Number(row.id)
    });
    const nextBaseline = {
      form: nextForm,
      comboSearch: nextLabel
    };
    baselineSnapshotRef.current = nextBaseline;
    setBaselineSnapshot(nextBaseline);
    setFormFeedback({
      tone: 'info',
      title: 'Editing Bill',
      message: 'You are editing an existing saved bill. Press Save Changes when you finish.'
    });
    setPanelMode('form');
  }

  function handleBackToForm() {
    setFormFeedback(null);
    setPanelMode('form');
    setTableSearch('');
    setTablePage(1);
    navigate(currentBaseRoute, {
      state: fromPropertyRecordsNext ? { fromPropertyRecordsNext: true } : null
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await saveBill();
  }

  function handleClearFields() {
    const clearedForm = {
      ...INITIAL_FORM,
      bill_type: activeBillType
    };
    const clearedBaseline = {
      form: clearedForm,
      comboSearch: ''
    };

    formRef.current = clearedForm;
    comboSearchRef.current = '';
    baselineSnapshotRef.current = clearedBaseline;

    setForm(clearedForm);
    setComboSearch('');
    setBaselineSnapshot(clearedBaseline);
    setEditingBillId(null);
    setEditLock(INITIAL_EDIT_LOCK);
    lastAutoLookupKeyRef.current = '';
    autoLookupRequestRef.current = 0;

    window.sessionStorage.removeItem(editDraftKey);
    clearSharedBillSelection();
    clearSelectedPropertyContext();
    clearPropertyRecordDraft();
    clearRecordsEditContext();
    clearWindowRecordsEditContext();
    clearScopedGlobalEditMode('bills');
  }

  function persistFlowSelectionContext() {
    const currentForm = formRef.current && typeof formRef.current === 'object' ? formRef.current : form;
    const currentComboSearch =
      String(comboSearchRef.current || '').trim() !== ''
        ? comboSearchRef.current
        : comboSearch || currentForm.property || currentForm.dd || '';
    const payload = {
      form: currentForm,
      property_list_id: Number(currentForm.property_list_id || 0),
      dd: currentForm.dd || '',
      property: currentForm.property || '',
      due_period: currentForm.due_period || '',
      comboSearch: currentComboSearch
    };
    setSharedBillSelection(payload);
    setSelectedPropertyContext(buildPropertyRecordContextFromBillForm(currentForm));
  }

  function navigateWithFlowContext(to) {
    if (to === '/property-records') {
      clearPropertyRecordDraft();
    }

    const isInternalBillingsRoute = String(to).startsWith('/bills/');
    // fromPropertyRecordsNext should only apply on first entry into Billings.
    // Do not carry it across tab-to-tab navigation, or tab hydration will reset fields.
    const navigationState =
      !isInternalBillingsRoute && fromPropertyRecordsNext ? { fromPropertyRecordsNext: true } : null;
    navigate(to, { state: navigationState });
  }

  function clearBillingsContextForReviewNavigation() {
    BILL_FLOW_MODES.forEach((mode) => {
      window.sessionStorage.removeItem(`${EDIT_DRAFT_KEY_PREFIX}${mode}`);
    });
    clearSharedBillSelection();
    clearSelectedPropertyContext();
    clearRecordsEditContext();
    clearWindowRecordsEditContext();
    clearPropertyRecordDraft();
    clearScopedGlobalEditMode('bills');
  }

  function resolvePendingReviewNavigation(allowNavigation) {
    if (pendingReviewNavigationResolverRef.current) {
      pendingReviewNavigationResolverRef.current(allowNavigation);
      pendingReviewNavigationResolverRef.current = null;
    }
  }

  function handleLayoutNavigateAttempt(to) {
    if (to !== '/bills/review') {
      return true;
    }

    if (panelMode === 'form' && isDirty) {
      return new Promise((resolve) => {
        resolvePendingReviewNavigation(false);
        pendingReviewNavigationResolverRef.current = resolve;
        setUnsavedNavigationDialog({
          open: true,
          to
        });
      });
    }

    clearBillingsContextForReviewNavigation();
    return true;
  }

  useEffect(
    () => () => {
      resolvePendingReviewNavigation(false);
    },
    []
  );

  function handleBillFlowNavigation(to) {
    if (!to) {
      return;
    }
    persistFlowSelectionContext();
    navigateWithFlowContext(to);
  }

  useEffect(() => {
    function handleShortcut(event) {
      const key = String(event.key || '').toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || key !== 's') {
        return;
      }
      if (panelMode !== 'form' || saving || uploading) {
        return;
      }
      event.preventDefault();
      void saveBillRef.current();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
  }, [panelMode, saving, uploading]);

  function handleComboInputChange(event) {
    const nextSearch = event.target.value;
    if (!isEditMode) {
      setEditingBillId(null);
      setEditLock(INITIAL_EDIT_LOCK);
      window.sessionStorage.removeItem(editDraftKey);
      clearGlobalEditModeIfNotRecords();
    }
    comboSearchRef.current = nextSearch;
    setComboSearch(nextSearch);
    setIsComboDropdownOpen(true);

    if (nextSearch.trim() === '') {
      const nextForm = {
        ...formRef.current,
        property_list_id: 0,
        dd: '',
        property: '',
        due_period: '',
        unit_owner: '',
        classification: '',
        deposit: '',
        rent: '',
        association_payment_status: '',
        real_property_tax: '',
        rpt_payment_status: '',
        penalty: ''
      };
      formRef.current = nextForm;
      setForm(nextForm);
      return;
    }

    const normalizedSearch = nextSearch.trim().toLowerCase();
    const matchedRecord = propertyRecords.find(
      (record) => getPropertyRecordLabel(record).trim().toLowerCase() === normalizedSearch
    );
    if (matchedRecord) {
      handleOptionSelect(matchedRecord);
    }
  }

  function handleTableSearchChange(event) {
    setTableSearch(event.target.value);
    setTablePage(1);
  }

  async function handleModuleUpload(event) {
    if (!ocrUploadHealthy) {
      setFormFeedback({
        tone: 'warning',
        title: 'Upload Unavailable',
        message: ocrUploadHealthMessage || 'OCR service is unavailable right now.'
      });
      showToast('warning', ocrUploadHealthMessage || 'OCR service is unavailable right now.');
      event.target.value = '';
      return;
    }

    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const file = files[0];
    if (files.length > 1) {
      setFormFeedback({
        tone: 'warning',
        title: 'One File At A Time',
        message: 'This bill screen scans one file at a time. Use Bills Review for batch upload.'
      });
      showToast('warning', 'Module upload scans one file at a time. Use Bill Review for batch upload.');
    }

    setFormFeedback({
      tone: 'info',
      title: 'Uploading Bill',
      message: `Scanning ${file.name}. Please wait while the bill fields are filled in.`
    });
    setUploading(true);
    // Allow the same account + due-period to be looked up again after repeated uploads.
    lastAutoLookupKeyRef.current = '';

    try {
      const result = await uploadBill(file, {
        bill_type: activeBillType,
        property_list_id: Number(formRef.current.property_list_id || 0),
        dd: formRef.current.dd || '',
        property: formRef.current.property || '',
        due_period: formRef.current.due_period || ''
      });

      const normalized = normalizeUploadData(result) || {};
      const detectedBillType = normalizeBillTypeValue(
        normalized.bill_type || detectBillTypeFromData(normalized) || ''
      );
      const activeTypeValidation = validateUploadExtraction(normalized, activeBillType);
      const isDetectedTypeMismatch = detectedBillType !== '' && detectedBillType !== activeBillType;
      const allowMixedUploadForActiveModule = isDetectedTypeMismatch && activeTypeValidation.valid;

      if (isDetectedTypeMismatch && !allowMixedUploadForActiveModule) {
        const detectedLabel = getBillTypeUploadLabel(detectedBillType);
        const expectedLabel = getBillTypeUploadLabel(activeBillType);
        setUploadMismatchDialog({
          open: true,
          title: 'Bill Type Mismatch',
          message: `Bill type mismatch detected. This file appears to be "${detectedLabel}", but you are currently in "${expectedLabel} Bills". Please upload the correct bill type. This file was rejected and was not added to Bills Review.`
        });
        setIsUploadModalOpen(false);
        return;
      }

      const nextForm = {
        ...formRef.current,
        bill_type: activeBillType
      };

      SHARED_BILL_SAVE_FIELDS.forEach((field) => {
        const value = normalized[field];
        if (value === undefined || value === null) {
          return;
        }
        if (field === 'property_list_id') {
          const propertyListId = Number(value || 0);
          if (propertyListId > 0) {
            nextForm.property_list_id = propertyListId;
          }
          return;
        }
        if (cleanTextValue(value) !== '') {
          nextForm[field] = value;
        }
      });

      const nextPropertyListId = Number(nextForm.property_list_id || 0);
      if (nextPropertyListId > 0) {
        const canonicalRecord = propertyRecords.find(
          (record) => Number(record.property_list_id || record.id || 0) === nextPropertyListId
        );
        if (canonicalRecord) {
          nextForm.dd = canonicalRecord.dd || nextForm.dd || '';
          nextForm.property = canonicalRecord.property || nextForm.property || '';
          nextForm.unit_owner = canonicalRecord.unit_owner || nextForm.unit_owner || '';
          nextForm.classification = canonicalRecord.classification || nextForm.classification || '';
          nextForm.deposit = canonicalRecord.deposit || nextForm.deposit || '';
          nextForm.rent = canonicalRecord.rent || nextForm.rent || '';
          nextForm.per_property_status = canonicalRecord.per_property_status || nextForm.per_property_status || '';
          nextForm.real_property_tax = canonicalRecord.real_property_tax || nextForm.real_property_tax || '';
          nextForm.rpt_payment_status = canonicalRecord.rpt_payment_status || nextForm.rpt_payment_status || '';
          nextForm.penalty = canonicalRecord.penalty || nextForm.penalty || '';
        }
      }

      (BILL_TYPE_RECORD_FIELDS[activeBillType] || []).forEach((field) => {
        const value = normalized[field];
        if (value === undefined || value === null) {
          return;
        }
        if (cleanTextValue(value) !== '') {
          nextForm[field] = value;
        }
      });

      await resolveUploadPropertyBeforeRender({
        nextForm,
        activeBillType,
        accountLookupFieldByType: ACCOUNT_LOOKUP_FIELD_BY_BILL_TYPE,
        lookupPropertyByAccountNumber,
        propertyRecords
      });

      formRef.current = nextForm;
      setForm(nextForm);

      const nextLabel =
        nextForm.property && String(nextForm.property).trim() !== ''
          ? nextForm.property
          : nextForm.dd || comboSearchRef.current || '';
      comboSearchRef.current = nextLabel;
      setComboSearch(nextLabel);

      const validation = validateUploadExtraction(nextForm, activeBillType);
      if (!validation.valid) {
        setFormFeedback({
          tone: 'warning',
          title: 'Upload Needs Review',
          message: validation.message || 'Upload complete. Review the extracted fields before saving.'
        });
        showToast('warning', validation.message || 'Upload complete. Review extracted fields before saving.');
      } else if ((validation.warnings || []).length > 0) {
        setFormFeedback({
          tone: 'warning',
          title: 'Upload Complete with Warnings',
          message: validation.message || 'Upload complete, but some OCR fields still need manual review.'
        });
        showToast('warning', validation.message || 'Upload complete, but some OCR fields still need manual review.');
      } else {
        setFormFeedback({
          tone: 'success',
          title: 'Upload Complete',
          message: `The bill was scanned and the fields were filled from ${file.name}.`
        });
        showToast('success', `Uploaded ${file.name} and filled bill fields.`);
      }

      setIsUploadModalOpen(false);
    } catch (error) {
      setFormFeedback({
        tone: 'error',
        title: 'Upload Failed',
        message: String(error?.message || 'Upload failed.')
      });
      showToast('error', String(error?.message || 'Upload failed.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  const lookupAccountField = ACCOUNT_LOOKUP_FIELD_BY_BILL_TYPE[activeBillType] || '';
  const lookupAccountValue = lookupAccountField ? form[lookupAccountField] : '';

  useEffect(() => {
    if (lookupAccountField === '' || isEditMode) {
      return;
    }

    const normalizedAccount = normalizeAccountNumberForLookup(lookupAccountValue);
    if (normalizedAccount.length < 4) {
      return;
    }

    const lookupKey = `${activeBillType}|${normalizedAccount}|${String(form.due_period || '').trim()}`;
    if (lastAutoLookupKeyRef.current === lookupKey) {
      return;
    }

    const requestId = autoLookupRequestRef.current + 1;
    autoLookupRequestRef.current = requestId;

    const timer = window.setTimeout(async () => {
      try {
        let result = null;
        try {
          result = await lookupPropertyByAccountNumber({
            accountNumber: lookupAccountValue,
            utilityType: activeBillType,
            duePeriod: form.due_period || ''
          });
        } catch (primaryError) {
          const primaryMessage = String(primaryError?.message || '').toLowerCase();
          if (!primaryMessage.includes('no matching property found')) {
            throw primaryError;
          }

          // Fallback: search across all utility mappings for this account number.
          result = await lookupPropertyByAccountNumber({
            accountNumber: lookupAccountValue,
            duePeriod: form.due_period || ''
          });
        }

        if (autoLookupRequestRef.current !== requestId) {
          return;
        }

        const matched = result?.data || null;
        const matchStatus = String(matched?.match_status || 'matched').trim().toLowerCase();
        if (matchStatus === 'needs_review') {
          const candidateCount = Math.max(0, Number(matched?.candidate_count || 0));
          const reviewMessage =
            candidateCount > 1
              ? `Multiple properties share this account number (${candidateCount} matches). Select Property / DD manually.`
              : 'This account number needs manual review. Select Property / DD manually.';
          showToast('warning', reviewMessage);
          return;
        }

        const matchedPropertyId = Number(matched?.property_list_id || 0);
        const matchedPropertyName = String(matched?.property || matched?.property_name || '').trim().toLowerCase();
        const currentPropertyId = Number(formRef.current.property_list_id || 0);
        const currentPropertyName = String(formRef.current.property || '').trim().toLowerCase();
        const shouldApplyById = matchedPropertyId > 0 && matchedPropertyId !== currentPropertyId;
        const shouldApplyByName = matchedPropertyName !== '' && matchedPropertyName !== currentPropertyName;
        if (shouldApplyById || shouldApplyByName) {
          applyResolvedPropertyMatch(matched);
        }
      } catch (error) {
        const message = String(error?.message || '');
        if (!message.toLowerCase().includes('no matching property found')) {
          showToast('error', message || 'Failed to auto-match account number.');
        }
      } finally {
        if (autoLookupRequestRef.current === requestId) {
          lastAutoLookupKeyRef.current = lookupKey;
        }
      }
    }, 360);

    return () => window.clearTimeout(timer);
  }, [
    activeBillType,
    applyResolvedPropertyMatch,
    form.due_period,
    isEditMode,
    lookupAccountField,
    lookupAccountValue,
    showToast
  ]);

  const BILL_TITLES = {
    wifi: 'WiFi Bills',
    water: 'Water Bills',
    electricity: 'Electricity Bills',
    association: 'Association Bills'
  };

  return (
    <AppLayout
      title={BILL_TITLES[billMode] || 'Bills'}
      contentClassName="shell-content-lock-scroll"
      onNavigateAttempt={handleLayoutNavigateAttempt}
    >
      <Toast toasts={toasts} onDismiss={removeToast} />
      <BillingsFlowTabs currentPath={location.pathname} onNavigate={handleBillFlowNavigation} />

      {/* The main card wrapper no longer animates, only the fields inside. */}
      <PaymentForm
        fieldsAnimating={fieldsAnimating}
        panelMode={panelMode}
        formModeLabel={formModeLabel}
        isEditMode={isUiEditMode}
        isUpdateMode={isEditMode}
        comboSearch={comboSearch}
        onComboChange={handleComboInputChange}
        onComboFocus={() => setIsComboDropdownOpen(true)}
        onComboBlur={() => {
          window.setTimeout(() => setIsComboDropdownOpen(false), 120);
        }}
        loadingPropertyRecords={loadingPropertyRecords}
        filteredPropertyOptions={filteredPropertyOptions}
        isComboDropdownOpen={isComboDropdownOpen}
        getPropertyRecordLabel={getPropertyRecordLabel}
        onOptionSelect={handleOptionSelect}
        form={form}
        onUpdateField={updateField}
        activeBillType={activeBillType}
        allTypeFields={ALL_TYPE_FIELDS}
        billTypeFields={BILL_TYPE_FIELDS}
        onSubmit={handleSubmit}
        tableSearch={tableSearch}
        onTableSearchChange={handleTableSearchChange}
        onBackToForm={handleBackToForm}
        onRefresh={() => refetchBillRows()}
        loadingBillRows={loadingBillRows}
        isBillRowsError={isBillRowsError}
        billRowsError={billRowsError}
        filteredBillRows={filteredBillRows}
        billTableColumns={billTableColumns}
        pageRows={pageRows}
        onEditBill={handleEditBill}
        pageStart={pageStart}
        pageEnd={pageEnd}
        onPrevPage={() => setTablePage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setTablePage((prev) => Math.min(totalPages, prev + 1))}
        safePage={safePage}
        totalPages={totalPages}
        onClearFields={handleClearFields}
        onCancelEdit={handleClearFields}
        saving={saving}
        uploading={uploading}
        ocrUploadHealthy={ocrUploadHealthy}
        ocrUploadMessage={ocrUploadHealthMessage}
        prevFlowPath={prevFlowPath}
        isLastFlowStep={isLastFlowStep}
        nextFlowPath={nextFlowPath}
        onNavigatePrev={() => handleBillFlowNavigation(prevFlowPath)}
        onNavigateNext={() => handleBillFlowNavigation(nextFlowPath)}
        onNavigateBack={() => handleBillFlowNavigation(finalStepBackPath)}
        onOpenUpload={() => {
          if (!ocrUploadHealthy) {
            setFormFeedback({
              tone: 'warning',
              title: 'Upload Unavailable',
              message: ocrUploadHealthMessage || 'OCR service is unavailable right now.'
            });
            showToast('warning', ocrUploadHealthMessage || 'OCR service is unavailable right now.');
            return;
          }
          setIsUploadModalOpen(true);
        }}
        nextButtonLabel="Back to Property Records"
        formFeedback={formFeedback}
      />
      <UploadModal
        open={isUploadModalOpen}
        uploading={uploading}
        onClose={() => {
          if (!uploading) {
            setIsUploadModalOpen(false);
          }
        }}
        onUpload={handleModuleUpload}
      />
      <ConfirmDialog
        open={unsavedNavigationDialog.open}
        title="Unsaved Changes"
        message="You have unsaved changes in Billings. If you continue to Bills Review, your current edits will be discarded. Do you want to continue?"
        confirmText="Continue to Bills Review"
        cancelText="Keep Editing"
        onCancel={() => {
          setUnsavedNavigationDialog({
            open: false,
            to: ''
          });
          resolvePendingReviewNavigation(false);
        }}
        onConfirm={() => {
          setUnsavedNavigationDialog({
            open: false,
            to: ''
          });
          clearBillingsContextForReviewNavigation();
          resolvePendingReviewNavigation(true);
        }}
      />
      <ErrorDialog
        open={uploadMismatchDialog.open}
        title={uploadMismatchDialog.title}
        message={uploadMismatchDialog.message}
        buttonText="OK"
        onClose={() =>
          setUploadMismatchDialog({
            open: false,
            title: 'Bill Type Mismatch',
            message: ''
          })
        }
      />
    </AppLayout>
  );
}

