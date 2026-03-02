// Finance App File: frontend\src\pages\RecordsPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { fetchMergedBills } from '../../shared/lib/api.js';
import { setGlobalEditMode } from '../../shared/lib/globalEditMode.js';

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

function resolveBillTypeFromRow(row, billView) {
  const viewType = BILL_VIEW_TO_TYPE[billView] || '';
  if (viewType) {
    return viewType;
  }

  const hintedType = String(row?.bill_type || '').trim().toLowerCase();
  if (hintedType === 'water' || hintedType === 'electricity' || hintedType === 'internet' || hintedType === 'association_dues') {
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
    water: String(row?.water_account_no || row?.water_amount || row?.water_due_date || row?.water_payment_status || '').trim() !== '',
    electricity: String(row?.electricity_account_no || row?.electricity_amount || row?.electricity_due_date || row?.electricity_payment_status || '').trim() !== '',
    internet: String(row?.wifi_amount || row?.internet_account_no || row?.internet_provider || row?.wifi_due_date || row?.wifi_payment_status || '').trim() !== '',
    association_dues: String(row?.association_dues || row?.association_due_date || row?.association_payment_status || '').trim() !== ''
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

  const slash = raw.match(/^(\d{4})[\/](0?[1-9]|1[0-2])$/);
  if (slash) {
    return `${slash[1]}-${String(Number(slash[2])).padStart(2, '0')}`;
  }

  const monthYear = raw.match(/^(0?[1-9]|1[0-2])[\/-](\d{4})$/);
  if (monthYear) {
    return `${monthYear[2]}-${String(Number(monthYear[1])).padStart(2, '0')}`;
  }

  return '';
}

function getBillRouteByType(billType) {
  return BILL_TYPE_TO_ROUTE[billType] || '/bills/water';
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
    const byView = allRows.filter((row) => (
      billView === 'all' ? true : config.hasData(row)
    ));
    const query = String(search || '').trim().toLowerCase();
    if (query === '') {
      return byView;
    }

    return byView.filter((row) => (
      tableColumns.some(([key]) => String(row[key] || '').toLowerCase().includes(query))
    ));
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
    const rowToEdit = rowOverride || selectedRowData;
    if (!rowToEdit) {
      showToast('warning', 'Select a row first before editing.');
      return;
    }

    const rowId = Number(rowToEdit.id || 0);
    const billType = resolveBillTypeFromRow(rowToEdit, billView);
    const waterBillId = Number(rowToEdit.water_bill_id || 0);
    const electricityBillId = Number(rowToEdit.electricity_bill_id || 0);
    const internetBillId = Number(rowToEdit.internet_bill_id || 0);
    const associationBillId = Number(rowToEdit.association_bill_id || 0);
    const billIdsByType = {
      water: waterBillId,
      electricity: electricityBillId,
      internet: internetBillId,
      association_dues: associationBillId
    };
    const editingBillId = (
      billType === 'water'
        ? waterBillId
        : billType === 'electricity'
          ? electricityBillId
          : billType === 'internet'
            ? internetBillId
            : associationBillId
    ) || rowId;
    let targetType = billType;
    let targetEditingBillId = editingBillId;

    if (targetEditingBillId <= 0) {
      const fallbackType = ['water', 'electricity', 'internet', 'association_dues']
        .find((type) => billIdsByType[type] > 0);

      if (!fallbackType) {
        showToast('warning', 'No editable bill ID exists for the selected row.');
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
      billing_period: normalizeBillingPeriodValue(rowToEdit.billing_period),
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
      bill_type: billType,
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
      const byView = exportSource.filter((row) => (
        billView === 'all' ? true : config.hasData(row)
      ));
      const query = String(search || '').trim().toLowerCase();
      const recordsData = query === ''
        ? byView
        : byView.filter((row) => (
          tableColumns.some(([key]) => String(row[key] || '').toLowerCase().includes(query))
        ));

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
      title="Records"
      subtitle="Search, review, and export billing records."
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
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search visible fields..."
          />
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
        <p className="muted-text records-helper-text">
          Tip: select one row then click <span className="value-emphasis">Edit</span>, or double-click a row to open it immediately.
        </p>

        {isLoading && <p>Loading records...</p>}
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
                    {tableColumns.map(([, label]) => (
                      <th key={label}>{label}</th>
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
              <span>
                Showing {pageStart}-{pageEnd} of {totalRows}
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
