import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../shared/components/AppLayout.jsx';
import Toast from '../../shared/components/Toast.jsx';
import UploadModal from '../../shared/components/UploadModal.jsx';
import { createBill, fetchPropertyRecords, uploadBill } from '../../shared/lib/api.js';
import { detectBillTypeFromData, normalizeUploadData, validateUploadExtraction } from '../../shared/lib/ocrParser.js';
import { useToast } from '../../shared/hooks/useToast.js';

const REVIEW_STORAGE_KEY = 'finance:bill-review-rows:v2';
const BILLING_PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const BILL_TYPE_RECORD_FIELDS = {
  internet: ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'],
  water: ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'],
  electricity: ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'],
  association_dues: ['association_dues', 'association_due_date', 'association_payment_status']
};

const BILL_TYPE_LABELS = {
  internet: 'WiFi/Internet',
  water: 'Water',
  electricity: 'Electricity',
  association_dues: 'Association'
};

const SHARED_FIELDS = [
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

const INITIAL_BILL_DATA = {
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

function cleanTextValue(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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

function normalizeAmountToken(value) {
  const raw = cleanTextValue(value).replace(/,/g, '');
  if (raw === '') {
    return '';
  }
  const match = raw.match(/-?\d+(?:\.\d{1,4})?/);
  return match ? match[0] : raw;
}

function hasHighConfidenceSecondaryTypeSignal(data, billType) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (billType === 'water') {
    return cleanTextValue(data.water_account_no) !== '';
  }
  if (billType === 'electricity') {
    return cleanTextValue(data.electricity_account_no) !== '';
  }
  if (billType === 'internet') {
    return cleanTextValue(data.internet_account_no) !== '' || cleanTextValue(data.internet_provider) !== '';
  }
  if (billType === 'association_dues') {
    return cleanTextValue(data.association_dues) !== '';
  }
  return false;
}

function deriveReviewBillTypes(normalized, primaryType) {
  const resolvedPrimary = BILL_TYPE_RECORD_FIELDS[primaryType] ? primaryType : 'water';
  const types = [resolvedPrimary];

  // Mixed association invoices can include water consumption line-items.
  if (resolvedPrimary === 'association_dues') {
    const associationAmount = normalizeAmountToken(normalized.association_dues);
    const waterAmount = normalizeAmountToken(normalized.water_amount);
    if (waterAmount !== '' && waterAmount !== associationAmount) {
      types.push('water');
    }
  }

  ['internet', 'water', 'electricity', 'association_dues'].forEach((candidateType) => {
    if (types.includes(candidateType)) {
      return;
    }
    if (hasHighConfidenceSecondaryTypeSignal(normalized, candidateType)) {
      types.push(candidateType);
    }
  });

  return types;
}

function createRowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadReviewRowsFromStorage() {
  try {
    const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildCreatePayload(data, billType) {
  const payload = {
    bill_type: billType
  };
  SHARED_FIELDS.forEach((field) => {
    payload[field] = data[field];
  });
  (BILL_TYPE_RECORD_FIELDS[billType] || []).forEach((field) => {
    payload[field] = data[field];
  });
  return payload;
}

function normalizeRowStatus(data, billType) {
  const validation = validateUploadExtraction(data, billType);
  return {
    status: validation.valid ? 'ready' : 'needs_review',
    validationMessage: validation.message || ''
  };
}

function isRowSelectable(row) {
  return row.status !== 'saved' && row.status !== 'saving';
}

export default function BillReviewPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [rows, setRows] = useState(() => loadReviewRowsFromStorage());
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const rowsRef = useRef(rows);

  const { data: propertyRecords = [], isLoading: loadingPropertyRecords } = useQuery({
    queryKey: ['property-record-list'],
    queryFn: fetchPropertyRecords,
    retry: false
  });

  useEffect(() => {
    rowsRef.current = rows;
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const selectedCount = selectedRowIds.length;

  function getPropertyRecordLabel(record) {
    const propertyValue = cleanTextValue(record.property);
    const ddValue = cleanTextValue(record.dd);
    return propertyValue || ddValue;
  }

  function upsertRows(nextRows) {
    setRows((prev) => [...nextRows, ...prev]);
  }

  function updateRow(rowId, updater) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        return updater(row);
      })
    );
  }

  function removeRow(rowId) {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
    if (editingRowId === rowId) {
      setEditingRowId(null);
    }
  }

  function handleToggleRowSelection(rowId) {
    setSelectedRowIds((prev) => {
      if (prev.includes(rowId)) {
        return prev.filter((id) => id !== rowId);
      }
      return [...prev, rowId];
    });
  }

  function handleSelectAllToggle() {
    const selectableIds = rows.filter(isRowSelectable).map((row) => row.id);
    if (selectableIds.length > 0 && selectableIds.every((id) => selectedRowIds.includes(id))) {
      setSelectedRowIds([]);
      return;
    }
    setSelectedRowIds(selectableIds);
  }

  function handleRowFieldChange(rowId, fieldName, value) {
    updateRow(rowId, (row) => {
      const nextData = {
        ...row.data,
        [fieldName]: value
      };
      const statusInfo = normalizeRowStatus(nextData, row.bill_type);
      return {
        ...row,
        data: nextData,
        status: statusInfo.status,
        scan_error: statusInfo.validationMessage,
        save_error: ''
      };
    });
  }

  function handleRowPropertyChange(rowId, value) {
    const propertyListId = Number(value || 0);
    const matched = propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === propertyListId);
    if (!matched) {
      handleRowFieldChange(rowId, 'property_list_id', 0);
      return;
    }

    updateRow(rowId, (row) => {
      const nextData = {
        ...row.data,
        property_list_id: Number(matched.property_list_id || matched.id || 0),
        dd: matched.dd || '',
        property: matched.property || '',
        billing_period: row.data.billing_period || matched.billing_period || '',
        unit_owner: matched.unit_owner || '',
        classification: matched.classification || '',
        deposit: matched.deposit || '',
        rent: matched.rent || '',
        per_property_status: matched.per_property_status || '',
        real_property_tax: matched.real_property_tax || '',
        rpt_payment_status: matched.rpt_payment_status || '',
        penalty: matched.penalty || ''
      };
      const statusInfo = normalizeRowStatus(nextData, row.bill_type);
      return {
        ...row,
        data: nextData,
        status: statusInfo.status,
        scan_error: statusInfo.validationMessage,
        save_error: ''
      };
    });
  }

  async function saveRowById(rowId) {
    const row = rowsRef.current.find((item) => item.id === rowId);
    if (!row) {
      return false;
    }

    const propertyListId = Number(row.data.property_list_id || 0);
    if (propertyListId <= 0) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'needs_review',
        save_error: 'Select Property / DD before saving.'
      }));
      return false;
    }

    if (!BILLING_PERIOD_REGEX.test(cleanTextValue(row.data.billing_period))) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'needs_review',
        save_error: 'Billing Period is required (YYYY-MM).'
      }));
      return false;
    }

    const validation = validateUploadExtraction(row.data, row.bill_type);
    if (!validation.valid) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'needs_review',
        save_error: validation.message || 'Fill required bill fields before saving.'
      }));
      return false;
    }

    updateRow(rowId, (current) => ({
      ...current,
      status: 'saving',
      save_error: ''
    }));

    try {
      const result = await createBill(buildCreatePayload(row.data, row.bill_type));
      updateRow(rowId, (current) => ({
        ...current,
        status: 'saved',
        save_error: '',
        scan_error: ''
      }));
      showToast('success', result.message || `Saved ${row.source_file_name || 'row'}.`);
      setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
      if (editingRowId === rowId) {
        setEditingRowId(null);
      }
      return true;
    } catch (error) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'save_failed',
        save_error: String(error?.message || 'Failed to save row.')
      }));
      return false;
    }
  }

  async function handleSaveSelected() {
    const targetIds = selectedRowIds.filter((id) => isRowSelectable(rowsRef.current.find((row) => row.id === id) || {}));
    if (targetIds.length === 0) {
      showToast('warning', 'Select at least one pending row.');
      return;
    }

    let successCount = 0;
    for (const rowId of targetIds) {
      // Keep requests predictable for the API endpoint and avoid flooding.
      const ok = await saveRowById(rowId);
      if (ok) {
        successCount += 1;
      }
    }

    if (successCount === targetIds.length) {
      showToast('success', `Saved ${successCount} selected row(s).`);
      return;
    }
    showToast('warning', `Saved ${successCount}/${targetIds.length} selected row(s). Check failed rows.`);
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const scannedRows = [];
      for (const file of files) {
        try {
          // Do not force module type; let parser classify mixed bills.
          const result = await uploadBill(file, {
            bill_type: '',
            property_list_id: 0,
            dd: '',
            property: '',
            billing_period: ''
          });
          const normalized = normalizeUploadData(result) || {};
          const primaryType = normalizeBillTypeValue(
            normalized.bill_type || detectBillTypeFromData(normalized) || 'water'
          );
          const rowTypes = deriveReviewBillTypes(normalized, primaryType);

          rowTypes.forEach((rowType) => {
            const rowData = {
              ...INITIAL_BILL_DATA,
              ...normalized,
              bill_type: rowType,
              property_list_id: Number(normalized.property_list_id || 0)
            };
            const statusInfo = normalizeRowStatus(rowData, rowType);

            scannedRows.push({
              id: createRowId(),
              source_file_name: file.name || 'Uploaded file',
              bill_type: rowType,
              status: statusInfo.status,
              scan_error: statusInfo.validationMessage,
              save_error: '',
              data: rowData
            });
          });
        } catch (error) {
          scannedRows.push({
            id: createRowId(),
            source_file_name: file.name || 'Uploaded file',
            bill_type: 'water',
            status: 'scan_failed',
            scan_error: String(error?.message || 'Upload failed.'),
            save_error: '',
            data: { ...INITIAL_BILL_DATA, bill_type: 'water' }
          });
        }
      }

      upsertRows(scannedRows);
      setIsUploadModalOpen(false);
      const successCount = scannedRows.filter((row) => row.status === 'ready').length;
      const needsReviewCount = scannedRows.filter((row) => row.status === 'needs_review').length;
      const failedCount = scannedRows.filter((row) => row.status === 'scan_failed').length;
      showToast(
        failedCount > 0 || needsReviewCount > 0 ? 'warning' : 'success',
        `Scan completed: ${successCount} ready, ${needsReviewCount} need review, ${failedCount} failed.`
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  return (
    <AppLayout
      title="Bill Review"
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />

      <section className="card bill-form-card property-records-card bill-review-card">
        <div className="card-title-row">
          <div className="card-title-left">
            <h3 className="card-title">Bills Review Queue</h3>
          </div>
          <div className="card-title-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(true)} disabled={uploading}>
              Upload Bills
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSaveSelected} disabled={selectedCount === 0}>
              Save Selected ({selectedCount})
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRows([]);
                setSelectedRowIds([]);
                setEditingRowId(null);
              }}
              disabled={rows.length === 0}
            >
              Clear Queue
            </button>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="empty-state">
            <p>No scanned bills yet. Upload files to start review.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="property-records-content">
            <div className="table-wrap property-records-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={rows.filter(isRowSelectable).length > 0 && rows.filter(isRowSelectable).every((row) => selectedRowIds.includes(row.id))}
                        onChange={handleSelectAllToggle}
                      />
                    </th>
                    <th>Type</th>
                    <th>Property / DD</th>
                    <th>Billing Period</th>
                    <th>Fields</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = editingRowId === row.id;
                    const propertyId = Number(row.data.property_list_id || 0);
                    const rowFields = BILL_TYPE_RECORD_FIELDS[row.bill_type] || [];
                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.includes(row.id)}
                            onChange={() => handleToggleRowSelection(row.id)}
                            disabled={!isRowSelectable(row)}
                          />
                        </td>
                        <td>{BILL_TYPE_LABELS[row.bill_type] || row.bill_type}</td>
                        <td>
                          {isEditing ? (
                            <select
                              value={propertyId}
                              onChange={(event) => handleRowPropertyChange(row.id, event.target.value)}
                              disabled={loadingPropertyRecords || row.status === 'saving'}
                            >
                              <option value={0}>Select property</option>
                              {propertyRecords.map((record) => {
                                const recordId = Number(record.property_list_id || record.id || 0);
                                return (
                                  <option key={`review-prop-${recordId}`} value={recordId}>
                                    {getPropertyRecordLabel(record)}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            row.data.property || row.data.dd || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="month"
                              value={row.data.billing_period || ''}
                              onChange={(event) => handleRowFieldChange(row.id, 'billing_period', event.target.value)}
                              disabled={row.status === 'saving'}
                            />
                          ) : (
                            row.data.billing_period || '-'
                          )}
                        </td>
                        <td className="review-fields-cell">
                          {rowFields.map((field) => (
                            <label key={`${row.id}-${field}`} className="review-field-item">
                              <span>{field}</span>
                              {isEditing ? (
                                <input
                                  value={row.data[field] || ''}
                                  onChange={(event) => handleRowFieldChange(row.id, field, event.target.value)}
                                  disabled={row.status === 'saving'}
                                />
                              ) : (
                                <strong>{row.data[field] || '-'}</strong>
                              )}
                            </label>
                          ))}
                        </td>
                        <td>
                          <span className={`review-status review-status-${row.status}`}>{row.status}</span>
                          {row.scan_error && <p className="error review-error">{row.scan_error}</p>}
                          {row.save_error && <p className="error review-error">{row.save_error}</p>}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {!isEditing && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditingRowId(row.id)}
                                disabled={row.status === 'saving'}
                              >
                                Edit
                              </button>
                            )}
                            {isEditing && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditingRowId(null)}
                                disabled={row.status === 'saving'}
                              >
                                Done
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => saveRowById(row.id)}
                              disabled={row.status === 'saving' || row.status === 'saved'}
                            >
                              {row.status === 'saving' ? 'Saving...' : 'Save Row'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => removeRow(row.id)}
                              disabled={row.status === 'saving'}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <UploadModal
        open={isUploadModalOpen}
        uploading={uploading}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </AppLayout>
  );
}
