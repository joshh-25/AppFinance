// Finance App File: frontend/src/features/records/ExpensesRecordsPage.jsx
// Purpose: Expenses records table page with search/edit/delete/export actions.

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../shared/components/AppLayout.jsx';
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx';
import { SkeletonLine } from '../../shared/components/Skeleton.jsx';
import Toast from '../../shared/components/Toast.jsx';
import { useToast } from '../../shared/hooks/useToast.js';
import { deleteExpense, fetchExpenses } from '../../shared/lib/api.js';

const ROWS_PER_PAGE = 10;
const EXPENSE_EDIT_CONTEXT_KEY = 'finance:expense-edit-context';

const TABLE_COLUMNS = [
  ['id', 'Serial #'],
  ['expense_date', 'Date'],
  ['payee', 'Payee'],
  ['category', 'Category'],
  ['amount', 'Amount'],
  ['payment', 'Payment'],
  ['non_vat', 'Non-VAT'],
  ['remarks', 'Remarks']
];

function formatCsvCell(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatAmount(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
}

function formatCellValue(key, value) {
  if (key === 'amount') {
    return formatAmount(value);
  }
  if (key === 'non_vat') {
    return Number(value || 0) > 0 ? 'Yes' : 'No';
  }
  return String(value || '');
}

export default function ExpensesRecordsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showToast, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [targetDeleteRow, setTargetDeleteRow] = useState(null);

  const {
    data: queryResult = { data: [], meta: null },
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['expenses-list', page, search],
    queryFn: () => fetchExpenses({ page, perPage: ROWS_PER_PAGE, search, includeMeta: true })
  });

  const rows = Array.isArray(queryResult?.data) ? queryResult.data : [];
  const meta = queryResult?.meta || null;
  const totalRows = Number(meta?.total || rows.length);
  const totalPages = Math.max(1, Number(meta?.total_pages || 1));
  const pageStart = totalRows === 0 ? 0 : (Number(meta?.page || page) - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = totalRows === 0 ? 0 : Math.min(totalRows, pageStart + rows.length - 1);

  useEffect(() => {
    const safePage = Math.max(1, Math.min(page, totalPages));
    if (safePage !== page) {
      setPage(safePage);
    }
  }, [page, totalPages]);

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleEdit(row) {
    window.sessionStorage.setItem(EXPENSE_EDIT_CONTEXT_KEY, JSON.stringify(row));
    navigate('/expenses');
  }

  async function confirmDelete() {
    const id = Number(targetDeleteRow?.id || 0);
    if (id <= 0) {
      setTargetDeleteRow(null);
      return;
    }

    setDeleting(true);
    try {
      await deleteExpense(id);
      showToast('success', 'Expense deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setTargetDeleteRow(null);
    } catch (deleteError) {
      showToast('error', String(deleteError?.message || 'Failed to delete expense.'));
    } finally {
      setDeleting(false);
    }
  }

  async function exportCsv() {
    if (exporting) {
      return;
    }

    setExporting(true);
    try {
      const exportRows = await fetchExpenses({ search });
      if (!Array.isArray(exportRows) || exportRows.length === 0) {
        showToast('warning', 'No expense records found to export.');
        return;
      }

      const header = TABLE_COLUMNS.map(([, label]) => formatCsvCell(label)).join(',');
      const lines = [header];
      exportRows.forEach((row) => {
        lines.push(TABLE_COLUMNS.map(([key]) => formatCsvCell(formatCellValue(key, row[key]))).join(','));
      });

      const csv = lines.join('\n');
      const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `expenses_records_${dateStamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('success', `Exported ${exportRows.length} expense records.`);
    } catch (exportError) {
      showToast('error', String(exportError?.message || 'Failed to export records.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout
      title="Expenses Records"
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />
      <ConfirmDialog
        open={targetDeleteRow !== null}
        title="Delete Expense"
        message="Delete this expense record permanently? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        onCancel={() => setTargetDeleteRow(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
      <section className="card records-card">
        <div className="filters">
          <input value={search} onChange={handleSearchChange} placeholder="Search expense records..." />
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/expenses')}>
            Add Expense
          </button>
          <button type="button" className="btn active" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>

        {isLoading && (
          <div className="records-loading-shell" role="status" aria-live="polite" aria-label="Loading expense records">
            <div className="records-loading-table">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonLine key={`expenses-records-loading-${index}`} width="100%" height={15} radius={8} />
              ))}
            </div>
          </div>
        )}
        {isError && <p className="error">{error?.message || 'Failed to load expense records.'}</p>}

        {!isLoading && !isError && totalRows === 0 && (
          <div className="empty-state">
            <p>No expense records found.</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/expenses')}>
              Create Expense
            </button>
          </div>
        )}

        {!isLoading && !isError && totalRows > 0 && (
          <div className="records-content">
            <div className="table-wrap records-table-wrap">
              <table>
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(([, label]) => (
                      <th key={label}>{label}</th>
                    ))}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {TABLE_COLUMNS.map(([key]) => (
                        <td key={`${row.id}-${key}`}>{formatCellValue(key, row[key]) || '-'}</td>
                      ))}
                      <td>
                        <div className="action-buttons">
                          <button type="button" className="btn btn-secondary" onClick={() => handleEdit(row)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => setTargetDeleteRow(row)}>
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
              <div className="records-pagination-meta">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/records')}>
                  Back
                </button>
                <span>
                  Showing {pageStart}-{pageEnd} of {totalRows}
                </span>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                  Previous
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
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
