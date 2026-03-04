// Finance App File: frontend\src\pages\PropertyRecordsPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import BillingsFlowTabs from '../../shared/components/BillingsFlowTabs.jsx';
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { useUnsavedChangesGuard } from '../../shared/hooks/useUnsavedChangesGuard.js';
import {
  createPropertyRecord,
  deletePropertyRecord,
  fetchPropertyRecords,
  updatePropertyRecord
} from '../../shared/lib/api.js';
import {
  clearScopedGlobalEditMode,
  getScopedGlobalEditMode,
  setScopedGlobalEditMode
} from '../../shared/lib/globalEditMode.js';
import { getBillingsFlowNextPath } from '../../shared/lib/billingsFlow.js';

const ROWS_PER_PAGE = 10;
const PROPERTY_RECORD_DRAFT_KEY = 'finance:property-record-draft';
const SELECTED_PROPERTY_CONTEXT_KEY = 'finance:selected-property-record';
const RECORDS_EDIT_CONTEXT_KEY = 'finance:records-edit-context';
const SHARED_BILL_SELECTION_KEY = 'finance-bill-selection:shared';
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

function isPartnershipClassification(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'partnership'
  );
}

export default function PropertyRecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isListRoute = location.pathname.endsWith('/list');
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
  const formModeLabel = isScopedBillEditMode ? 'Edit Mode (From Records)' : isEditMode ? 'Edit Mode' : 'Create Mode';

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
      window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(PROPERTY_RECORD_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
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

        // Invalid draft shape: clear it and continue to Bills selection context.
        window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
      }
    } catch {
      window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
    }

    const parseContext = (raw) => {
      if (!raw) {
        return null;
      }
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    };

    const sharedSelection = parseContext(window.sessionStorage.getItem(SHARED_BILL_SELECTION_KEY));
    const directSelection = parseContext(window.sessionStorage.getItem(SELECTED_PROPERTY_CONTEXT_KEY));
    const sharedForm = sharedSelection?.form && typeof sharedSelection.form === 'object' ? sharedSelection.form : null;
    const contextSource = directSelection || sharedForm || sharedSelection;
    const hasContextIdentity =
      Number(contextSource?.property_list_id || contextSource?.id || 0) > 0 ||
      String(contextSource?.dd || '').trim() !== '' ||
      String(contextSource?.property || '').trim() !== '';
    if (contextSource && hasContextIdentity) {
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
      setScopedBillEdit({
        id: scopedBillId,
        dd: parsed.dd || '',
        property: parsed.property || '',
        bill_type: scopedBillType,
        raw_context: parsed
      });
      setPanelMode('form');
      window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
      return;
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
        setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
        setPanelMode('form');
      } catch {
        if (cancelled) {
          return;
        }
        setForm(nextForm);
        setBaselineForm(nextForm);
        setSelectedId(null);
        setScopedBillEdit(INITIAL_SCOPED_BILL_EDIT);
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
      window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
      return;
    }

    const draft = {
      form,
      baselineForm,
      selectedId,
      scopedBillEdit,
      panelMode
    };
    window.sessionStorage.setItem(PROPERTY_RECORD_DRAFT_KEY, JSON.stringify(draft));
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
    window.sessionStorage.removeItem(PROPERTY_RECORD_DRAFT_KEY);
    clearScopedGlobalEditMode('property');
  }

  function clearBillingDraftsAndContext() {
    window.sessionStorage.removeItem(SELECTED_PROPERTY_CONTEXT_KEY);
    window.sessionStorage.removeItem(SHARED_BILL_SELECTION_KEY);
    window.sessionStorage.removeItem(RECORDS_EDIT_CONTEXT_KEY);
    BILL_EDIT_DRAFT_KEYS.forEach((key) => window.sessionStorage.removeItem(key));
  }

  function hasRequiredFields() {
    return form.dd.trim() !== '' || form.property.trim() !== '';
  }

  async function saveRecord() {
    setSaving(true);
    try {
      const result = await createPropertyRecord(buildRecordPayload(form));
      showToast('success', result.message || 'Property record saved successfully.');
      clearBillingDraftsAndContext();
      resetForm();
      setPanelMode('form');
      setSearch('');
      setPage(1);
      navigate('/property-records');
      return true;
    } catch (saveError) {
      showToast('error', saveError.message || 'Unable to save record. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord() {
    setUpdating(true);
    try {
      const updateId =
        isScopedBillEditMode && scopedBillEdit ? Number(scopedBillEdit.id || 0) : Number(selectedId || 0);
      if (updateId <= 0) {
        showToast('error', 'No property record selected for update.');
        return false;
      }

      const result = await updatePropertyRecord(updateId, buildRecordPayload(form));
      showToast('success', result.message || 'Property record updated successfully.');
      clearBillingDraftsAndContext();
      resetForm();
      setPanelMode('form');
      setSearch('');
      setPage(1);
      navigate('/property-records');
      return true;
    } catch (updateError) {
      showToast('error', updateError.message || 'Unable to update record. Please try again.');
      return false;
    } finally {
      setUpdating(false);
    }
  }

  async function deleteRecord(id) {
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
    handlePrimaryAction();
  }

  function handleUpdate() {
    if (!isEditMode) {
      return;
    }
    if (!hasRequiredFields()) {
      showToast('error', 'Enter DD or Property before updating.');
      return;
    }
    setConfirmState({ open: true, action: 'update', targetId: null });
  }

  function handlePrimaryAction() {
    if (isEditMode) {
      handleUpdate();
      return;
    }

    if (!hasRequiredFields()) {
      showToast('error', 'Enter DD or Property before saving.');
      return;
    }

    setConfirmState({ open: true, action: 'save', targetId: null });
  }

  async function handleViewRecord() {
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
    setPanelMode('form');
    setSearch('');
    setPage(1);
    navigate('/property-records');
  }

  function handleBackToForm() {
    resetForm();
    setPanelMode('form');
    setSearch('');
    setPage(1);
    navigate('/property-records');
  }

  function handleClearForm() {
    resetForm();
  }

  function persistBillNavigationContext() {
    const payload = {
      property_list_id: Number(form.property_list_id || selectedId || 0),
      dd: form.dd || '',
      property: form.property || '',
      billing_period: form.billing_period || '',
      comboSearch: form.property || form.dd || ''
    };
    window.sessionStorage.setItem(SHARED_BILL_SELECTION_KEY, JSON.stringify(payload));
    window.sessionStorage.setItem(SELECTED_PROPERTY_CONTEXT_KEY, JSON.stringify(mapToPropertyForm(form)));
  }

  function handleBillingsStepNavigation(targetPath) {
    if (!targetPath) {
      return;
    }

    if (targetPath === '/property-records') {
      navigate('/property-records');
      return;
    }

    const targetBillType = BILL_ROUTE_TO_TYPE[targetPath] || 'internet';
    const snapshot = getScopedGlobalEditMode('bills');
    const isRecordsMode = snapshot.active === true && snapshot.context?.source === 'records';

    if (isRecordsMode && scopedBillEdit) {
      const scopedId = Number(scopedBillEdit.id || 0);
      const baseContext =
        scopedBillEdit.raw_context && typeof scopedBillEdit.raw_context === 'object' ? scopedBillEdit.raw_context : {};
      const recordsEditPayload = {
        ...baseContext,
        property_list_id: Number(form.property_list_id || selectedId || 0),
        dd: form.dd || '',
        property: form.property || '',
        billing_period: form.billing_period || '',
        unit_owner: form.unit_owner || '',
        classification: form.classification || '',
        deposit: form.deposit || '',
        rent: form.rent || '',
        per_property_status: form.per_property_status || '',
        real_property_tax: form.real_property_tax || '',
        rpt_payment_status: form.rpt_payment_status || '',
        penalty: form.penalty || '',
        bill_type: String(baseContext.bill_type || targetBillType),
        editing_bill_id: scopedId,
        water_bill_id: scopedId,
        electricity_bill_id: scopedId,
        internet_bill_id: scopedId,
        association_bill_id: scopedId
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
    const propertyContext = mapToPropertyForm(row);
    window.sessionStorage.setItem(SELECTED_PROPERTY_CONTEXT_KEY, JSON.stringify(propertyContext));

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
    if (!hasRequiredFields()) {
      showToast('error', 'Enter DD or Property before saving.');
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
      subtitle="Manage per-property records used by billing modules."
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
            ? 'Update Record'
            : confirmState.action === 'delete'
              ? 'Delete Record'
              : 'Save Record'
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
                  Property Records Form <span className="mode-badge">{formModeLabel}</span>
                </h3>
              </div>
            </div>
            <div className="card-title-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={isEditMode ? handleCancelEdit : handleViewRecord}
              >
                {isEditMode ? 'Cancel' : 'View Records'}
              </button>
              <button
                type="button"
                className={isEditMode ? 'btn btn-secondary' : 'btn active'}
                onClick={handlePrimaryAction}
                disabled={saving || updating || !hasRequiredFields()}
              >
                {isEditMode ? (updating ? 'Updating...' : 'Update') : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {panelMode === 'form' && (
          <div
            className={`property-records-form-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}
          >
            <form id="property-record-form" className="form-grid" onSubmit={handleSave} autoComplete="off">
              {FIELDS.map(([name, label]) => {
                if (name === 'classification') {
                  return (
                    <label key={name}>
                      {label}
                      <select name={name} value={form[name]} onChange={updateField}>
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
                      disabled={lockFinancialFields}
                    />
                  </label>
                );
              })}
            </form>
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
              <button type="button" className="btn btn-secondary" onClick={handleClearForm}>
                Clear
              </button>
              <button type="button" className="btn active" onClick={handleNextBillSection}>
                Next
              </button>
            </div>
          </div>
        )}

        {panelMode === 'table' && (
          <div className="filters">
            <input
              value={search}
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search property records..."
            />
            <button type="button" className="btn btn-secondary" onClick={handleBackToForm}>
              Back to Form
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        )}

        {panelMode === 'table' && isLoading && <p>Loading records...</p>}
        {panelMode === 'table' && isError && <p className="error">{error.message}</p>}

        {panelMode === 'table' && !isLoading && !isError && filtered.length === 0 && (
          <div className="empty-state">
            <p>No property records found.</p>
            <button type="button" className="btn btn-secondary" onClick={handleBackToForm}>
              Create Property Record
            </button>
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id} onDoubleClick={() => handleEdit(row)}>
                      {FIELDS.map(([key]) => (
                        <td key={`${row.id}-${key}`}>{row[key] || '-'}</td>
                      ))}
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
