// Finance App File: frontend\src\pages\PaymentFormPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import BillingsFlowTabs from '../../shared/components/BillingsFlowTabs.jsx';
import Toast from '../../shared/components/Toast.jsx';
import PaymentForm from '../../shared/components/PaymentForm.jsx';
import UploadModal from '../../shared/components/UploadModal.jsx';
import AccountLookupUploadModal from '../../shared/components/AccountLookupUploadModal.jsx';
import ErrorDialog from '../../shared/components/ErrorDialog.jsx';
import {
  createBill,
  fetchBills,
  fetchPropertyRecords,
  importAccountLookupEntries,
  lookupPropertyByAccountNumber,
  updateBill,
  uploadBill
} from '../../shared/lib/api.js';
import { getBillingsFlowNextPath, getBillingsFlowPrevPath } from '../../shared/lib/billingsFlow.js';
import { normalizeAccountNumberForLookup, parseAccountLookupFiles } from '../../shared/lib/accountLookupParser.js';
import { detectBillTypeFromData, normalizeUploadData, validateUploadExtraction } from '../../shared/lib/ocrParser.js';
import {
  clearScopedGlobalEditMode,
  getGlobalEditMode,
  getScopedGlobalEditMode,
  setScopedGlobalEditMode,
  subscribeGlobalEditMode
} from '../../shared/lib/globalEditMode.js';
import { useToast } from '../../shared/hooks/useToast.js';

const ROWS_PER_PAGE = 10;
const EDIT_DRAFT_KEY_PREFIX = 'finance-bill-edit-draft:';
const SHARED_BILL_SELECTION_KEY = 'finance-bill-selection:shared';
const SELECTED_PROPERTY_CONTEXT_KEY = 'finance:selected-property-record';
const RECORDS_EDIT_CONTEXT_KEY = 'finance:records-edit-context';
const PROPERTY_RECORD_DRAFT_KEY = 'finance:property-record-draft';

const INITIAL_FORM = {
  bill_type: 'water',
  property_list_id: 0,
  dd: '',
  property: '',
  billing_period: '',
  unit_owner: '',
  classification: '',
  deposit: '',
  rent: '',
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
  real_property_tax: '',
  rpt_payment_status: '',
  penalty: '',
  per_property_status: ''
};

const INITIAL_EDIT_LOCK = {
  property_list_id: 0,
  dd: '',
  property: '',
  billing_period: '',
  bill_type: ''
};

const BILL_TYPE_FIELDS = {
  internet: [
    ['internet_provider', 'Internet Provider'],
    ['internet_account_no', 'Account No.'],
    ['wifi_amount', 'Wifi'],
    ['wifi_due_date', 'Due Date Wifi'],
    ['wifi_payment_status', 'Payment Status WiFi']
  ],
  water: [
    ['water_account_no', 'Water Account No.'],
    ['water_amount', 'Water'],
    ['water_due_date', 'Due Date Water'],
    ['water_payment_status', 'Payment Status Water']
  ],
  electricity: [
    ['electricity_account_no', 'Electricity Account No.'],
    ['electricity_amount', 'Electricity'],
    ['electricity_due_date', 'Due Date Electricity'],
    ['electricity_payment_status', 'Payment Status Electricity']
  ],
  association_dues: [
    ['association_dues', 'Association Dues'],
    ['association_due_date', 'Association Due Date'],
    ['association_payment_status', 'Association Payment Status']
  ]
};

const BILL_TYPE_RECORD_FIELDS = {
  internet: ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'],
  water: ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'],
  electricity: ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'],
  association_dues: ['association_dues', 'association_due_date', 'association_payment_status']
};

const SHARED_BILL_SAVE_FIELDS = [
  'property_list_id',
  'dd',
  'property',
  'billing_period',
  'unit_owner',
  'classification',
  'deposit',
  'rent',
  'real_property_tax',
  'rpt_payment_status',
  'penalty',
  'per_property_status'
];

const BILL_MODE_TO_TYPE = {
  water: 'water',
  electricity: 'electricity',
  wifi: 'internet',
  association: 'association_dues'
};
const BILL_FLOW_MODES = ['wifi', 'water', 'electricity', 'association'];
const BILL_TYPE_UPLOAD_LABELS = {
  internet: 'WiFi',
  water: 'Water',
  electricity: 'Electricity',
  association_dues: 'Association'
};

const ACCOUNT_LOOKUP_FIELD_BY_BILL_TYPE = {
  internet: 'internet_account_no',
  water: 'water_account_no',
  electricity: 'electricity_account_no'
};

const ALL_TYPE_FIELDS = [
  ['internet_provider', 'Internet Provider'],
  ['internet_account_no', 'Account No.'],
  ['wifi_amount', 'Wifi'],
  ['wifi_due_date', 'Due Date Wifi'],
  ['wifi_payment_status', 'Payment Status WiFi'],
  ['water_account_no', 'Water Account No.'],
  ['water_amount', 'Water'],
  ['water_due_date', 'Due Date Water'],
  ['water_payment_status', 'Payment Status Water'],
  ['electricity_account_no', 'Electricity Account No.'],
  ['electricity_amount', 'Electricity'],
  ['electricity_due_date', 'Due Date Electricity'],
  ['electricity_payment_status', 'Payment Status Electricity'],
  ['association_dues', 'Association Dues'],
  ['association_due_date', 'Association Due Date'],
  ['association_payment_status', 'Association Payment Status']
];

function cleanTextValue(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBillTypeValue(value) {
  const normalized = cleanTextValue(value).toLowerCase();
  if (normalized === 'wifi') {
    return 'internet';
  }
  if (normalized === 'association') {
    return 'association_dues';
  }
  return normalized;
}

function rowHasBillTypeData(row, billType) {
  const fields = BILL_TYPE_RECORD_FIELDS[billType] || [];
  return fields.some((field) => cleanTextValue(row?.[field]) !== '');
}

function shouldIncludeBillRowForType(row, billType) {
  if (!row || typeof row !== 'object') {
    return false;
  }

  const hasTypeData = rowHasBillTypeData(row, billType);
  if (hasTypeData) {
    return true;
  }

  const normalizedType = normalizeBillTypeValue(row.bill_type);
  if (normalizedType !== billType) {
    return false;
  }

  return true;
}

function getContextBillIdByType(context, billType) {
  switch (billType) {
    case 'internet':
      return context.wifi_bill_id;
    case 'water':
      return context.water_bill_id;
    case 'electricity':
      return context.electricity_bill_id;
    case 'association_dues':
      return context.association_dues_bill_id;
    default:
      return null;
  }
}

function mapRecordsContextToForm(context, billType) {
  const base = { ...INITIAL_FORM, bill_type: billType };
  if (!context) return base;

  SHARED_BILL_SAVE_FIELDS.forEach((field) => {
    if (context[field] !== undefined && context[field] !== null) {
      base[field] = context[field];
    }
  });

  const typeFields = BILL_TYPE_RECORD_FIELDS[billType] || [];
  typeFields.forEach((field) => {
    if (context[field] !== undefined && context[field] !== null) {
      base[field] = context[field];
    }
  });

  return base;
}

function buildEditLock(form, billType) {
  return {
    property_list_id: form.property_list_id,
    dd: form.dd,
    property: form.property,
    billing_period: form.billing_period,
    bill_type: billType
  };
}

function buildClearedFormForBillType(billType) {
  return { ...INITIAL_FORM, bill_type: billType };
}

function buildUpdatePayloadForType(form, type, editLock = INITIAL_EDIT_LOCK) {
  const payload = { bill_type: type };
  SHARED_BILL_SAVE_FIELDS.forEach((f) => {
    payload[f] = form[f];
  });
  const mappedType = type === 'internet' ? 'wifi' : type;
  const targetFields = BILL_TYPE_FIELDS[mappedType] || BILL_TYPE_FIELDS[type] || [];
  targetFields.forEach(([key]) => {
    payload[key] = form[key];
  });
  return {
    ...payload,
    target_property_list_id: Number(editLock?.property_list_id || 0),
    target_dd: editLock?.dd || '',
    target_property: editLock?.property || '',
    target_billing_period: editLock?.billing_period || '',
    target_bill_type: editLock?.bill_type || type
  };
}

function buildTabScopedPayload(form, type) {
  return buildUpdatePayloadForType(form, type);
}

function buildPostSaveForm(form, type) {
  const base = { ...INITIAL_FORM, bill_type: type };
  SHARED_BILL_SAVE_FIELDS.forEach((f) => {
    base[f] = form[f];
  });
  return base;
}

function buildPropertyRecordContextFromBillForm(form) {
  const source = form && typeof form === 'object' ? form : INITIAL_FORM;
  return {
    property_list_id: Number(source.property_list_id || 0),
    dd: source.dd || '',
    property: source.property || '',
    billing_period: source.billing_period || '',
    unit_owner: source.unit_owner || '',
    classification: source.classification || '',
    deposit: source.deposit || '',
    rent: source.rent || '',
    per_property_status: source.per_property_status || '',
    real_property_tax: source.real_property_tax || '',
    rpt_payment_status: source.rpt_payment_status || '',
    penalty: source.penalty || ''
  };
}

function toFriendlyErrorMessage(error) {
  const msg = error?.message || String(error);
  if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
    return 'A record with this DD and Billing Period already exists.';
  }
  return msg;
}

function getBillTypeUploadLabel(type) {
  return BILL_TYPE_UPLOAD_LABELS[type] || String(type || '').replace(/_/g, ' ');
}



export default function PaymentFormPage({ billMode: billModeProp } = {}) {
  const { billType: urlBillType } = useParams();
  // Prop takes priority (used by integration test stub wrappers).
  // URL param is used when rendered directly by the router.
  const rawBillMode = billModeProp || urlBillType || 'water';
  const billMode = BILL_FLOW_MODES.includes(rawBillMode) ? rawBillMode : 'water';
  const location = useLocation();
  const navigate = useNavigate();
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAccountLookupUploadModalOpen, setIsAccountLookupUploadModalOpen] = useState(false);
  const [importingAccountLookup, setImportingAccountLookup] = useState(false);
  const [uploadMismatchDialog, setUploadMismatchDialog] = useState({
    open: false,
    title: 'Bill Type Mismatch',
    message: ''
  });
  const [comboSearch, setComboSearch] = useState('');
  const [isComboDropdownOpen, setIsComboDropdownOpen] = useState(false);
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
  const formRef = useRef(INITIAL_FORM);
  const comboSearchRef = useRef('');
  const autoLookupRequestRef = useRef(0);
  const lastAutoLookupKeyRef = useRef('');
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
  const formModeLabel =
    isRecordsEditMode && isEditMode ? 'Edit Mode (From Records)' : isEditMode ? 'Edit Mode' : 'Create Mode';
  const isDirty = useMemo(
    () =>
      JSON.stringify(form) !== JSON.stringify(baselineSnapshot.form) || comboSearch !== baselineSnapshot.comboSearch,
    [form, comboSearch, baselineSnapshot]
  );

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
    const timerId = window.setTimeout(() => setIsNavigationStateHydrated(true), 0);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY);
    if (!raw) {
      return;
    }

    let context = null;
    try {
      context = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    if (!context || typeof context !== 'object') {
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    const contextBillType = normalizeBillTypeValue(context.bill_type || '');
    if (contextBillType !== '' && contextBillType !== activeBillType) {
      // Ignore stale Records edit context from another bill module tab.
      clearScopedGlobalEditMode('bills');
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    const contextBillId = getContextBillIdByType(context, activeBillType);

    const nextForm = mapRecordsContextToForm(context, activeBillType);
    const nextLabel =
      nextForm.property && String(nextForm.property).trim() !== '' ? nextForm.property : nextForm.dd || '';
    const nextBaseline = {
      form: nextForm,
      comboSearch: nextLabel
    };

    window.sessionStorage.removeItem(editDraftKey);
    window.sessionStorage.removeItem(billSelectionKey);
    window.sessionStorage.removeItem(SELECTED_PROPERTY_CONTEXT_KEY);

    formRef.current = nextForm;
    comboSearchRef.current = nextLabel;
    baselineSnapshotRef.current = nextBaseline;
    setForm(nextForm);
    setComboSearch(nextLabel);
    setBaselineSnapshot(nextBaseline);
    setEditingBillId(contextBillId > 0 ? contextBillId : null);
    setEditLock(contextBillId > 0 ? buildEditLock(context, activeBillType) : INITIAL_EDIT_LOCK);
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
      clearScopedGlobalEditMode('bills');
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillType, billSelectionKey, editDraftKey, normalizedBillMode]);

  useEffect(() => {
    if (window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillType, billSelectionKey, editDraftKey, fromPropertyRecordsNext]);

  useEffect(() => {
    const rawRecordsContext = window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY);
    if (rawRecordsContext) {
      window.sessionStorage.removeItem(editDraftKey);
      return;
    }

    const hasExistingEditDraft = window.sessionStorage.getItem(editDraftKey);
    const rawContext = window.sessionStorage.getItem(SELECTED_PROPERTY_CONTEXT_KEY);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBillType, editDraftKey, normalizedBillMode]);

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

    try {
      const raw = window.sessionStorage.getItem(billSelectionKey);
      if (!raw) {
        return;
      }
      const selection = JSON.parse(raw);
      if (!selection || typeof selection !== 'object') {
        return;
      }

      const persistedForm = selection.form && typeof selection.form === 'object' ? selection.form : null;
      const persistedPropertyListId = Number(selection.property_list_id || persistedForm?.property_list_id || 0);
      const persistedDd = String(selection.dd || persistedForm?.dd || '');
      const persistedProperty = String(selection.property || persistedForm?.property || '');
      const persistedBillingPeriod = String(selection.billing_period || persistedForm?.billing_period || '');
      const persistedComboSearch = String(selection.comboSearch || '');

      const nextForm = {
        ...INITIAL_FORM,
        ...(persistedForm || {}),
        bill_type: activeBillType,
        property_list_id: persistedPropertyListId,
        dd: persistedDd,
        property: persistedProperty,
        billing_period: persistedBillingPeriod
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
      billing_period: form.billing_period || '',
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
        ? context.billing_period || ''
        : selection?.billing_period || persistedForm?.billing_period || context.billing_period || ''
    );
    const prefilledCreateForm = {
      ...buildClearedFormForBillType(activeBillType),
      ...(persistedForm || {}),
      bill_type: activeBillType,
      property_list_id: nextPropertyListId,
      dd: nextDdValue,
      property: nextPropertyValue,
      billing_period: nextBillingPeriod,
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

  function isRecordsEditModeActive() {
    const snapshot = getScopedGlobalEditMode('bills');
    return snapshot.active === true && snapshot.context?.source === 'records';
  }

  function setBillsGlobalEditMode(nextContext) {
    if (isRecordsEditModeActive()) {
      return;
    }

    setScopedGlobalEditMode('bills', nextContext);
  }

  function clearGlobalEditModeIfNotRecords() {
    if (isRecordsEditModeActive()) {
      return;
    }

    clearScopedGlobalEditMode('bills');
  }

  function updateField(event) {
    const { name, value } = event.target;
    const next = { ...formRef.current, [name]: value };
    formRef.current = next;
    setForm(next);
  }

  function getPropertyRecordLabel(record) {
    const propertyValue = String(record.property || '').trim();
    const ddValue = String(record.dd || '').trim();
    const baseLabel = propertyValue !== '' ? propertyValue : ddValue;
    return baseLabel;
  }

  const filteredPropertyOptions = useMemo(() => {
    const query = comboSearch.trim().toLowerCase();
    return propertyRecords.filter((record) => {
      const label = getPropertyRecordLabel(record).toLowerCase();
      const owner = String(record.unit_owner || '').toLowerCase();
      return query === '' || label.includes(query) || owner.includes(query);
    });
  }, [propertyRecords, comboSearch]);

  function persistBillSelection(nextForm, label) {
    window.sessionStorage.setItem(
      billSelectionKey,
      JSON.stringify({
        form: nextForm,
        property_list_id: Number(nextForm.property_list_id || 0),
        dd: nextForm.dd || '',
        property: nextForm.property || '',
        billing_period: nextForm.billing_period || '',
        comboSearch: label
      })
    );
    window.sessionStorage.setItem(
      SELECTED_PROPERTY_CONTEXT_KEY,
      JSON.stringify(buildPropertyRecordContextFromBillForm(nextForm))
    );
  }

  function applyResolvedPropertyMatch(match) {
    if (!match || typeof match !== 'object') {
      return false;
    }

    const resolvedPropertyListId = Number(match.property_list_id || 0);
    const resolvedPropertyName = String(match.property || match.property_name || '').trim();
    const resolvedDd = String(match.dd || '').trim();
    if (resolvedPropertyListId <= 0 && resolvedPropertyName === '' && resolvedDd === '') {
      return false;
    }

    const next = {
      ...formRef.current,
      bill_type: activeBillType,
      property_list_id: resolvedPropertyListId > 0 ? resolvedPropertyListId : Number(formRef.current.property_list_id || 0),
      dd: resolvedDd || formRef.current.dd || '',
      property: resolvedPropertyName || formRef.current.property || '',
      billing_period: formRef.current.billing_period || match.billing_period || '',
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
  }

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
      billing_period: record.billing_period || formRef.current.billing_period || '',
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
    if (
      Number(currentForm.property_list_id || 0) <= 0 &&
      String(currentForm.dd || '').trim() === '' &&
      String(currentForm.property || '').trim() === ''
    ) {
      showToast('error', 'Select a Property/DD before saving.');
      return false;
    }

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
      const nextForm = buildPostSaveForm(currentForm, activeBillType);
      const nextLabel =
        nextForm.property && String(nextForm.property).trim() !== '' ? nextForm.property : nextForm.dd || '';
      formRef.current = nextForm;
      setForm(nextForm);
      comboSearchRef.current = nextLabel;
      setComboSearch(nextLabel);
      setEditingBillId(null);
      setEditLock(INITIAL_EDIT_LOCK);
      window.sessionStorage.removeItem(editDraftKey);
      if (shouldUpdate) {
        // After a successful update, always leave edit mode (including Records-driven edit mode).
        clearScopedGlobalEditMode('bills');
        window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
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
          billing_period: nextForm.billing_period || '',
          comboSearch: nextLabel
        })
      );
      if (panelMode === 'table') {
        await refetchBillRows();
      }
      return true;
    } catch (error) {
      showToast('error', toFriendlyErrorMessage(error.message));
      return false;
    } finally {
      setSaving(false);
    }
  }

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
    setPanelMode('form');
  }

  function handleBackToForm() {
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

    window.sessionStorage.removeItem(editDraftKey);
    window.sessionStorage.removeItem(billSelectionKey);
    window.sessionStorage.removeItem(SELECTED_PROPERTY_CONTEXT_KEY);
    window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
    window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
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
      billing_period: currentForm.billing_period || '',
      comboSearch: currentComboSearch
    };
    window.sessionStorage.setItem(billSelectionKey, JSON.stringify(payload));
    window.sessionStorage.setItem(
      SELECTED_PROPERTY_CONTEXT_KEY,
      JSON.stringify(buildPropertyRecordContextFromBillForm(currentForm))
    );
  }

  async function handleBillFlowNavigation(to, options = {}) {
    if (!to) {
      return;
    }
    const { skipUnsavedPrompt = false } = options;
    persistFlowSelectionContext();
    if (to === '/property-records') {
      window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
    }
    const navigationState = fromPropertyRecordsNext ? { fromPropertyRecordsNext: true } : null;
    if (skipUnsavedPrompt) {
      navigate(to, { state: navigationState });
      return;
    }
    navigate(to, { state: navigationState });
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
      void saveBill();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelMode, saving, uploading, editingBillId, activeBillType]);

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
        billing_period: '',
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

  async function handleAccountLookupUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) {
      return;
    }

    setImportingAccountLookup(true);
    try {
      const { entries, stats } = await parseAccountLookupFiles(files);
      if (!Array.isArray(entries) || entries.length === 0) {
        showToast('warning', 'No account-number mappings were detected in the selected files.');
        return;
      }

      const result = await importAccountLookupEntries({ entries });
      const summary = result?.data || {};
      const inserted = Number(summary.inserted || 0);
      const updated = Number(summary.updated || 0);
      const skipped = Number(summary.skipped || 0);
      showToast(
        'success',
        `Imported account directory: ${inserted} inserted, ${updated} updated, ${skipped} skipped from ${stats.files} file(s).`
      );
      setIsAccountLookupUploadModalOpen(false);
    } catch (error) {
      showToast('error', String(error?.message || 'Failed to import account lookup files.'));
    } finally {
      setImportingAccountLookup(false);
    }
  }

  async function handleModuleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const file = files[0];
    if (files.length > 1) {
      showToast('warning', 'Module upload scans one file at a time. Use Bill Review for batch upload.');
    }

    setUploading(true);

    try {
      const result = await uploadBill(file, {
        bill_type: activeBillType,
        property_list_id: Number(formRef.current.property_list_id || 0),
        dd: formRef.current.dd || '',
        property: formRef.current.property || '',
        billing_period: formRef.current.billing_period || ''
      });

      const normalized = normalizeUploadData(result) || {};
      const detectedBillType = normalizeBillTypeValue(
        normalized.bill_type || detectBillTypeFromData(normalized) || ''
      );

      if (detectedBillType !== '' && detectedBillType !== activeBillType) {
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

      (BILL_TYPE_RECORD_FIELDS[activeBillType] || []).forEach((field) => {
        const value = normalized[field];
        if (value === undefined || value === null) {
          return;
        }
        if (cleanTextValue(value) !== '') {
          nextForm[field] = value;
        }
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
        showToast('warning', validation.message || 'Upload complete. Review extracted fields before saving.');
      } else {
        showToast('success', `Uploaded ${file.name} and filled bill fields.`);
      }

      setIsUploadModalOpen(false);
    } catch (error) {
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

    const lookupKey = `${activeBillType}|${normalizedAccount}|${String(form.billing_period || '').trim()}`;
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
            billingPeriod: form.billing_period || ''
          });
        } catch (primaryError) {
          const primaryMessage = String(primaryError?.message || '').toLowerCase();
          if (!primaryMessage.includes('no matching property found')) {
            throw primaryError;
          }

          // Fallback: search across all utility mappings for this account number.
          result = await lookupPropertyByAccountNumber({
            accountNumber: lookupAccountValue,
            billingPeriod: form.billing_period || ''
          });
        }

        if (autoLookupRequestRef.current !== requestId) {
          return;
        }

        const matched = result?.data || null;
        const matchedPropertyId = Number(matched?.property_list_id || 0);
        const matchedPropertyName = String(matched?.property || matched?.property_name || '').trim().toLowerCase();
        const currentPropertyId = Number(formRef.current.property_list_id || 0);
        const currentPropertyName = String(formRef.current.property || '').trim().toLowerCase();
        const shouldApplyById = matchedPropertyId > 0 && matchedPropertyId !== currentPropertyId;
        const shouldApplyByName = matchedPropertyName !== '' && matchedPropertyName !== currentPropertyName;
        if (shouldApplyById || shouldApplyByName) {
          const applied = applyResolvedPropertyMatch(matched);
          if (applied) {
            const propertyLabel = matched.property || matched.property_name || 'the matched property';
            showToast('info', `Account match found. Property auto-selected: ${propertyLabel}.`);
          }
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
    form.billing_period,
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
      subtitle="Create and update utility bill records by module."
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />
      <BillingsFlowTabs currentPath={location.pathname} onNavigate={handleBillFlowNavigation} />

      {/* The main card wrapper no longer animates, only the fields inside. */}
      <PaymentForm
        fieldsAnimating={fieldsAnimating}
        panelMode={panelMode}
        formModeLabel={formModeLabel}
        isEditMode={isEditMode}
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
        saving={saving}
        uploading={uploading}
        prevFlowPath={prevFlowPath}
        isLastFlowStep={isLastFlowStep}
        nextFlowPath={nextFlowPath}
        onNavigatePrev={() => handleBillFlowNavigation(prevFlowPath)}
        onNavigateNext={() => handleBillFlowNavigation(nextFlowPath)}
        onNavigateBack={() => handleBillFlowNavigation(finalStepBackPath, { skipUnsavedPrompt: true })}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenAccountLookupUpload={() => setIsAccountLookupUploadModalOpen(true)}
        importingAccountLookup={importingAccountLookup}
        nextButtonLabel="Back to Property Records"
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
      <AccountLookupUploadModal
        open={isAccountLookupUploadModalOpen}
        importing={importingAccountLookup}
        onClose={() => {
          if (!importingAccountLookup) {
            setIsAccountLookupUploadModalOpen(false);
          }
        }}
        onUpload={handleAccountLookupUpload}
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
