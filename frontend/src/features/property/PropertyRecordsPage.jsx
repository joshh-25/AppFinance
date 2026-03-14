// Finance App File: frontend\src\pages\PropertyRecordsPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import BillingsFlowTabs from '../../shared/components/BillingsFlowTabs.jsx';
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx';
import { SkeletonButton, SkeletonLine } from '../../shared/components/Skeleton.jsx';
import StatusBanner from '../../shared/components/StatusBanner.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { useUnsavedChangesGuard } from '../../shared/hooks/useUnsavedChangesGuard.js';
import { getSessionQueryOptions, getStoredSessionRole } from '../../shared/lib/auth.js';
import {
  createPropertyRecord,
  deletePropertyRecord,
  fetchPropertyRecords,
  updatePropertyRecord
} from '../../shared/lib/api.js';
import {
  clearPropertyRecordDraft,
  clearSelectedPropertyContext,
  clearSharedBillSelection,
  getPropertyRecordDraft,
  getSelectedPropertyContext,
  getSharedBillSelection,
  setPropertyRecordDraft,
  setSelectedPropertyContext,
  setSharedBillSelection,
} from '../../shared/lib/billingWorkflowState.js';
import {
  clearScopedGlobalEditMode,
  getScopedGlobalEditMode,
  setScopedGlobalEditMode
} from '../../shared/lib/globalEditMode.js';
import { getBillingsFlowNextPath } from '../../shared/lib/billingsFlow.js';
import { canRoleAccessAction, normalizeUserRole } from '../../shared/lib/permissions.js';

const ROWS_PER_PAGE = 10;
const RECORDS_EDIT_CONTEXT_KEY = 'finance:records-edit-context';
const BILL_EDIT_DRAFT_KEYS = [
  'finance-bill-edit-draft:water',
  'finance-bill-edit-draft:electricity',
  'finance-bill-edit-draft:wifi',
  'finance-bill-edit-draft:association'
];

const INITIAL_FORM = {
  property_list_id: 0,
  dd: '',
  property: '',
  billing_period: '',
  unit_owner: '',
  classification: '',
  deposit: '',
  rent: '',
  per_property_status: '',
  real_property_tax: '',
  rpt_payment_status: '',
  penalty: ''
};

const INITIAL_SCOPED_BILL_EDIT = null;

const FIELDS = [
  ['dd', 'DD'],
  ['property', 'Property'],
  ['unit_owner', 'Unit Owner'],
  ['classification', 'Classification'],
  ['deposit', 'Deposit'],
  ['rent', 'Rent'],
  ['per_property_status', 'Per Property Status'],
  ['real_property_tax', 'Real Property Tax Amount'],
  ['rpt_payment_status', 'RPT Payment Status'],
  ['penalty', 'Penalty Amount']
];
const CLASSIFICATION_OPTIONS = ['Fixed', 'Partnership'];
const BILL_ROUTE_TO_TYPE = {
  '/bills/wifi': 'internet',
  '/bills/water': 'water',
  '/bills/electricity': 'electricity',
  '/bills/association': 'association_dues'
};
const UNSAVED_MESSAGE = 'You have unsaved changes. Save before leaving this page?';

function isBillsOrPropertyRoute(path) {
  const normalizedPath = String(path || '')
    .trim()
    .toLowerCase();
  return normalizedPath.startsWith('/property-records') || normalizedPath.startsWith('/bills/');
}

function mapToPropertyForm(source = {}) {
  return {
    property_list_id: Number(source.property_list_id || source.id || 0),
    dd: source.dd || '',
    property: source.property || '',
    billing_period: source.billing_period || source.due_period || '',
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

function hasBillContext(source = {}) {
  const values = [
    source.internet_provider,
    source.internet_account_no,
    source.wifi_amount,
    source.wifi_due_date,
    source.wifi_payment_status,
    source.water_account_no,
    source.water_amount,
    source.water_due_date,
    source.water_payment_status,
    source.electricity_account_no,
    source.electricity_amount,
    source.electricity_due_date,
    source.electricity_payment_status,
    source.association_dues,
    source.association_due_date,
    source.association_payment_status,
    source.water_bill_id,
    source.electricity_bill_id,
    source.internet_bill_id,
    source.association_bill_id
  ];
  return values.some((value) => String(value ?? '').trim() !== '' && String(value ?? '').trim() !== '0');
}

function isPartnershipClassification(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'partnership'
  );
}

function getPropertyFormBlockingMessage(form) {
  const hasDd = String(form?.dd || '').trim() !== '';
  const hasProperty = String(form?.property || '').trim() !== '';
  if (!hasDd && !hasProperty) {
    return 'Enter the DD or property name before saving.';
  }
  return '';
}

function buildScopedBillEditContext(source = {}) {
  return {
    id: Number(source.editing_bill_id || 0),
    property_record_id: Number(source.property_list_id || source.id || 0),
    dd: source.dd || '',
    property: source.property || '',
    bill_type: String(source.bill_type || '').trim(),
    raw_context: source
  };
}

export default function PropertyRecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isListRoute = location.pathname.endsWith('/list');
  const { data: sessionData } = useQuery(getSessionQueryOptions());
  const [form, setForm] = useState(INITIAL_FORM);
  const [baselineForm, setBaselineForm] = useState(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [scopedBillEdit, setScopedBillEdit] = useState(INITIAL_SCOPED_BILL_EDIT);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [panelMode, setPanelMode] = useState(isListRoute ? 'table' : 'form');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [fieldsAnimating, setFieldsAnimating] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    action: null,
    targetId: null
  });
  const { toasts, showToast, removeToast } = useToast();

  const isScopedBillEditMode = scopedBillEdit !== null;
  const isEditMode = selectedId !== null || isScopedBillEditMode;
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baselineForm), [form, baselineForm]);
  const formModeLabel = isScopedBillEditMode ? 'Editing from Records' : isEditMode ? 'Editing Property' : 'New Property';
  const currentRole = normalizeUserRole(sessionData?.role || getStoredSessionRole() || 'viewer', 'viewer');
  const canOpenBillings = canRoleAccessAction(currentRole, 'add');
  const canManagePropertyRecords = canRoleAccessAction(currentRole, 'property_record_create');
  const propertyPermissionNotice = canManagePropertyRecords
    ? null
    : {
        tone: 'info',
        title: 'Read-Only Access',
        message: 'Only admins can create, edit, or delete property records. You can still search and view them here.'
      };

  useEffect(() => {
    setPanelMode(isListRoute ? 'table' : 'form');
  }, [isListRoute]);

  useEffect(() => {
    setFieldsAnimating(true);
    const timer = window.setTimeout(() => setFieldsAnimating(false), 220);
    return () => window.clearTimeout(timer);
  }, [panelMode]);

  useEffect(() => {
    if (isListRoute) {
      return;
    }

    const incomingRecordsContext = window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY);
    if (incomingRecordsContext) {
      // Records-driven edit should override any stale local draft.
      clearPropertyRecordDraft();
      return;
    }

    try {
      const draft = getPropertyRecordDraft();
      if (draft && typeof draft === 'object') {
        if (draft.form && typeof draft.form === 'object') {
          setForm({
            ...INITIAL_FORM,
            ...draft.form
          });
        }
        if (draft.baselineForm && typeof draft.baselineForm === 'object') {
          setBaselineForm({
            ...INITIAL_FORM,
            ...draft.baselineForm
          });
        }
        if (typeof draft.selectedId === 'number' || draft.selectedId === null) {
          setSelectedId(draft.selectedId);
        }
        if (draft.scopedBillEdit && typeof draft.scopedBillEdit === 'object') {
          setScopedBillEdit(draft.scopedBillEdit);
        } else {
          setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
        }
        if (draft.panelMode === 'form' || draft.panelMode === 'table') {
          setPanelMode(draft.panelMode);
        }
        return;
      }
    } catch {
      clearPropertyRecordDraft();
    }

    const hasContextIdentity = (source) =>
      Number(source?.property_list_id || source?.id || 0) > 0 ||
      String(source?.dd || '').trim() !== '' ||
      String(source?.property || '').trim() !== '';

    const sharedSelection = getSharedBillSelection();
    const directSelection = getSelectedPropertyContext();
    const sharedForm = sharedSelection?.form && typeof sharedSelection.form === 'object' ? sharedSelection.form : null;

    // Prefer direct selection only when it has usable identity fields.
    // This avoids stale/empty direct context wiping out a valid shared bill selection.
    const contextSource = hasContextIdentity(directSelection)
      ? directSelection
      : hasContextIdentity(sharedForm)
        ? sharedForm
        : hasContextIdentity(sharedSelection)
          ? sharedSelection
          : null;

    if (contextSource) {
      const nextForm = mapToPropertyForm(contextSource);
      setForm(nextForm);
      setBaselineForm(nextForm);
      setSelectedId(null);
      setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
      setPanelMode('form');
      return;
    }

    // Default create mode should be empty unless a valid local draft exists.
    setForm(INITIAL_FORM);
    setBaselineForm(INITIAL_FORM);
    setSelectedId(null);
    setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
    setPanelMode('form');
  }, [isListRoute]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(RECORDS_EDIT_CONTEXT_KEY);
    if (!raw) {
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    const scopedBillId = Number(parsed.editing_bill_id || 0);
    const scopedBillType = String(parsed.bill_type || '').trim();
    const hasScopedBillIdentity = scopedBillId > 0 && scopedBillType !== '';

    const nextForm = mapToPropertyForm(parsed);

    if (hasScopedBillIdentity) {
      setForm(nextForm);
      setBaselineForm(nextForm);
      setSelectedId(null);
      setScopedBillEdit(buildScopedBillEditContext(parsed));
      setPanelMode('form');
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
    }

    if (hasBillContext(parsed)) {
      setScopedBillEdit(buildScopedBillEditContext(parsed));
    } else {
      setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
    }

    const normalizedPropertyListId = Number(nextForm.property_list_id || parsed.property_list_id || parsed.id || 0);
    const normalizedDd = String(nextForm.dd || '')
      .trim()
      .toLowerCase();
    const normalizedProperty = String(nextForm.property || '')
      .trim()
      .toLowerCase();
    const normalizedBillingPeriod = String(nextForm.billing_period || '')
      .trim()
      .toLowerCase();

    let cancelled = false;
    (async () => {
      try {
        const propertyRows = await fetchPropertyRecords();
        if (cancelled) {
          return;
        }

        const match = propertyRows.find((row) => {
          const rowPropertyListId = Number(row.property_list_id || row.id || 0);
          if (normalizedPropertyListId > 0 && rowPropertyListId === normalizedPropertyListId) {
            return true;
          }
          const rowDd = String(row.dd || '')
            .trim()
            .toLowerCase();
          const rowProperty = String(row.property || '')
            .trim()
            .toLowerCase();
          const rowBillingPeriod = String(row.billing_period || '')
            .trim()
            .toLowerCase();
          const ddMatches = normalizedDd !== '' && rowDd === normalizedDd;
          const propertyMatches = normalizedProperty !== '' && rowProperty === normalizedProperty;
          const billingMatches = normalizedBillingPeriod !== '' && rowBillingPeriod === normalizedBillingPeriod;
          return ddMatches && propertyMatches && (normalizedBillingPeriod === '' || billingMatches);
        });

        setForm(nextForm);
        setBaselineForm(nextForm);
        setSelectedId(match?.id ?? null);
        if (!hasBillContext(parsed)) {
          setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
        }
        setPanelMode('form');
      } catch {
        if (cancelled) {
          return;
        }
        setForm(nextForm);
        setBaselineForm(nextForm);
        setSelectedId(null);
        if (!hasBillContext(parsed)) {
          setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
        }
        setPanelMode('form');
      } finally {
        if (!cancelled) {
          window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hasMeaningfulFormData = Object.entries(form).some(([key, value]) => {
      if (key === 'property_list_id') {
        return Number(value || 0) > 0;
      }
      return String(value || '').trim() !== '';
    });
    if (!hasMeaningfulFormData && selectedId === null && panelMode === 'form') {
      clearPropertyRecordDraft();
      return;
    }

    const draft = {
      form,
      baselineForm,
      selectedId,
      scopedBillEdit,
      panelMode
    };
    setPropertyRecordDraft(draft);
  }, [form, baselineForm, selectedId, scopedBillEdit, panelMode]);

  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['property-records'],
    queryFn: fetchPropertyRecords,
    enabled: panelMode === 'table'
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((row) =>
      FIELDS.some(([key]) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(query)
      )
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(startIndex, startIndex + ROWS_PER_PAGE);
  const pageStart = filtered.length === 0 ? 0 : startIndex + 1;
  const pageEnd = startIndex + pageRows.length;

  function showPropertyPermissionMessage() {
    const message = 'Only admins can create, edit, or delete property records.';
    setFormFeedback({
      tone: 'warning',
      title: 'Admin Access Needed',
      message
    });
    showToast('warning', message);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'classification' && isPartnershipClassification(value)) {
        next.deposit = 'N/A';
        next.rent = 'N/A';
      }
      return next;
    });
  }

  function buildRecordPayload(sourceForm) {
    const nextPayload = { ...sourceForm };
    if (isPartnershipClassification(nextPayload.classification)) {
      nextPayload.deposit = 'N/A';
      nextPayload.rent = 'N/A';
    }
    return nextPayload;
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setBaselineForm(INITIAL_FORM);
    setSelectedId(null);
    setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
    clearPropertyRecordDraft();
    clearScopedGlobalEditMode('property');
  }

  function clearBillingDraftsAndContext() {
    clearSelectedPropertyContext();
    clearSharedBillSelection();
    window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
    BILL_EDIT_DRAFT_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  }

  function hasRequiredFields() {
    return form.dd.trim() !== '' || form.property.trim() !== '';
  }

  async function saveRecord() {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return false;
    }

    setFormFeedback({
      tone: 'info',
      title: 'Saving Property',
      message: 'Please wait while the property record is being saved.'
    });
    setSaving(true);
    try {
      const result = await createPropertyRecord(buildRecordPayload(form));
      setFormFeedback({
        tone: 'success',
        title: 'Property Saved',
        message: 'Your property record was saved successfully.'
      });
      showToast('success', result.message || 'Property record saved successfully.');
      clearBillingDraftsAndContext();
      resetForm();
      setPanelMode('form');
      setSearch('');
      setPage(1);
      navigate('/property-records');
      return true;
    } catch (saveError) {
      setFormFeedback({
        tone: 'error',
        title: 'Save Did Not Finish',
        message: saveError.message || 'Unable to save record. Please try again.'
      });
      showToast('error', saveError.message || 'Unable to save record. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord() {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return false;
    }

    setFormFeedback({
      tone: 'info',
      title: 'Saving Changes',
      message: 'Please wait while the property record is updated.'
    });
    setUpdating(true);
    try {
      const updateId =
        isScopedBillEditMode && scopedBillEdit
          ? Number(form.property_list_id || scopedBillEdit.property_record_id || 0)
          : Number(selectedId || 0);
      if (updateId <= 0) {
        showToast('error', 'No property record selected for update.');
        return false;
      }

      const result = await updatePropertyRecord(updateId, buildRecordPayload(form));
      setFormFeedback({
        tone: 'success',
        title: 'Changes Saved',
        message: 'Your property changes were saved successfully.'
      });
      showToast('success', result.message || 'Property record updated successfully.');
      clearBillingDraftsAndContext();
      resetForm();
      setPanelMode('form');
      setSearch('');
      setPage(1);
      navigate('/property-records');
      return true;
    } catch (updateError) {
      setFormFeedback({
        tone: 'error',
        title: 'Update Did Not Finish',
        message: updateError.message || 'Unable to update record. Please try again.'
      });
      showToast('error', updateError.message || 'Unable to update record. Please try again.');
      return false;
    } finally {
      setUpdating(false);
    }
  }

  async function deleteRecord(id) {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }

    setDeleting(true);
    try {
      const result = await deletePropertyRecord(id);
      showToast('success', result.message || 'Property record deleted successfully.');
      if (selectedId === id) {
        resetForm();
      }
      await refetch();
    } catch (deleteError) {
      showToast('error', deleteError.message || 'Unable to delete record. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function handleSave(event) {
    event.preventDefault();
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }
    handlePrimaryAction();
  }

  function handleUpdate() {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }

    if (!isEditMode) {
      return;
    }
    const blockingMessage = getPropertyFormBlockingMessage(form);
    if (blockingMessage !== '') {
      setFormFeedback({
        tone: 'warning',
        title: 'Check Before Saving',
        message: blockingMessage
      });
      showToast('error', blockingMessage);
      return;
    }
    setConfirmState({ open: true, action: 'update', targetId: null });
  }

  function handlePrimaryAction() {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }

    if (isEditMode) {
      handleUpdate();
      return;
    }

    const blockingMessage = getPropertyFormBlockingMessage(form);
    if (blockingMessage !== '') {
      setFormFeedback({
        tone: 'warning',
        title: 'Check Before Saving',
        message: blockingMessage
      });
      showToast('error', blockingMessage);
      return;
    }

    setConfirmState({ open: true, action: 'save', targetId: null });
  }

  async function handleViewRecord() {
    setFormFeedback({
      tone: 'info',
      title: 'Viewing Saved Properties',
      message: 'You are now looking at the saved property list.'
    });
    setSelectedId(null);
    setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
    setPanelMode('table');
    setPage(1);
    await refetch();
    navigate('/property-records/list');
  }

  function handleCancelEdit() {
    // Cancel means exit edit mode immediately and return to a clean create form.
    clearBillingDraftsAndContext();
    resetForm();
    clearScopedGlobalEditMode('property');
    setFormFeedback(null);
    setPanelMode('form');
    setSearch('');
    setPage(1);
    navigate('/property-records');
  }

  function handleBackToForm() {
    resetForm();
    setFormFeedback(null);
    setPanelMode('form');
    setSearch('');
    setPage(1);
    navigate('/property-records');
  }

  function handleClearForm() {
    resetForm();
    setFormFeedback({
      tone: 'info',
      title: 'Form Cleared',
      message: 'The property form is ready for a new entry.'
    });
  }

  function persistBillNavigationContext() {
    const payload = {
      property_list_id: Number(form.property_list_id || selectedId || 0),
      dd: form.dd || '',
      property: form.property || '',
      billing_period: form.billing_period || '',
      comboSearch: form.property || form.dd || ''
    };
    setSharedBillSelection(payload);
    setSelectedPropertyContext(mapToPropertyForm(form));
  }

  function handleBillingsStepNavigation(targetPath) {
    if (!targetPath) {
      return;
    }

    if (targetPath === '/property-records') {
      navigate('/property-records');
      return;
    }

    if (!canOpenBillings) {
      const message = 'Opening bill entry screens requires editor access.';
      setFormFeedback({
        tone: 'warning',
        title: 'Editor Access Needed',
        message
      });
      showToast('warning', message);
      return;
    }

    const targetBillType = BILL_ROUTE_TO_TYPE[targetPath] || 'internet';
    const snapshot = getScopedGlobalEditMode('bills');
    const isRecordsMode = snapshot.active === true && snapshot.context?.source === 'records';

    if (isRecordsMode && scopedBillEdit) {
      const scopedId = Number(scopedBillEdit.id || 0);
      const baseContext =
        scopedBillEdit.raw_context && typeof scopedBillEdit.raw_context === 'object' ? scopedBillEdit.raw_context : {};
      const resolvedEditingBillId = scopedId > 0 ? scopedId : Number(baseContext.editing_bill_id || 0);
      const recordsEditPayload = {
        ...baseContext,
        property_list_id: Number(form.property_list_id || selectedId || 0),
        dd: form.dd || '',
        property: form.property || '',
        billing_period: form.billing_period || '',
        due_period: form.billing_period || baseContext.due_period || '',
        unit_owner: form.unit_owner || '',
        classification: form.classification || '',
        deposit: form.deposit || '',
        rent: form.rent || '',
        per_property_status: form.per_property_status || '',
        real_property_tax: form.real_property_tax || '',
        rpt_payment_status: form.rpt_payment_status || '',
        penalty: form.penalty || '',
        bill_type: targetBillType,
        editing_bill_id: resolvedEditingBillId,
        water_bill_id: Number(baseContext.water_bill_id || 0) || resolvedEditingBillId,
        electricity_bill_id: Number(baseContext.electricity_bill_id || 0) || resolvedEditingBillId,
        internet_bill_id: Number(baseContext.internet_bill_id || 0) || resolvedEditingBillId,
        association_bill_id: Number(baseContext.association_bill_id || 0) || resolvedEditingBillId
      };
      window.sessionStorage.setItem(RECORDS_EDIT_CONTEXT_KEY, JSON.stringify(recordsEditPayload));
      setScopedGlobalEditMode('bills', {
        source: 'records',
        bill_type: targetBillType
      });
      persistBillNavigationContext();
      navigate(targetPath, {
        state: { fromPropertyRecordsNext: true }
      });
      return;
    }

    // Moving from Property Records via Next should open Bills in normal/create mode unless in Records edit mode.
    window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
    clearScopedGlobalEditMode('bills');
    persistBillNavigationContext();
    navigate(targetPath, {
      state: { fromPropertyRecordsNext: true }
    });
  }

  function handleNextBillSection() {
    const nextPath = getBillingsFlowNextPath('/property-records') || '/bills/wifi';
    handleBillingsStepNavigation(nextPath);
  }

  function handleEdit(row) {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }

    const propertyContext = mapToPropertyForm(row);
    setSelectedPropertyContext(propertyContext);

    const nextForm = mapToPropertyForm(row);

    setForm(nextForm);
    setBaselineForm(nextForm);
    setSelectedId(row.id);
    setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
    setScopedGlobalEditMode('property', {
      source: 'property',
      property_record_id: Number(row.id || 0)
    });
    setPanelMode('form');
  }

  function handleDelete(row) {
    if (!canManagePropertyRecords) {
      showPropertyPermissionMessage();
      return;
    }

    setConfirmState({
      open: true,
      action: 'delete',
      targetId: row.id
    });
  }

  async function handleConfirmAction() {
    if (confirmState.action === 'save') {
      await saveRecord();
    }
    if (confirmState.action === 'update') {
      await updateRecord();
    }
    if (confirmState.action === 'delete' && confirmState.targetId) {
      await deleteRecord(confirmState.targetId);
    }
    setConfirmState({ open: false, action: null, targetId: null });
  }

  async function saveBeforeLeaving() {
    const blockingMessage = getPropertyFormBlockingMessage(form);
    if (blockingMessage !== '') {
      setFormFeedback({
        tone: 'warning',
        title: 'Check Before Saving',
        message: blockingMessage
      });
      showToast('error', blockingMessage);
      return false;
    }
    return isEditMode ? updateRecord() : saveRecord();
  }

  useEffect(() => {
    function handleShortcut(event) {
      const key = String(event.key || '').toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || key !== 's') {
        return;
      }
      if (panelMode !== 'form' || saving || updating || deleting || !hasRequiredFields()) {
        return;
      }
      event.preventDefault();
      handlePrimaryAction();
    }

    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelMode, saving, updating, deleting, form, selectedId, scopedBillEdit]);

  const unsavedGuard = useUnsavedChangesGuard({
    isDirty,
    shouldBypassPrompt: (to) => {
      const snapshot = getScopedGlobalEditMode('bills');
      const isRecordsMode = snapshot.active === true && snapshot.context?.source === 'records';
      return isRecordsMode && isBillsOrPropertyRoute(to);
    },
    onSaveAndLeave: saveBeforeLeaving
  });

  return (
    <AppLayout
      title="Property Records"
      contentClassName="shell-content-lock-scroll"
      onNavigateAttempt={unsavedGuard.handleNavigateAttempt}
    >
      <Toast toasts={toasts} onDismiss={removeToast} />
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.action === 'update'
            ? 'Update Property Record'
            : confirmState.action === 'delete'
              ? 'Delete Property Record'
              : 'Save Property Record'
        }
        message={
          confirmState.action === 'update'
            ? 'Save your changes to this property record?'
            : confirmState.action === 'delete'
              ? 'Delete this property record permanently? This action cannot be undone.'
              : 'Save this new property record?'
        }
        confirmText={
          confirmState.action === 'update'
            ? 'Save Changes'
            : confirmState.action === 'delete'
              ? 'Delete Record'
              : 'Save Property'
        }
        cancelText="Cancel"
        onCancel={() => setConfirmState({ open: false, action: null, targetId: null })}
        onConfirm={handleConfirmAction}
        busy={saving || updating || deleting}
      />
      <ConfirmDialog
        open={unsavedGuard.isPromptOpen}
        title="Unsaved Changes"
        message={UNSAVED_MESSAGE}
        confirmText="Leave Without Saving"
        cancelText="Keep Editing"
        onCancel={unsavedGuard.stayOnPage}
        onConfirm={unsavedGuard.leaveWithoutSaving}
        busy={unsavedGuard.isPromptBusy}
      />
      <BillingsFlowTabs currentPath={location.pathname} onNavigate={handleBillingsStepNavigation} />
      <section
        className={`card bill-form-card ${panelMode === 'table' ? 'property-records-card' : 'property-records-form-card'}`}
      >
        {panelMode === 'form' && (
          <div className="card-title-row">
            <div className="card-title-left">
              <div className="card-title-accent" />
              <div>
                <h3 className="card-title">
                  Property Entry <span className="mode-badge">{formModeLabel}</span>
                </h3>
                <span className="sr-only">{isEditMode ? 'Edit Mode' : 'Create Mode'}</span>
              </div>
            </div>
            <div className="card-title-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={isEditMode ? handleCancelEdit : handleViewRecord}
              >
                {isEditMode ? 'Stop Editing' : 'Open List'}
              </button>
              {canManagePropertyRecords && (
                <button
                  type="button"
                  className={isEditMode ? 'btn btn-secondary' : 'btn active'}
                  onClick={handlePrimaryAction}
                  disabled={saving || updating || !hasRequiredFields()}
                  aria-label={isEditMode ? 'Update' : 'Save'}
                >
                  {isEditMode ? (updating ? 'Saving Changes...' : 'Save Changes') : saving ? 'Saving...' : 'Save Property'}
                </button>
              )}
            </div>
          </div>
        )}

        {propertyPermissionNotice && <StatusBanner feedback={propertyPermissionNotice} />}
        <StatusBanner feedback={formFeedback} />

        {panelMode === 'form' && (
          <div
            className={`property-records-form-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}
          >
            <div className="form-section-card">
              <div className="form-section-header">
                <h4>Property Details</h4>
                <p>Save the property first, then move to bill entry when ready.</p>
              </div>
              <form id="property-record-form" className="form-grid" onSubmit={handleSave} autoComplete="off">
                {FIELDS.map(([name, label]) => {
                  if (name === 'classification') {
                    return (
                      <label key={name}>
                        {label}
                        <select
                          name={name}
                          value={form[name]}
                          onChange={updateField}
                          disabled={!canManagePropertyRecords}
                        >
                          <option value="">Select classification...</option>
                          {CLASSIFICATION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }

                  const lockFinancialFields =
                    isPartnershipClassification(form.classification) && (name === 'deposit' || name === 'rent');
                  return (
                    <label key={name}>
                      {label}
                      <input
                        name={name}
                        type="text"
                        value={form[name]}
                        autoComplete="off"
                        onChange={updateField}
                        disabled={!canManagePropertyRecords || lockFinancialFields}
                      />
                    </label>
                  );
                })}
              </form>
            </div>
          </div>
        )}

        {panelMode === 'form' && (
          <div className="workflow-footer">
            <div className="workflow-footer-left">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/records')}>
                Back to Records
              </button>
            </div>
            <div className="workflow-footer-right">
              {canManagePropertyRecords && (
                <button type="button" className="btn btn-secondary" onClick={handleClearForm}>
                  Clear
                </button>
              )}
              {canOpenBillings && (
                <button type="button" className="btn active" onClick={handleNextBillSection} aria-label="Next">
                  Go to Bills
                </button>
              )}
            </div>
          </div>
        )}

        {panelMode === 'table' && (
          <div className="filters records-toolbar-filters">
            <label className="toolbar-field">
              <span>Find saved properties</span>
              <input
                value={search}
                autoComplete="off"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search property records..."
              />
            </label>
            {isLoading ? (
              <>
                <SkeletonButton width={140} height={44} />
                <SkeletonButton width={140} height={44} />
              </>
            ) : (
              <>
                <button type="button" className="btn btn-secondary" onClick={handleBackToForm}>
                  Back to Entry
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => refetch()}>
                  Refresh
                </button>
              </>
            )}
          </div>
        )}

        {panelMode === 'table' && isLoading && (
          <div className="records-loading-shell" role="status" aria-live="polite" aria-label="Loading property records">
            <div className="records-loading-table">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonLine key={`property-records-loading-${index}`} width="100%" height={15} radius={8} />
              ))}
            </div>
          </div>
        )}
        {panelMode === 'table' && isError && <p className="error">{error.message}</p>}

        {panelMode === 'table' && !isLoading && !isError && filtered.length === 0 && (
          <div className="empty-state">
            <p>No property records found.</p>
            {canManagePropertyRecords && (
              <button type="button" className="btn btn-secondary" onClick={handleBackToForm}>
                Create Property Record
              </button>
            )}
          </div>
        )}

        {panelMode === 'table' && !isLoading && !isError && filtered.length > 0 && (
          <div
            className={`property-records-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}
          >
            <div className="table-wrap property-records-table-wrap">
              <table>
                <thead>
                  <tr>
                    {FIELDS.map(([, label]) => (
                      <th key={label}>{label}</th>
                    ))}
                    {canManagePropertyRecords && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} onDoubleClick={canManagePropertyRecords ? () => handleEdit(row) : undefined}>
                      {FIELDS.map(([key]) => (
                        <td key={`${row.id}-${key}`}>{row[key] || '-'}</td>
                      ))}
                      {canManagePropertyRecords && (
                        <td>
                          <div className="action-buttons">
                            <button type="button" className="btn btn-secondary" onClick={() => handleEdit(row)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-danger" onClick={() => handleDelete(row)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination records-pagination">
              <span>
                Showing {pageStart}-{pageEnd} of {filtered.length}
              </span>
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}
