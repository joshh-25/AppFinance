// Finance App File: frontend\src\pages\RecordsPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import { SkeletonButton, SkeletonLine } from '../../shared/components/Skeleton.jsx';
import StatusBanner from '../../shared/components/StatusBanner.jsx';
import Toast from '../../shared/components/Toast.jsx';
import useMediaQuery from '../../shared/hooks/useMediaQuery.js';
import { useToast } from '../../shared/hooks/useToast.js';
import { getSessionQueryOptions, getStoredSessionRole } from '../../shared/lib/auth.js';
import { fetchMergedBills } from '../../shared/lib/api.js';
import {
  clearSharedBillSelection,
  setRecordsEditContext,
  setSelectedPropertyContext,
  setSharedBillSelection,
  setWindowRecordsEditContext,
} from '../../shared/lib/billingWorkflowState.js';
import { setGlobalEditMode } from '../../shared/lib/globalEditMode.js';
import { canRoleAccessAction, normalizeUserRole } from '../../shared/lib/permissions.js';

const ROWS_PER_PAGE = 10;

const CORE_COLUMNS = [
  ['dd', 'DD'],
  ['property', 'Property'],
  ['due_period', 'Due Period'],
  ['unit_owner', 'Unit Owner']
];

const WIFI_COLUMNS = [
  ['internet_provider', 'Internet Provider'],
  ['internet_account_no', 'Account No.'],
  ['wifi_amount', 'Wifi'],
  ['wifi_due_date', 'Due Date Wifi'],
  ['wifi_payment_status', 'Payment Status WiFi']
];

const WATER_COLUMNS = [
  ['water_account_no', 'Water Account'],
  ['water_amount', 'Water'],
  ['water_due_date', 'Due Date'],
  ['water_payment_status', 'Payment Status']
];

const ELECTRICITY_COLUMNS = [
  ['electricity_account_no', 'Electricity Account No.'],
  ['electricity_amount', 'Electricity'],
  ['electricity_due_date', 'Due Date'],
  ['electricity_payment_status', 'Payment Status']
];

const ASSOCIATION_COLUMNS = [
  ['association_dues', 'Association Dues'],
  ['association_due_date', 'Due Date Asso'],
  ['association_payment_status', 'Payment Status']
];

const ALL_COLUMNS = [
  ...CORE_COLUMNS,
  ['classification', 'Classification'],
  ['deposit', 'Deposit'],
  ['rent', 'Rent'],
  ...WIFI_COLUMNS,
  ...WATER_COLUMNS,
  ...ELECTRICITY_COLUMNS,
  ...ASSOCIATION_COLUMNS,
  ['real_property_tax', 'Real Property Tax'],
  ['rpt_payment_status', 'Payment Status'],
  ['penalty', 'Penalty'],
  ['per_property_status', 'Per Property Status']
];

const EXPORT_COLUMNS = ALL_COLUMNS;
const COLUMN_GROUPS = [
  ['Property', 7],
  ['WiFi', WIFI_COLUMNS.length],
  ['Water', WATER_COLUMNS.length],
  ['Electricity', ELECTRICITY_COLUMNS.length],
  ['Association', ASSOCIATION_COLUMNS.length],
  ['Tax and Status', 4]
];

const BILL_TYPE_TO_ROUTE = {
  water: '/bills/water',
  electricity: '/bills/electricity',
  internet: '/bills/wifi',
  association_dues: '/bills/association'
};

const BILL_TYPE_META = {
  water: {
    label: 'Water',
    amountKey: 'water_amount',
    dueDateKey: 'water_due_date',
    statusKey: 'water_payment_status'
  },
  electricity: {
    label: 'Electricity',
    amountKey: 'electricity_amount',
    dueDateKey: 'electricity_due_date',
    statusKey: 'electricity_payment_status'
  },
  internet: {
    label: 'WiFi',
    amountKey: 'wifi_amount',
    dueDateKey: 'wifi_due_date',
    statusKey: 'wifi_payment_status'
  },
  association_dues: {
    label: 'Association',
    amountKey: 'association_dues',
    dueDateKey: 'association_due_date',
    statusKey: 'association_payment_status'
  }
};

function resolveBillTypeFromRow(row) {
  const hasMeaningfulValue = (value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (normalized === '') {
      return false;
    }
    return !['-', '--', 'n/a', 'na', 'none', 'null'].includes(normalized);
  };
  const hintedType = String(row?.bill_type || '')
    .trim()
    .toLowerCase();
  if (
    hintedType === 'water' ||
    hintedType === 'electricity' ||
    hintedType === 'internet' ||
    hintedType === 'association_dues'
  ) {
    return hintedType;
  }

  const typeOrder = ['water', 'electricity', 'internet', 'association_dues'];
  const availableIds = {
    water: Number(row?.water_bill_id || 0),
    electricity: Number(row?.electricity_bill_id || 0),
    internet: Number(row?.internet_bill_id || 0),
    association_dues: Number(row?.association_bill_id || 0)
  };
  const candidatesById = typeOrder.filter((type) => availableIds[type] > 0);
  if (candidatesById.length === 1) {
    return candidatesById[0];
  }

  const hasTypeData = {
    water: [row?.water_account_no, row?.water_amount, row?.water_due_date, row?.water_payment_status].some(
      hasMeaningfulValue
    ),
    electricity: [
      row?.electricity_account_no,
      row?.electricity_amount,
      row?.electricity_due_date,
      row?.electricity_payment_status
    ].some(hasMeaningfulValue),
    internet: [
      row?.wifi_amount,
      row?.internet_account_no,
      row?.internet_provider,
      row?.wifi_due_date,
      row?.wifi_payment_status
    ].some(hasMeaningfulValue),
    association_dues: [row?.association_dues, row?.association_due_date, row?.association_payment_status].some(
      hasMeaningfulValue
    )
  };
  const candidatesByData = typeOrder.filter((type) => hasTypeData[type]);
  if (candidatesByData.length === 1) {
    return candidatesByData[0];
  }

  if (candidatesById.length > 1) {
    return candidatesById[0];
  }
  if (candidatesByData.length > 1) {
    return candidatesByData[0];
  }

  return 'water';
}

function toCsvCell(value) {
  const raw = String(value ?? '');
  const excelTextFormula = `="${raw.replace(/"/g, '""')}"`;
  return `"${excelTextFormula.replace(/"/g, '""')}"`;
}

function normalizeBillingPeriodValue(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return '';
  }

  const exact = raw.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (exact) {
    return `${exact[1]}-${exact[2]}`;
  }

  const fromYmd = raw.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/);
  if (fromYmd) {
    return `${fromYmd[1]}-${fromYmd[2]}`;
  }

  const slash = raw.match(/^(\d{4})\/(0?[1-9]|1[0-2])$/);
  if (slash) {
    return `${slash[1]}-${String(Number(slash[2])).padStart(2, '0')}`;
  }

  const monthYear = raw.match(/^(0?[1-9]|1[0-2])[-/](\d{4})$/);
  if (monthYear) {
    return `${monthYear[2]}-${String(Number(monthYear[1])).padStart(2, '0')}`;
  }

  return '';
}

function getBillRouteByType(billType) {
  return BILL_TYPE_TO_ROUTE[billType] || '/bills/water';
}

function getBillIdsByType(row = {}) {
  return {
    water: Number(row.water_bill_id || 0),
    electricity: Number(row.electricity_bill_id || 0),
    internet: Number(row.internet_bill_id || 0),
    association_dues: Number(row.association_bill_id || 0)
  };
}

function getAvailableEditTargetsFromRow(row = {}) {
  const billIdsByType = getBillIdsByType(row);
  const populatedTypes = getPopulatedBillTypesFromRow(row);
  const billTargets = Object.keys(BILL_TYPE_META).filter(
    (type) => billIdsByType[type] > 0 || populatedTypes.includes(type)
  );

  return ['property', ...billTargets];
}

function canEditTargetType(role, targetType) {
  if (targetType === 'property') {
    return canRoleAccessAction(role, 'property_record_update');
  }

  return Object.prototype.hasOwnProperty.call(BILL_TYPE_META, targetType) && canRoleAccessAction(role, 'add');
}

function getEditableTargetsForRole(row = {}, role = 'viewer') {
  return getAvailableEditTargetsFromRow(row).filter((target) => canEditTargetType(role, target));
}

function resolvePreferredEditTarget(row = {}, requestedTarget = '', role = 'viewer') {
  const normalizedRequestedTarget = String(requestedTarget || '')
    .trim()
    .toLowerCase();
  const editableTargets = getEditableTargetsForRole(row, role);

  if (normalizedRequestedTarget !== '') {
    return editableTargets.includes(normalizedRequestedTarget) ? normalizedRequestedTarget : '';
  }

  const editableBillTargets = editableTargets.filter((target) => target !== 'property');
  if (editableBillTargets.length === 1) {
    return editableBillTargets[0];
  }
  if (editableBillTargets.length > 1) {
    return '';
  }
  if (editableTargets.includes('property')) {
    return 'property';
  }
  return '';
}

function getDefaultEditTarget(row = {}, role = 'viewer') {
  return resolvePreferredEditTarget(row, '', role);
}

function getEditTargetLabel(targetType) {
  if (targetType === 'property') {
    return 'Property';
  }
  return BILL_TYPE_META[targetType]?.label || 'Record';
}

function getModuleSummaryCards(row = {}) {
  return Object.entries(BILL_TYPE_META)
    .filter(([type]) => getAvailableEditTargetsFromRow(row).includes(type))
    .map(([type, meta]) => ({
      type,
      label: meta.label,
      amount: row?.[meta.amountKey] || '-',
      dueDate: row?.[meta.dueDateKey] || '-',
      status: row?.[meta.statusKey] || '-'
    }));
}

function encodeNavigationContext(payload) {
  try {
    const json = JSON.stringify(payload);
    if (!json) {
      return '';
    }
    return window.btoa(unescape(encodeURIComponent(json)));
  } catch {
    return '';
  }
}

function getPopulatedBillTypesFromRow(row = {}) {
  const hasNonEmptyValue = (value) => {
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (normalized === '') {
      return false;
    }
    return !['-', '--', 'n/a', 'na', 'none', 'null'].includes(normalized);
  };
  const populated = [];

  if (
    hasNonEmptyValue(row.water_account_no) ||
    hasNonEmptyValue(row.water_amount) ||
    hasNonEmptyValue(row.water_due_date) ||
    hasNonEmptyValue(row.water_payment_status)
  ) {
    populated.push('water');
  }

  if (
    hasNonEmptyValue(row.electricity_account_no) ||
    hasNonEmptyValue(row.electricity_amount) ||
    hasNonEmptyValue(row.electricity_due_date) ||
    hasNonEmptyValue(row.electricity_payment_status)
  ) {
    populated.push('electricity');
  }

  if (
    hasNonEmptyValue(row.internet_provider) ||
    hasNonEmptyValue(row.internet_account_no) ||
    hasNonEmptyValue(row.wifi_amount) ||
    hasNonEmptyValue(row.wifi_due_date) ||
    hasNonEmptyValue(row.wifi_payment_status)
  ) {
    populated.push('internet');
  }

  if (
    hasNonEmptyValue(row.association_dues) ||
    hasNonEmptyValue(row.association_due_date) ||
    hasNonEmptyValue(row.association_payment_status)
  ) {
    populated.push('association_dues');
  }

  return populated;
}

function buildPropertyEditPayloadFromRow(row = {}) {
  return {
    property_list_id: Number(row.property_list_id || 0),
    dd: row.dd || '',
    property: row.property || '',
    due_period: normalizeBillingPeriodValue(row.due_period),
    unit_owner: row.unit_owner || '',
    classification: row.classification || '',
    deposit: row.deposit || '',
    rent: row.rent || '',
    per_property_status: row.per_property_status || '',
    real_property_tax: row.real_property_tax || '',
    rpt_payment_status: row.rpt_payment_status || '',
    penalty: row.penalty || ''
  };
}

function buildRecordsEditPayloadFromRow(row = {}, overrides = {}) {
  const billIdsByType = getBillIdsByType(row);
  const waterBillId = billIdsByType.water;
  const electricityBillId = billIdsByType.electricity;
  const internetBillId = billIdsByType.internet;
  const associationBillId = billIdsByType.association_dues;

  return {
    property_list_id: Number(row.property_list_id || 0),
    dd: row.dd || '',
    property: row.property || '',
    due_period: normalizeBillingPeriodValue(row.due_period),
    unit_owner: row.unit_owner || '',
    classification: row.classification || '',
    deposit: row.deposit || '',
    rent: row.rent || '',
    internet_provider: row.internet_provider || '',
    internet_account_no: row.internet_account_no || '',
    wifi_amount: row.wifi_amount || '',
    wifi_due_date: row.wifi_due_date || '',
    wifi_payment_status: row.wifi_payment_status || '',
    water_account_no: row.water_account_no || '',
    water_amount: row.water_amount || '',
    water_due_date: row.water_due_date || '',
    water_payment_status: row.water_payment_status || '',
    electricity_account_no: row.electricity_account_no || '',
    electricity_amount: row.electricity_amount || '',
    electricity_due_date: row.electricity_due_date || '',
    electricity_payment_status: row.electricity_payment_status || '',
    association_dues: row.association_dues || '',
    association_due_date: row.association_due_date || '',
    association_payment_status: row.association_payment_status || '',
    real_property_tax: row.real_property_tax || '',
    rpt_payment_status: row.rpt_payment_status || '',
    penalty: row.penalty || '',
    per_property_status: row.per_property_status || '',
    bill_type: '',
    editing_bill_id: 0,
    water_bill_id: waterBillId,
    electricity_bill_id: electricityBillId,
    internet_bill_id: internetBillId,
    association_bill_id: associationBillId,
    ...overrides
  };
}

export default function RecordsPage() {
  useEffect(() => {
    clearSharedBillSelection();
  }, []);

  const navigate = useNavigate();
  const isPhoneLayout = useMediaQuery('(max-width: 760px)');
  const { data: sessionData } = useQuery(getSessionQueryOptions());
  const [search, setSearch] = useState('');
  const [duePeriodFilter, setDuePeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState('');
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [selectedEditTarget, setSelectedEditTarget] = useState('');
  const [fieldsAnimating, setFieldsAnimating] = useState(false);
  const [recordsFeedback, setRecordsFeedback] = useState(null);
  const { toasts, showToast, removeToast } = useToast();
  const tableColumns = ALL_COLUMNS;
  const deferredSearch = useDeferredValue(search);
  const normalizedDuePeriodFilter = normalizeBillingPeriodValue(duePeriodFilter);
  const currentRole = normalizeUserRole(sessionData?.role || getStoredSessionRole() || 'viewer', 'viewer');
  const canEditPropertyTarget = canRoleAccessAction(currentRole, 'property_record_update');
  const recordsPermissionNotice =
    currentRole === 'viewer'
      ? {
          tone: 'info',
          title: 'Read-Only Access',
          message: 'You can search and export monthly records here. Editing bills requires editor access, and property detail edits require admin access.'
        }
      : currentRole === 'editor'
        ? {
            tone: 'info',
            title: 'Limited Edit Access',
            message: 'You can edit bill sections from Records. Property detail edits still require admin access.'
          }
        : null;

  const {
    data: recordsResponse = { data: [], meta: null },
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['records-merged-list', page, deferredSearch, normalizedDuePeriodFilter],
    queryFn: () =>
      fetchMergedBills({
        page,
        perPage: ROWS_PER_PAGE,
        search: deferredSearch,
        duePeriod: normalizedDuePeriodFilter,
        includeMeta: true
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 15000
  });

  const records = useMemo(() => {
    if (Array.isArray(recordsResponse)) {
      return recordsResponse;
    }
    return Array.isArray(recordsResponse?.data) ? recordsResponse.data : [];
  }, [recordsResponse]);
  const recordsMeta = Array.isArray(recordsResponse) ? null : recordsResponse?.meta || null;
  const totalRows = Number(recordsMeta?.total || records.length || 0);
  const totalPages = Math.max(1, Number(recordsMeta?.total_pages || (totalRows > 0 ? Math.ceil(totalRows / ROWS_PER_PAGE) : 1)));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = records;
  const pageStart = totalRows === 0 || pageRows.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = totalRows === 0 || pageRows.length === 0 ? 0 : Math.min(totalRows, pageStart + pageRows.length - 1);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    if (!selectedRowKey) {
      return;
    }

    const stillVisible = pageRows.some((row) => getRowKey(row) === selectedRowKey);
    if (!stillVisible) {
      setSelectedRowKey('');
      setSelectedRowData(null);
      setSelectedEditTarget('');
    }
  }, [pageRows, selectedRowKey]);

  useEffect(() => {
    setFieldsAnimating(true);
    const timer = window.setTimeout(() => setFieldsAnimating(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isError) {
      setRecordsFeedback({
        tone: 'error',
        title: 'Records Unavailable',
        message: error?.message || 'The monthly records could not be loaded.'
      });
    }
  }, [isError, error]);

  function showRecordsPermissionMessage(message) {
    const nextMessage = String(message || 'Your role can view this monthly record, but cannot edit the selected section.');
    setRecordsFeedback({
      tone: 'warning',
      title: 'Access Limited',
      message: nextMessage
    });
    showToast('warning', nextMessage);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleDuePeriodFilterChange(event) {
    setDuePeriodFilter(event.target.value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearch('');
    setDuePeriodFilter('');
    setPage(1);
    setRecordsFeedback({
      tone: 'info',
      title: 'Filters Cleared',
      message: 'All monthly records are showing again.'
    });
  }

  function getRowKey(row) {
    const dd = String(row.dd || '').trim();
    const property = String(row.property || '').trim();
    const owner = String(row.unit_owner || '').trim();
    const id = Number(row.id || 0);
    return `${id}|${dd}|${property}|${owner}`;
  }

  function handleSelectRow(row) {
    setSelectedRowKey(getRowKey(row));
    setSelectedRowData(row);
    setSelectedEditTarget(getDefaultEditTarget(row, currentRole));
    const guidanceMessage =
      currentRole === 'viewer'
        ? 'You can review this monthly record here, but editing requires a higher role.'
        : currentRole === 'editor'
          ? 'Choose a bill section below, then press Edit. Property detail edits require admin access.'
          : 'Choose the section you want to edit, then press Edit.';
    setRecordsFeedback({
      tone: 'info',
      title: 'Monthly Record Selected',
      message: guidanceMessage
    });
  }

  function handleRowKeyDown(event, row) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectRow(row);
    }
  }

  function handleEditSelectedRow(rowOverride = null, targetTypeOverride = '') {
    const isEventLikeObject =
      rowOverride &&
      typeof rowOverride === 'object' &&
      (typeof rowOverride.preventDefault === 'function' || 'nativeEvent' in rowOverride);
    const safeRowOverride = isEventLikeObject ? null : rowOverride;
    const selectedRowFromKey = selectedRowKey
      ? pageRows.find((row) => getRowKey(row) === selectedRowKey) || null
      : null;
    const rowToEdit = safeRowOverride || selectedRowFromKey || selectedRowData;
    if (!rowToEdit) {
      setRecordsFeedback({
        tone: 'warning',
        title: 'Choose A Record First',
        message: 'Select a monthly record before trying to edit.'
      });
      showToast('warning', 'Select a row first before editing.');
      return;
    }

    const availableEditTargets = getAvailableEditTargetsFromRow(rowToEdit);
    const editableTargets = getEditableTargetsForRole(rowToEdit, currentRole);
    const requestedTargetType = String(targetTypeOverride || selectedEditTarget || '').trim().toLowerCase();
    if (requestedTargetType !== '' && !availableEditTargets.includes(requestedTargetType)) {
      setRecordsFeedback({
        tone: 'warning',
        title: 'Section Not Available',
        message: 'The selected edit section is not available for this monthly record.'
      });
      showToast('warning', 'The selected edit section is not available for this monthly record.');
      return;
    }

    if (requestedTargetType !== '' && !editableTargets.includes(requestedTargetType)) {
      showRecordsPermissionMessage(
        requestedTargetType === 'property'
          ? 'Property detail edits from Records require admin access.'
          : 'Editing bill sections from Records requires editor access.'
      );
      return;
    }

    const resolvedTargetType = resolvePreferredEditTarget(rowToEdit, requestedTargetType, currentRole);
    if (resolvedTargetType === '') {
      if (editableTargets.length === 0) {
        showRecordsPermissionMessage(
          currentRole === 'viewer'
            ? 'You have read-only access. Editors can update bill sections, and property detail edits require admin access.'
            : 'This monthly record only exposes property details, and property edits require admin access.'
        );
        return;
      }

      const editableBillTargetCount = editableTargets.filter((target) => target !== 'property').length;
      setRecordsFeedback({
        tone: 'warning',
        title: 'Choose What To Edit',
        message:
          editableBillTargetCount > 1
            ? 'Select which bill section to edit for this monthly record first.'
            : 'Select which editable section you want to open for this monthly record first.'
      });
      showToast(
        'warning',
        editableBillTargetCount > 1
          ? 'Select which bill section to edit for this monthly record first.'
          : 'Select which editable section to open for this monthly record first.'
      );
      return;
    }

    if (resolvedTargetType === 'property') {
      const recordsPayload = buildRecordsEditPayloadFromRow(rowToEdit, {
        bill_type: '',
        editing_bill_id: 0
      });
      setRecordsEditContext(recordsPayload);
      setWindowRecordsEditContext(recordsPayload);
      setGlobalEditMode({
        source: 'records',
        bill_type: '',
        route: '/property-records',
        records_edit_context: recordsPayload
      });
      navigate('/property-records');
      return;
    }

    const rowId = Number(rowToEdit.id || 0);
    const billType = resolvedTargetType || resolveBillTypeFromRow(rowToEdit);
    const billIdsByType = getBillIdsByType(rowToEdit);
    const waterBillId = billIdsByType.water;
    const electricityBillId = billIdsByType.electricity;
    const internetBillId = billIdsByType.internet;
    const associationBillId = billIdsByType.association_dues;
    const editableTypes = Object.keys(billIdsByType).filter((type) => billIdsByType[type] > 0);
    const populatedTypes = getPopulatedBillTypesFromRow(rowToEdit);
    const candidateTypes = Array.from(new Set([...editableTypes, ...populatedTypes]));

    const editingBillId =
      billType === 'water'
        ? waterBillId
        : billType === 'electricity'
          ? electricityBillId
          : billType === 'internet'
            ? internetBillId
            : associationBillId;
    let targetType = billType;
    let targetEditingBillId = editingBillId;

    if (targetEditingBillId <= 0) {
      const fallbackType = ['water', 'electricity', 'internet', 'association_dues'].find(
        (type) => billIdsByType[type] > 0
      );
      const fallbackTypeFromData = candidateTypes.length === 1 ? candidateTypes[0] : '';

      if (!fallbackType) {
        // Allow Bills edit flow to continue in create mode when merged rows have bill values but no persisted bill IDs.
        if (fallbackTypeFromData !== '') {
          targetType = fallbackTypeFromData;
          targetEditingBillId = 0;
        } else if (billType) {
          targetType = billType;
          targetEditingBillId = 0;
        }
      } else {
        targetType = fallbackType;
        targetEditingBillId = billIdsByType[fallbackType];
      }
    }

    const targetRoute = getBillRouteByType(targetType);
    const payload = {
      ...buildRecordsEditPayloadFromRow(rowToEdit),
      bill_type: targetType,
      editing_bill_id: targetEditingBillId,
      water_bill_id: waterBillId || rowId,
      electricity_bill_id: electricityBillId || rowId,
      internet_bill_id: internetBillId || rowId,
      association_bill_id: associationBillId || rowId
    };
    setRecordsEditContext(payload);
    setWindowRecordsEditContext(payload);
    setSharedBillSelection({
      form: {
        ...payload,
        bill_type: targetType
      },
      property_list_id: Number(payload.property_list_id || 0),
      dd: payload.dd || '',
      property: payload.property || '',
      due_period: payload.due_period || '',
      comboSearch: payload.property || payload.dd || ''
    });
    setSelectedPropertyContext(buildPropertyEditPayloadFromRow(rowToEdit));
    setGlobalEditMode({
      source: 'records',
      bill_type: targetType,
      route: targetRoute,
      records_edit_context: payload
    });
    const encodedContext = encodeNavigationContext(payload);
    const targetRouteWithContext =
      encodedContext !== '' ? `${targetRoute}?ctx=${encodeURIComponent(encodedContext)}` : targetRoute;
    navigate(targetRouteWithContext, {
      state: {
        recordsEditContext: payload
      }
    });
  }

  async function exportCsv() {
    if (exporting) {
      return;
    }

    setExporting(true);
    setRecordsFeedback({
      tone: 'info',
      title: 'Preparing Export',
      message: 'Please wait while the monthly records file is created.'
    });
    try {
      const exportSearch = String(search || '').trim();
      const exportDuePeriod = normalizeBillingPeriodValue(duePeriodFilter);
      const firstPage = await fetchMergedBills({
        page: 1,
        perPage: 200,
        search: exportSearch,
        duePeriod: exportDuePeriod,
        includeMeta: true
      });
      const firstPageRows = Array.isArray(firstPage) ? firstPage : firstPage?.data || [];
      const firstPageMeta = Array.isArray(firstPage) ? null : firstPage?.meta || null;
      const recordsData = [...firstPageRows];
      const exportTotalPages = Math.max(1, Number(firstPageMeta?.total_pages || 1));

      for (let nextPage = 2; nextPage <= exportTotalPages; nextPage += 1) {
        const nextResult = await fetchMergedBills({
          page: nextPage,
          perPage: 200,
          search: exportSearch,
          duePeriod: exportDuePeriod,
          includeMeta: true
        });
        const nextRows = Array.isArray(nextResult) ? nextResult : nextResult?.data || [];
        recordsData.push(...nextRows);
      }

      if (!Array.isArray(recordsData) || recordsData.length === 0) {
        setRecordsFeedback({
          tone: 'warning',
          title: 'Nothing To Export',
          message: 'No monthly records match the current filters.'
        });
        showToast('error', 'No records found to export.');
        return;
      }

      const lines = [EXPORT_COLUMNS.map(([, label]) => label).join(',')];

      recordsData.forEach((row) => {
        lines.push(EXPORT_COLUMNS.map(([key]) => toCsvCell(row[key])).join(','));
      });

      const csv = lines.join('\r\n');
      const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().split('T')[0];
      const duePeriodSuffix = exportDuePeriod;
      const filterSuffix = duePeriodSuffix !== '' ? `_${duePeriodSuffix}` : '';

      link.href = url;
      link.download = `monthly_records${filterSuffix}_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setRecordsFeedback({
        tone: 'success',
        title: 'Export Complete',
        message: `Exported ${recordsData.length} monthly record(s).`
      });
      showToast('success', `Exported ${recordsData.length} records.`);
    } catch (exportError) {
      setRecordsFeedback({
        tone: 'error',
        title: 'Export Failed',
        message: String(exportError?.message || 'Failed to export records.')
      });
      showToast('error', String(exportError?.message || 'Failed to export records.'));
    } finally {
      setExporting(false);
    }
  }

  const selectedRowTargets = useMemo(
    () => (selectedRowData ? getAvailableEditTargetsFromRow(selectedRowData) : []),
    [selectedRowData]
  );
  const selectedRowModuleCards = useMemo(
    () => (selectedRowData ? getModuleSummaryCards(selectedRowData) : []),
    [selectedRowData]
  );
  const selectedRowDisplayName = selectedRowData?.property || selectedRowData?.dd || 'Monthly record';
  const resolvedSelectedEditTarget = selectedRowData
    ? resolvePreferredEditTarget(selectedRowData, selectedEditTarget, currentRole)
    : '';

  function renderMobileRecordCard(row) {
    const rowKey = getRowKey(row);
    const isSelected = selectedRowKey === rowKey;
    const moduleCards = getModuleSummaryCards(row);
    const canOpenEditDirectly = resolvePreferredEditTarget(row, '', currentRole) !== '';

    return (
      <article
        key={rowKey}
        className={`records-mobile-card${isSelected ? ' active' : ''}`}
        aria-selected={isSelected}
      >
        <div className="records-mobile-card-header">
          <div>
            <p className="records-mobile-card-eyebrow">{row.dd || 'No DD'}</p>
            <h3>{row.property || row.dd || 'Monthly record'}</h3>
          </div>
          <span className="records-mobile-pill">{row.due_period || 'No due period'}</span>
        </div>

        <div className="records-mobile-card-meta">
          <span>Owner: {row.unit_owner || '-'}</span>
          <span>Property ID: {Number(row.property_list_id || 0) > 0 ? row.property_list_id : '-'}</span>
        </div>

        <div className="records-mobile-module-list">
          {moduleCards.length > 0 ? (
            moduleCards.map((module) => (
              <div key={`${rowKey}-${module.type}`} className="records-mobile-module-item">
                <strong>{module.label}</strong>
                <span>Amount: {module.amount}</span>
                <span>Due: {module.dueDate}</span>
                <span>Status: {module.status}</span>
              </div>
            ))
          ) : (
            <div className="records-mobile-module-item records-mobile-module-empty">
              <strong>Property only</strong>
              <span>No bill sections have been saved for this month yet.</span>
            </div>
          )}
        </div>

        <div className="records-mobile-card-actions">
          <button type="button" className="btn btn-secondary" onClick={() => handleSelectRow(row)}>
            {isSelected ? 'Selected' : 'Select'}
          </button>
          <button
            type="button"
            className={canOpenEditDirectly ? 'btn active' : 'btn btn-secondary'}
            onClick={() => {
              handleSelectRow(row);
              handleEditSelectedRow(row);
            }}
            disabled={!canOpenEditDirectly}
          >
            Edit
          </button>
        </div>
      </article>
    );
  }

  return (
    <AppLayout
      title="Bills Records"
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />

      <section className="card records-card">
        {recordsPermissionNotice && <StatusBanner feedback={recordsPermissionNotice} />}
        <StatusBanner feedback={recordsFeedback} />
        <div className="filters records-toolbar-filters">
          <label className="toolbar-field">
            <span>Find monthly record</span>
            <input value={search} onChange={handleSearchChange} placeholder="Search visible fields..." />
          </label>
          <label className="toolbar-field toolbar-field-month">
            <span>Due period</span>
            <input
              type="month"
              aria-label="Filter by due period"
              value={duePeriodFilter}
              onChange={handleDuePeriodFilterChange}
            />
          </label>
          {isLoading ? (
            <>
              <SkeletonButton width={110} height={44} />
              <SkeletonButton width={140} height={44} />
              <SkeletonButton width={140} height={44} />
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearFilters}
                disabled={search === '' && duePeriodFilter === ''}
              >
                Clear
              </button>
              <button
                type="button"
                className={resolvedSelectedEditTarget !== '' ? 'btn active' : 'btn btn-secondary'}
                onClick={() => handleEditSelectedRow()}
                disabled={!selectedRowData || resolvedSelectedEditTarget === ''}
              >
                Edit
              </button>
              <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </>
          )}
        </div>
        <div className="records-body-scroll">
          {!isLoading && !isError && selectedRowData && (
            <section className="records-selection-panel" aria-label="Selected monthly record">
              <div className="records-selection-header">
                <div>
                  <p className="records-selection-eyebrow">Selected monthly record</p>
                  <h2>{selectedRowDisplayName}</h2>
                  <p className="muted-text">
                    {currentRole === 'viewer'
                      ? 'This monthly record is view-only for your role.'
                      : currentRole === 'editor'
                        ? 'Choose a bill section below, then press Edit. Property detail edits require admin access.'
                        : 'Choose one section below, then press Edit to continue.'}
                  </p>
                </div>
                <div className="records-selection-meta">
                  <span>{selectedRowData.dd || '-'}</span>
                  <span>{selectedRowData.due_period || 'No due period'}</span>
                  <span>{selectedRowData.unit_owner || 'No unit owner'}</span>
                </div>
              </div>
              <div className="records-selection-actions">
                <button
                  type="button"
                  className={`records-edit-chip${selectedEditTarget === 'property' ? ' active' : ''}`}
                  onClick={() => setSelectedEditTarget('property')}
                  aria-label="Edit Property"
                  disabled={!canEditTargetType(currentRole, 'property')}
                >
                  Property Details
                </button>
                {selectedRowTargets
                  .filter((target) => target !== 'property')
                  .map((target) => (
                    <button
                      key={target}
                      type="button"
                      className={`records-edit-chip${selectedEditTarget === target ? ' active' : ''}`}
                      onClick={() => setSelectedEditTarget(target)}
                      aria-label={`Edit ${getEditTargetLabel(target)}`}
                      disabled={!canEditTargetType(currentRole, target)}
                    >
                      {getEditTargetLabel(target)}
                    </button>
                  ))}
              </div>
              <div className="records-selection-grid">
                {selectedRowModuleCards.length > 0 ? (
                  selectedRowModuleCards.map((module) => (
                    <button
                      key={module.type}
                      type="button"
                      className={`records-module-card${selectedEditTarget === module.type ? ' active' : ''}`}
                      onClick={() => setSelectedEditTarget(module.type)}
                      disabled={!canEditTargetType(currentRole, module.type)}
                    >
                      <span className="records-module-label">{module.label}</span>
                      <strong>{module.amount}</strong>
                      <span>Due: {module.dueDate}</span>
                      <span>Status: {module.status}</span>
                    </button>
                  ))
                ) : (
                  <div className="records-module-empty">This monthly record currently only has property details.</div>
                )}
              </div>
            </section>
          )}
          {isLoading && (
            <div className="records-loading-shell" role="status" aria-live="polite" aria-label="Loading records">
              <div className="records-loading-table">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonLine key={`bills-records-loading-${index}`} width="100%" height={15} radius={8} />
                ))}
              </div>
            </div>
          )}
          {isError && <p className="error">{error.message}</p>}

        {!isLoading && !isError && totalRows === 0 && (
          <div className="empty-state">
            <p>No records found.</p>
            {canEditPropertyTarget && (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/property-records')}>
                Create Property Record
              </button>
            )}
          </div>
        )}

          {!isLoading && !isError && totalRows > 0 && (
            <div className={`records-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}>
              {isPhoneLayout ? (
                <div className="records-mobile-list" aria-label="Monthly records mobile list">
                  {pageRows.map((row) => renderMobileRecordCard(row))}
                </div>
              ) : (
                <>
                  <div className="records-table-hint">Scroll sideways to view all bill fields. DD and Property stay pinned.</div>
                  <div className="table-wrap records-table-wrap">
                    <table className="records-data-grid">
                      <thead>
                        <tr className="records-group-header">
                          {COLUMN_GROUPS.map(([label, span]) => (
                            <th key={`group-${label}`} colSpan={span}>
                              {label}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {tableColumns.map(([, label], index) => (
                            <th key={`${label}-${index}`}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row) => (
                          <tr
                            key={getRowKey(row)}
                            className={selectedRowKey === getRowKey(row) ? 'table-row-selected' : ''}
                            tabIndex={0}
                            aria-selected={selectedRowKey === getRowKey(row)}
                            onKeyDown={(event) => handleRowKeyDown(event, row)}
                            onClick={() => handleSelectRow(row)}
                            onDoubleClick={() => {
                              handleSelectRow(row);
                              if (resolvePreferredEditTarget(row, '', currentRole) !== '') {
                                handleEditSelectedRow(row);
                              }
                            }}
                          >
                            {tableColumns.map(([key]) => (
                              <td key={`${getRowKey(row)}-${key}`}>{row[key] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="pagination records-pagination">
                <div className="records-pagination-meta">
                  <button type="button" className="btn btn-secondary" onClick={() => navigate('/records')}>
                    Back
                  </button>
                  <span>
                    Showing {pageStart}-{pageEnd} of {totalRows}
                  </span>
                </div>
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
        </div>
        {isPhoneLayout && totalRows > 0 && (
          <div className="mobile-sticky-bar records-mobile-sticky-bar">
            <div className="mobile-sticky-bar-copy">
              <strong>{selectedRowData ? selectedRowDisplayName : 'Select a monthly record'}</strong>
              <span>
                {selectedRowData
                  ? resolvedSelectedEditTarget !== ''
                    ? `${getEditTargetLabel(resolvedSelectedEditTarget)} ready to edit`
                    : 'Choose which section to edit'
                  : 'Tap a card to review or edit'}
              </span>
            </div>
            <div className="mobile-sticky-bar-actions">
              <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export'}
              </button>
              <button
                type="button"
                className={resolvedSelectedEditTarget !== '' ? 'btn active' : 'btn btn-secondary'}
                onClick={() => handleEditSelectedRow()}
                disabled={!selectedRowData || resolvedSelectedEditTarget === ''}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

