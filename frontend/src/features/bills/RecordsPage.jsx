// Finance App File: frontend\src\pages\RecordsPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import { SkeletonLine } from '../../shared/components/Skeleton.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { fetchMergedBills } from '../../shared/lib/api.js';
import { clearGlobalEditMode, setGlobalEditMode } from '../../shared/lib/globalEditMode.js';

const ROWS_PER_PAGE = 10;
const SHARED_BILL_SELECTION_KEY = 'finance-bill-selection:shared';
const RECORDS_EDIT_CONTEXT_KEY = 'finance:records-edit-context';

const SHARED_COLUMNS = [
  ['dd', 'DD'],
  ['property', 'Property'],
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
  ...SHARED_COLUMNS,
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

const BILL_CONFIG = {
  all: {
    title: 'All Bills',
    columns: ALL_COLUMNS,
    hasData: () => true
  },
  water: {
    title: 'Water Bills',
    columns: [...SHARED_COLUMNS, ...WATER_COLUMNS],
    hasData: (row) => Number(row.water_bill_id || 0) > 0
  },
  electricity: {
    title: 'Electricity Bills',
    columns: [...SHARED_COLUMNS, ...ELECTRICITY_COLUMNS],
    hasData: (row) => Number(row.electricity_bill_id || 0) > 0
  },
  wifi: {
    title: 'WiFi Bills',
    columns: [...SHARED_COLUMNS, ...WIFI_COLUMNS],
    hasData: (row) => Number(row.internet_bill_id || 0) > 0
  },
  association: {
    title: 'Association Bills',
    columns: [...SHARED_COLUMNS, ...ASSOCIATION_COLUMNS],
    hasData: (row) => Number(row.association_bill_id || 0) > 0
  }
};

const BILL_VIEW_TO_TYPE = {
  water: 'water',
  electricity: 'electricity',
  wifi: 'internet',
  association: 'association_dues'
};

const BILL_TYPE_TO_ROUTE = {
  water: '/bills/water',
  electricity: '/bills/electricity',
  internet: '/bills/wifi',
  association_dues: '/bills/association'
};
const BILL_VIEW_OPTIONS = [
  ['all', 'All'],
  ['water', 'Water'],
  ['electricity', 'Electricity'],
  ['wifi', 'WiFi'],
  ['association', 'Association']
];

function BillViewIcon({ viewKey }) {
  if (viewKey === 'all') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="5" width="16" height="14" rx="2.2" />
        <path strokeLinecap="round" d="M8 9h8M8 12h8M8 15h5" />
      </svg>
    );
  }
  if (viewKey === 'water') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c3.6 4.1 6 7 6 10a6 6 0 1 1-12 0c0-3 2.4-5.9 6-10z" />
      </svg>
    );
  }
  if (viewKey === 'electricity') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2.5L5.8 12H12l-1 9.5L18.2 12H12.8L13 2.5z" />
      </svg>
    );
  }
  if (viewKey === 'wifi') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" d="M3.5 9.5A12.5 12.5 0 0 1 20.5 9.5" />
        <path strokeLinecap="round" d="M6.8 12.8a8 8 0 0 1 10.4 0" />
        <path strokeLinecap="round" d="M10.1 16.1a3.4 3.4 0 0 1 3.8 0" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="9" r="2.2" />
      <circle cx="16" cy="9" r="2.2" />
      <path strokeLinecap="round" d="M4.5 18c.6-2 2.1-3.2 3.5-3.2h0c1.4 0 2.9 1.2 3.5 3.2" />
      <path strokeLinecap="round" d="M12.5 18c.6-2 2.1-3.2 3.5-3.2h0c1.4 0 2.9 1.2 3.5 3.2" />
    </svg>
  );
}

function resolveBillTypeFromRow(row, billView) {
  const viewType = BILL_VIEW_TO_TYPE[billView] || '';
  if (viewType) {
    return viewType;
  }

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
    water:
      String(
        row?.water_account_no || row?.water_amount || row?.water_due_date || row?.water_payment_status || ''
      ).trim() !== '',
    electricity:
      String(
        row?.electricity_account_no ||
        row?.electricity_amount ||
        row?.electricity_due_date ||
        row?.electricity_payment_status ||
        ''
      ).trim() !== '',
    internet:
      String(
        row?.wifi_amount ||
        row?.internet_account_no ||
        row?.internet_provider ||
        row?.wifi_due_date ||
        row?.wifi_payment_status ||
        ''
      ).trim() !== '',
    association_dues:
      String(row?.association_dues || row?.association_due_date || row?.association_payment_status || '').trim() !== ''
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

function getPopulatedBillTypesFromRow(row = {}) {
  const hasNonEmptyValue = (value) => String(value ?? '').trim() !== '';
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

export default function RecordsPage() {
  useEffect(() => {
    window.sessionStorage.removeItem(SHARED_BILL_SELECTION_KEY);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState('');
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [fieldsAnimating, setFieldsAnimating] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const billView = searchParams.get('bill') || 'all';
  const config = BILL_CONFIG[billView] || BILL_CONFIG.all;
  const tableColumns = config.columns;

  const {
    data: records = [],
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['records-merged-list'],
    queryFn: fetchMergedBills
  });

  const filteredRows = useMemo(() => {
    const allRows = Array.isArray(records) ? records : [];
    const byView = allRows.filter((row) => (billView === 'all' ? true : config.hasData(row)));
    const query = String(search || '')
      .trim()
      .toLowerCase();
    if (query === '') {
      return byView;
    }

    return byView.filter((row) =>
      tableColumns.some(([key]) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(query)
      )
    );
  }, [records, billView, config, search, tableColumns]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRows.slice(startIndex, startIndex + ROWS_PER_PAGE);
  const pageStart = totalRows === 0 || pageRows.length === 0 ? 0 : startIndex + 1;
  const pageEnd = totalRows === 0 || pageRows.length === 0 ? 0 : Math.min(totalRows, startIndex + pageRows.length);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  useEffect(() => {
    setPage(1);
    setSelectedRowKey('');
    setSelectedRowData(null);
  }, [billView]);

  useEffect(() => {
    if (!selectedRowKey) {
      return;
    }

    const stillVisible = filteredRows.some((row) => getRowKey(row) === selectedRowKey);
    if (!stillVisible) {
      setSelectedRowKey('');
      setSelectedRowData(null);
    }
  }, [filteredRows, selectedRowKey]);

  useEffect(() => {
    setFieldsAnimating(true);
    const timer = window.setTimeout(() => setFieldsAnimating(false), 220);
    return () => window.clearTimeout(timer);
  }, [billView]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleBillViewChange(nextView) {
    const safeView = String(nextView || 'all');
    if (safeView === 'all') {
      setSearchParams({});
      return;
    }
    setSearchParams({ bill: safeView });
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
  }

  function handleRowKeyDown(event, row) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectRow(row);
    }
  }

  function handleEditSelectedRow(rowOverride = null) {
    const selectedRowFromKey = selectedRowKey
      ? filteredRows.find((row) => getRowKey(row) === selectedRowKey) || null
      : null;
    const rowToEdit = rowOverride || selectedRowFromKey || selectedRowData;
    if (!rowToEdit) {
      showToast('warning', 'Select a row first before editing.');
      return;
    }

    const rowId = Number(rowToEdit.id || 0);
    const billType = resolveBillTypeFromRow(rowToEdit, billView);
    const billIdsByType = getBillIdsByType(rowToEdit);
    const waterBillId = billIdsByType.water;
    const electricityBillId = billIdsByType.electricity;
    const internetBillId = billIdsByType.internet;
    const associationBillId = billIdsByType.association_dues;
    const editableTypes = Object.keys(billIdsByType).filter((type) => billIdsByType[type] > 0);
    const populatedTypes = getPopulatedBillTypesFromRow(rowToEdit);
    const candidateTypes = Array.from(new Set([...editableTypes, ...populatedTypes]));

    if (billView === 'all' && candidateTypes.length > 1) {
      showToast(
        'warning',
        'This row has multiple bill modules. Select Water, Electricity, WiFi, or Association first, then click Edit.'
      );
      return;
    }

    const editingBillId =
      (billType === 'water'
        ? waterBillId
        : billType === 'electricity'
          ? electricityBillId
          : billType === 'internet'
            ? internetBillId
            : associationBillId) || rowId;
    let targetType = billType;
    let targetEditingBillId = editingBillId;

    if (targetEditingBillId <= 0) {
      const fallbackType = ['water', 'electricity', 'internet', 'association_dues'].find(
        (type) => billIdsByType[type] > 0
      );

      if (!fallbackType) {
        const hasPropertyIdentity =
          Number(rowToEdit.property_list_id || 0) > 0 ||
          String(rowToEdit.dd || '').trim() !== '' ||
          String(rowToEdit.property || '').trim() !== '';
        if (!hasPropertyIdentity) {
          showToast('warning', 'No editable bill ID exists for the selected row.');
          return;
        }

        const propertyPayload = buildPropertyEditPayloadFromRow(rowToEdit);
        window.sessionStorage.setItem(RECORDS_EDIT_CONTEXT_KEY, JSON.stringify(propertyPayload));
        clearGlobalEditMode();
        navigate('/property-records');
        return;
      }

      if (billView !== 'all' && fallbackType !== billType) {
        showToast('warning', 'No editable bill ID exists for this module.');
        return;
      }

      targetType = fallbackType;
      targetEditingBillId = billIdsByType[fallbackType];
    }

    const targetRoute = getBillRouteByType(targetType);
    const payload = {
      property_list_id: Number(rowToEdit.property_list_id || 0),
      dd: rowToEdit.dd || '',
      property: rowToEdit.property || '',
      due_period: normalizeBillingPeriodValue(rowToEdit.due_period),
      unit_owner: rowToEdit.unit_owner || '',
      classification: rowToEdit.classification || '',
      deposit: rowToEdit.deposit || '',
      rent: rowToEdit.rent || '',
      internet_provider: rowToEdit.internet_provider || '',
      internet_account_no: rowToEdit.internet_account_no || '',
      wifi_amount: rowToEdit.wifi_amount || '',
      wifi_due_date: rowToEdit.wifi_due_date || '',
      wifi_payment_status: rowToEdit.wifi_payment_status || '',
      water_account_no: rowToEdit.water_account_no || '',
      water_amount: rowToEdit.water_amount || '',
      water_due_date: rowToEdit.water_due_date || '',
      water_payment_status: rowToEdit.water_payment_status || '',
      electricity_account_no: rowToEdit.electricity_account_no || '',
      electricity_amount: rowToEdit.electricity_amount || '',
      electricity_due_date: rowToEdit.electricity_due_date || '',
      electricity_payment_status: rowToEdit.electricity_payment_status || '',
      association_dues: rowToEdit.association_dues || '',
      association_due_date: rowToEdit.association_due_date || '',
      association_payment_status: rowToEdit.association_payment_status || '',
      real_property_tax: rowToEdit.real_property_tax || '',
      rpt_payment_status: rowToEdit.rpt_payment_status || '',
      penalty: rowToEdit.penalty || '',
      per_property_status: rowToEdit.per_property_status || '',
      bill_type: targetType,
      editing_bill_id: targetEditingBillId,
      water_bill_id: waterBillId || rowId,
      electricity_bill_id: electricityBillId || rowId,
      internet_bill_id: internetBillId || rowId,
      association_bill_id: associationBillId || rowId
    };

    window.sessionStorage.setItem(RECORDS_EDIT_CONTEXT_KEY, JSON.stringify(payload));
    setGlobalEditMode({
      source: 'records',
      bill_type: targetType,
      route: targetRoute
    });
    navigate(targetRoute);
  }

  async function exportCsv() {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      const exportSource = await fetchMergedBills();
      const byView = exportSource.filter((row) => (billView === 'all' ? true : config.hasData(row)));
      const query = String(search || '')
        .trim()
        .toLowerCase();
      const recordsData =
        query === ''
          ? byView
          : byView.filter((row) =>
            tableColumns.some(([key]) =>
              String(row[key] || '')
                .toLowerCase()
                .includes(query)
            )
          );

      if (!Array.isArray(recordsData) || recordsData.length === 0) {
        showToast('error', 'No records found to export.');
        return;
      }

      const lines = [EXPORT_COLUMNS.map(([, label]) => label).join(',')];

      recordsData.forEach((row) => {
        lines.push(EXPORT_COLUMNS.map(([key]) => toCsvCell(row[key])).join(','));
      });

      const csv = lines.join('\n');
      const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().split('T')[0];

      link.href = url;
      link.download = `csv_exact_records_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', `Exported ${recordsData.length} records.`);
    } catch (exportError) {
      showToast('error', String(exportError?.message || 'Failed to export records.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout
      title="Bills Records"
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />

      <section className="card records-card">
        <div className="bills-stepper record-view-switch" role="tablist" aria-label="Record views">
          {BILL_VIEW_OPTIONS.map(([key, label], index) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={billView === key}
              className={`bills-step-btn ${billView === key ? 'active' : ''}`}
              onClick={() => handleBillViewChange(key)}
            >
              <span className="bills-step-index">{index + 1}</span>
              <span className="bills-step-icon" aria-hidden="true">
                <BillViewIcon viewKey={key} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <input value={search} onChange={handleSearchChange} placeholder="Search visible fields..." />
          <button
            type="button"
            className={selectedRowData ? 'btn active' : 'btn btn-secondary'}
            onClick={handleEditSelectedRow}
            disabled={!selectedRowData}
          >
            Edit
          </button>
          <button type="button" className="btn active" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
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
            <p>No records found for this view.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/property-records')}>
              Create Property Record
            </button>
          </div>
        )}

        {!isLoading && !isError && totalRows > 0 && (
          <div className={`records-content bill-fields-region${fieldsAnimating ? ' bill-fields-animating' : ''}`}>
            <div className="table-wrap records-table-wrap">
              <table>
                <thead>
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
                        handleEditSelectedRow(row);
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
      </section>
    </AppLayout>
  );
}

