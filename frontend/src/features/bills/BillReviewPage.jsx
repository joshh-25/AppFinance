import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../shared/components/AppLayout.jsx';
import StatusBanner from '../../shared/components/StatusBanner.jsx';
import Toast from '../../shared/components/Toast.jsx';
import UploadModal from '../../shared/components/UploadModal.jsx';
import {
  createBill,
  fetchOcrHealth,
  fetchPropertyRecords,
  fetchReviewQueueRows,
  lookupPropertyByAccountNumber,
  replaceReviewQueueRows,
  uploadBill
} from '../../shared/lib/api.js';
import { cleanTextValue, getPropertyRecordLabel } from '../../shared/lib/billPropertyUtils.js';
import { detectBillTypeFromData, normalizeUploadData } from '../../shared/lib/ocrParser.js';
import { normalizeReviewQueueRows, summarizeReviewQueueRows } from '../../shared/lib/reviewQueue.js';
import useMediaQuery from '../../shared/hooks/useMediaQuery.js';
import { useToast } from '../../shared/hooks/useToast.js';
import {
  ACCOUNT_FIELD_BY_TYPE,
  BILL_TYPE_LABELS,
  BILL_TYPE_RECORD_FIELDS,
  DUE_PERIOD_REGEX,
  INITIAL_BILL_DATA,
  REVIEW_QUEUE_RETRY_DELAY_MS,
  REVIEW_QUEUE_SYNC_DELAY_MS,
  WATER_STATUS_OPTIONS,
  buildCreatePayload,
  buildFailedUploadRow,
  createRowId,
  deriveReviewBillTypes,
  getCompactReviewMessage,
  getFriendlyReviewSaveError,
  getReviewStatusLabel,
  isRowSelectable,
  normalizeBillTypeValue,
  normalizeRowStatus
} from './lib/reviewPageHelpers.js';

export default function BillReviewPage() {
  const { toasts, showToast, removeToast } = useToast();
  const isPhoneLayout = useMediaQuery('(max-width: 760px)');
  const [rows, setRows] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingPropertySearch, setEditingPropertySearch] = useState('');
  const [isEditingPropertyDropdownOpen, setIsEditingPropertyDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [ocrUploadHealthy, setOcrUploadHealthy] = useState(true);
  const [ocrUploadHealthMessage, setOcrUploadHealthMessage] = useState('');
  const [queueSyncError, setQueueSyncError] = useState('');
  const [isQueueSyncing, setIsQueueSyncing] = useState(false);
  const rowsRef = useRef(rows);
  const uploadFileCacheRef = useRef(new Map());
  const queueSyncReadyRef = useRef(false);
  const skipNextQueueSyncRef = useRef(false);
  const queueSyncTimerRef = useRef(0);
  const queueRetryTimerRef = useRef(0);
  const queueSyncInFlightRef = useRef(false);
  const queueResyncRequestedRef = useRef(false);
  const lastSyncedRowsRef = useRef('[]');
  const flushReviewQueueSyncRef = useRef(null);

  const { data: propertyRecords = [], isLoading: loadingPropertyRecords } = useQuery({
    queryKey: ['property-record-list'],
    queryFn: fetchPropertyRecords,
    retry: false
  });

  const {
    data: persistedReviewRows = [],
    isLoading: loadingReviewQueue,
    isError: reviewQueueLoadFailed,
    error: reviewQueueLoadError
  } = useQuery({
    queryKey: ['bill-review-queue'],
    queryFn: fetchReviewQueueRows,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  useEffect(() => {
    rowsRef.current = rows;
    if (!queueSyncReadyRef.current) {
      return;
    }
    if (skipNextQueueSyncRef.current) {
      skipNextQueueSyncRef.current = false;
      return;
    }

    if (queueRetryTimerRef.current) {
      window.clearTimeout(queueRetryTimerRef.current);
      queueRetryTimerRef.current = 0;
    }

    if (queueSyncInFlightRef.current) {
      queueResyncRequestedRef.current = true;
      return;
    }

    if (queueSyncTimerRef.current) {
      window.clearTimeout(queueSyncTimerRef.current);
    }

    queueSyncTimerRef.current = window.setTimeout(() => {
      queueSyncTimerRef.current = 0;
      void flushReviewQueueSyncRef.current?.();
    }, REVIEW_QUEUE_SYNC_DELAY_MS);
  }, [rows]);

  useEffect(() => {
    if (loadingReviewQueue || queueSyncReadyRef.current) {
      return;
    }

    queueSyncReadyRef.current = true;

    if (reviewQueueLoadFailed) {
      lastSyncedRowsRef.current = JSON.stringify(normalizeReviewQueueRows(rowsRef.current));
      setQueueSyncError(
        String(reviewQueueLoadError?.message || 'Saved Bills Review queue could not be loaded. New changes will retry automatically.')
      );
      return;
    }

    const hydratedRows = normalizeReviewQueueRows(persistedReviewRows);
    skipNextQueueSyncRef.current = true;
    lastSyncedRowsRef.current = JSON.stringify(hydratedRows);
    setQueueSyncError('');
    setRows(hydratedRows);
    setSelectedRowIds((prev) => prev.filter((id) => hydratedRows.some((row) => row.id === id)));
    setEditingRowId((prev) => (prev && hydratedRows.some((row) => row.id === prev) ? prev : null));
  }, [loadingReviewQueue, persistedReviewRows, reviewQueueLoadError, reviewQueueLoadFailed]);

  useEffect(() => {
    return () => {
      if (queueSyncTimerRef.current) {
        window.clearTimeout(queueSyncTimerRef.current);
      }
      if (queueRetryTimerRef.current) {
        window.clearTimeout(queueRetryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editingRowId) {
      setEditingPropertySearch('');
      setIsEditingPropertyDropdownOpen(false);
      return;
    }

    const editingRow = rowsRef.current.find((row) => row.id === editingRowId);
    if (!editingRow) {
      return;
    }

    const propertyListId = Number(editingRow.data?.property_list_id || 0);
    const matched = propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === propertyListId);
    const label = matched
      ? getPropertyRecordLabel(matched)
      : editingRow.data?.property || editingRow.data?.dd || '';
    setEditingPropertySearch(label);
  }, [editingRowId, propertyRecords]);

  useEffect(() => {
    if (!Array.isArray(propertyRecords) || propertyRecords.length === 0) {
      return;
    }

    setRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const propertyListId = Number(row?.data?.property_list_id || 0);
        if (propertyListId <= 0) {
          return row;
        }

        const canonicalRecord = propertyRecords.find(
          (record) => Number(record.property_list_id || record.id || 0) === propertyListId
        );
        if (!canonicalRecord) {
          return row;
        }

        const canonicalProperty = cleanTextValue(canonicalRecord.property || '');
        const canonicalDd = cleanTextValue(canonicalRecord.dd || '');
        const nextProperty = canonicalProperty || row.data.property || '';
        const nextDd = canonicalDd || row.data.dd || '';

        if (nextProperty === row.data.property && nextDd === row.data.dd) {
          return row;
        }

        changed = true;
        return {
          ...row,
          data: {
            ...row.data,
            property: nextProperty,
            dd: nextDd
          }
        };
      });

      return changed ? next : prev;
    });
  }, [propertyRecords]);

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

  const selectedCount = selectedRowIds.length;
  const queueStats = summarizeReviewQueueRows(rows);
  const selectedRows = rows.filter((row) => selectedRowIds.includes(row.id));
  const selectedSavableRows = selectedRows.filter(
    (row) => row.status === 'ready' || row.status === 'needs_review' || row.status === 'save_failed'
  );
  const selectedFailedScanRows = selectedRows.filter((row) => row.status === 'scan_failed');
  const ocrHealthNotice = !ocrUploadHealthy
    ? {
        tone: 'warning',
        title: 'OCR Upload Unavailable',
        message: ocrUploadHealthMessage || 'OCR service is unavailable right now.'
      }
    : null;

  function scheduleReviewQueueSync(nextRows, delayMs = REVIEW_QUEUE_SYNC_DELAY_MS) {
    if (!queueSyncReadyRef.current) {
      return;
    }

    if (queueRetryTimerRef.current) {
      window.clearTimeout(queueRetryTimerRef.current);
      queueRetryTimerRef.current = 0;
    }

    if (queueSyncInFlightRef.current) {
      queueResyncRequestedRef.current = true;
      return;
    }

    if (queueSyncTimerRef.current) {
      window.clearTimeout(queueSyncTimerRef.current);
    }

    queueSyncTimerRef.current = window.setTimeout(() => {
      queueSyncTimerRef.current = 0;
      void flushReviewQueueSyncRef.current?.();
    }, delayMs);

    rowsRef.current = nextRows;
  }

  async function flushReviewQueueSync(force = false) {
    if (!queueSyncReadyRef.current) {
      return;
    }

    const normalizedRows = normalizeReviewQueueRows(rowsRef.current);
    const serializedRows = JSON.stringify(normalizedRows);
    if (!force && serializedRows === lastSyncedRowsRef.current) {
      setIsQueueSyncing(false);
      return;
    }

    if (queueSyncInFlightRef.current) {
      queueResyncRequestedRef.current = true;
      return;
    }

    queueSyncInFlightRef.current = true;
    setIsQueueSyncing(true);
    let syncSucceeded = false;
    let shouldReschedule = false;

    try {
      await replaceReviewQueueRows(normalizedRows);
      lastSyncedRowsRef.current = serializedRows;
      setQueueSyncError('');
      syncSucceeded = true;
    } catch (error) {
      setQueueSyncError(String(error?.message || 'Failed to save Bills Review queue changes.'));
      queueRetryTimerRef.current = window.setTimeout(() => {
        queueRetryTimerRef.current = 0;
        void flushReviewQueueSync(true);
      }, REVIEW_QUEUE_RETRY_DELAY_MS);
    } finally {
      queueSyncInFlightRef.current = false;

      if (syncSucceeded) {
        const latestSerializedRows = JSON.stringify(normalizeReviewQueueRows(rowsRef.current));
        shouldReschedule = queueResyncRequestedRef.current || latestSerializedRows !== lastSyncedRowsRef.current;
      }

      queueResyncRequestedRef.current = false;
      if (!shouldReschedule) {
        setIsQueueSyncing(false);
      }
    }

    if (shouldReschedule) {
      scheduleReviewQueueSync(rowsRef.current);
    }
  }

  flushReviewQueueSyncRef.current = flushReviewQueueSync;

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
    uploadFileCacheRef.current.delete(rowId);
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
    if (editingRowId === rowId) {
      setEditingRowId(null);
    }
  }

  async function scanFileToRows(file, retryCount = 0) {
    try {
      const result = await uploadBill(file, {
        bill_type: '',
        property_list_id: 0,
        dd: '',
        property: '',
        due_period: ''
      });
      const normalized = normalizeUploadData(result) || {};
      const primaryType = normalizeBillTypeValue(
        normalized.bill_type || detectBillTypeFromData(normalized) || 'water'
      );
      const rowTypes = deriveReviewBillTypes(normalized, primaryType);

      const scannedRows = [];
      for (const rowType of rowTypes) {
        const baseRowData = {
          ...INITIAL_BILL_DATA,
          ...normalized,
          bill_type: rowType,
          property_list_id: Number(normalized.property_list_id || 0)
        };
        const rowData = await enrichRowDataWithAccountLookup(baseRowData, rowType);
        const statusInfo = normalizeRowStatus(rowData, rowType);
        const rowId = createRowId();
        uploadFileCacheRef.current.set(rowId, file);
        scannedRows.push({
          id: rowId,
          source_file_name: file.name || 'Uploaded file',
          bill_type: rowType,
          status: statusInfo.status,
          scan_error: statusInfo.validationMessage,
          save_error: '',
          data: rowData,
          diagnostics: {
            code: 'scanned',
            title: statusInfo.status === 'needs_review' ? 'Manual review required' : 'Ready to save',
            message:
              statusInfo.status === 'needs_review'
                ? statusInfo.validationMessage || 'Complete the missing OCR fields before saving.'
                : 'OCR extracted enough bill data to save this row.',
            details: '',
            request_id: '',
            status_code: 0,
            retry_count: retryCount
          }
        });
      }
      return scannedRows;
    } catch (error) {
      const failedRow = buildFailedUploadRow(file, error, retryCount);
      uploadFileCacheRef.current.set(failedRow.id, file);
      return [failedRow];
    }
  }

  async function retryRowScan(rowId) {
    const file = uploadFileCacheRef.current.get(rowId);
    if (!file) {
      updateRow(rowId, (current) => ({
        ...current,
        save_error: 'Original file is no longer available in this session. Upload it again to retry.',
        scan_error: current.scan_error || 'Retry unavailable.'
      }));
      return;
    }

    updateRow(rowId, (current) => ({
      ...current,
      status: 'saving',
      save_error: '',
      scan_error: 'Retrying OCR scan...'
    }));
    setReviewFeedback({
      tone: 'info',
      title: 'Retrying Scan',
      message: 'Please wait while the bill scan runs again.'
    });

    const retryCount = Number(rowsRef.current.find((row) => row.id === rowId)?.diagnostics?.retry_count || 0) + 1;
    const nextRows = await scanFileToRows(file, retryCount);
    setRows((prev) => [...nextRows, ...prev.filter((row) => row.id !== rowId)]);
    uploadFileCacheRef.current.delete(rowId);
    const nextFailed = nextRows.every((row) => row.status === 'scan_failed');
    setReviewFeedback({
      tone: nextFailed ? 'warning' : 'success',
      title: nextFailed ? 'Retry Needs Attention' : 'Retry Complete',
      message: nextFailed ? `The scan still failed for ${file.name}.` : `The scan finished again for ${file.name}.`
    });
    showToast(nextFailed ? 'warning' : 'success', nextFailed ? `Retry failed for ${file.name}.` : `Retry completed for ${file.name}.`);
  }

  function requeueFailedRow(rowId) {
    updateRow(rowId, (current) => ({
      ...current,
      status: 'needs_review',
      scan_error: 'OCR failed. Complete property, due period, and bill fields manually before saving.',
      save_error: '',
      diagnostics: {
        ...current.diagnostics,
        title: 'Manual review queue',
        message: 'This file was requeued after OCR failure. Use Edit to supply the missing values.',
        code: 'manual_requeue'
      }
    }));
    setEditingRowId(rowId);
  }

  async function handleRetrySelected() {
    if (selectedFailedScanRows.length === 0) {
      showToast('warning', 'Select at least one failed scan row to retry.');
      return;
    }

    for (const row of selectedFailedScanRows) {
      // Keep retries sequential so row replacement stays predictable.
      await retryRowScan(row.id);
    }
  }

  function handleRequeueSelected() {
    if (selectedFailedScanRows.length === 0) {
      showToast('warning', 'Select at least one failed scan row to requeue.');
      return;
    }

    selectedFailedScanRows.forEach((row) => {
      requeueFailedRow(row.id);
    });
    setReviewFeedback({
      tone: 'success',
      title: 'Moved To Review',
      message: `${selectedFailedScanRows.length} row(s) were moved back into manual review.`
    });
    showToast('success', `Requeued ${selectedFailedScanRows.length} row(s) for manual review.`);
  }

  function handleClearSelected() {
    if (selectedRows.length === 0) {
      showToast('warning', 'Select at least one row to clear.');
      return;
    }

    const selectedIds = new Set(selectedRows.map((row) => row.id));
    selectedRows.forEach((row) => uploadFileCacheRef.current.delete(row.id));
    setRows((prev) => prev.filter((row) => !selectedIds.has(row.id)));
    setSelectedRowIds([]);
    if (editingRowId && selectedIds.has(editingRowId)) {
      setEditingRowId(null);
    }
    setReviewFeedback({
      tone: 'success',
      title: 'Rows Removed',
      message: `${selectedRows.length} selected row(s) were removed from the review queue.`
    });
    showToast('success', `Cleared ${selectedRows.length} selected row(s).`);
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
        due_period: row.data.due_period || matched.due_period || '',
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

    if (editingRowId === rowId) {
      setEditingPropertySearch(getPropertyRecordLabel(matched));
      setIsEditingPropertyDropdownOpen(false);
    }
  }

  function handleRowBillTypeChange(rowId, value) {
    const nextBillType = normalizeBillTypeValue(value);
    updateRow(rowId, (row) => {
      const nextData = {
        ...row.data,
        bill_type: nextBillType
      };
      const statusInfo = normalizeRowStatus(nextData, nextBillType);
      return {
        ...row,
        bill_type: nextBillType,
        data: nextData,
        status: statusInfo.status,
        scan_error: statusInfo.validationMessage,
        save_error: ''
      };
    });
  }

  function handleEditingPropertySearchChange(value) {
    setEditingPropertySearch(value);
    setIsEditingPropertyDropdownOpen(true);

    if (!editingRowId) {
      return;
    }

    const normalizedSearch = value.trim().toLowerCase();
    if (normalizedSearch === '') {
      return;
    }

    const matchedRecord = propertyRecords.find(
      (record) => getPropertyRecordLabel(record).trim().toLowerCase() === normalizedSearch
    );
    if (matchedRecord) {
      const recordId = Number(matchedRecord.property_list_id || matchedRecord.id || 0);
      if (recordId > 0) {
        handleRowPropertyChange(editingRowId, recordId);
      }
    }
  }

  function handleEditingPropertyOptionSelect(record) {
    if (!editingRowId) {
      return;
    }

    const recordId = Number(record.property_list_id || record.id || 0);
    if (recordId <= 0) {
      return;
    }
    handleRowPropertyChange(editingRowId, recordId);
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
        save_error: 'Choose the property before saving this row.'
      }));
      return false;
    }

    if (!DUE_PERIOD_REGEX.test(cleanTextValue(row.data.due_period))) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'needs_review',
        save_error: 'Choose the due period before saving this row.'
      }));
      return false;
    }

    const validationMessage = getFriendlyReviewSaveError(row);
    if (validationMessage !== '') {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'needs_review',
        save_error: validationMessage
      }));
      return false;
    }

    updateRow(rowId, (current) => ({
      ...current,
      status: 'saving',
      save_error: ''
    }));
    setReviewFeedback({
      tone: 'info',
      title: 'Saving Row',
      message: `Please wait while ${row.source_file_name || 'this row'} is being saved.`
    });

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
      setReviewFeedback({
        tone: 'success',
        title: 'Row Saved',
        message: result.message || `${row.source_file_name || 'This row'} was saved successfully.`
      });
      return true;
    } catch (error) {
      updateRow(rowId, (current) => ({
        ...current,
        status: 'save_failed',
        save_error: String(error?.message || 'Failed to save row.')
      }));
      setReviewFeedback({
        tone: 'error',
        title: 'Row Save Failed',
        message: String(error?.message || 'Failed to save row.')
      });
      return false;
    }
  }

  async function handleSaveSelected() {
    const targetIds = selectedSavableRows.map((row) => row.id);
    if (targetIds.length === 0) {
      setReviewFeedback({
        tone: 'warning',
        title: 'Nothing Ready To Save',
        message: 'Select at least one row that is ready to save.'
      });
      showToast('warning', 'Select at least one row that is ready to save.');
      return;
    }

    setReviewFeedback({
      tone: 'info',
      title: 'Saving Selected Rows',
      message: `Please wait while ${targetIds.length} selected row(s) are saved.`
    });
    let successCount = 0;
    for (const rowId of targetIds) {
      // Keep requests predictable for the API endpoint and avoid flooding.
      const ok = await saveRowById(rowId);
      if (ok) {
        successCount += 1;
      }
    }

    if (successCount === targetIds.length) {
      setReviewFeedback({
        tone: 'success',
        title: 'Selected Rows Saved',
        message: `All ${successCount} selected row(s) were saved successfully.`
      });
      showToast('success', `Saved ${successCount} selected row(s).`);
      return;
    }
    setReviewFeedback({
      tone: 'warning',
      title: 'Some Rows Need Attention',
      message: `Saved ${successCount} of ${targetIds.length} selected row(s). Check the failed rows before trying again.`
    });
    showToast('warning', `Saved ${successCount}/${targetIds.length} selected row(s). Check failed rows.`);
  }

  async function enrichRowDataWithAccountLookup(rowData, billType) {
    if (!rowData || typeof rowData !== 'object') {
      return rowData;
    }
    if (Number(rowData.property_list_id || 0) > 0) {
      const existingPropertyListId = Number(rowData.property_list_id || 0);
      const canonicalRecord = propertyRecords.find(
        (record) => Number(record.property_list_id || record.id || 0) === existingPropertyListId
      );
      if (!canonicalRecord) {
        return rowData;
      }

      return {
        ...rowData,
        dd: cleanTextValue(canonicalRecord.dd || '') || rowData.dd || '',
        property: cleanTextValue(canonicalRecord.property || '') || rowData.property || '',
        unit_owner: canonicalRecord.unit_owner || rowData.unit_owner || '',
        classification: canonicalRecord.classification || rowData.classification || '',
        deposit: canonicalRecord.deposit || rowData.deposit || '',
        rent: canonicalRecord.rent || rowData.rent || '',
        per_property_status: canonicalRecord.per_property_status || rowData.per_property_status || '',
        real_property_tax: canonicalRecord.real_property_tax || rowData.real_property_tax || '',
        rpt_payment_status: canonicalRecord.rpt_payment_status || rowData.rpt_payment_status || '',
        penalty: canonicalRecord.penalty || rowData.penalty || ''
      };
    }

    const accountField = ACCOUNT_FIELD_BY_TYPE[billType];
    if (!accountField) {
      return rowData;
    }
    const accountNumber = cleanTextValue(rowData[accountField] || '');
    if (accountNumber === '') {
      return rowData;
    }

    const duePeriod = cleanTextValue(rowData.due_period || '');
    const lookupAttempts = [
      { utilityType: billType, duePeriod },
      { utilityType: '', duePeriod },
      { utilityType: billType, duePeriod: '' },
      { utilityType: '', duePeriod: '' }
    ];

    for (const attempt of lookupAttempts) {
      let lookup = null;
      try {
        lookup = await lookupPropertyByAccountNumber({
          accountNumber,
          utilityType: attempt.utilityType,
          duePeriod: attempt.duePeriod
        });
      } catch {
        continue;
      }

      const matched = lookup?.data || {};
      const matchStatus = cleanTextValue(matched.match_status || 'matched').toLowerCase();
      let resolved = matched;

      if (matchStatus === 'needs_review') {
        const candidates = Array.isArray(matched.candidates) ? matched.candidates : [];
        if (candidates.length === 1) {
          resolved = { ...matched, ...candidates[0], match_status: 'matched' };
        } else {
          return {
            ...rowData,
            account_lookup_message:
              cleanTextValue(matched.message) || 'Multiple properties share this account number. Choose the correct Property / DD.',
            account_lookup_candidates: candidates
              .map((candidate) => ({
                property_list_id: Number(candidate.property_list_id || 0),
                property: cleanTextValue(candidate.property || candidate.property_name || ''),
                dd: cleanTextValue(candidate.dd || '')
              }))
              .filter((candidate) => candidate.property_list_id > 0)
          };
        }
      } else if (matchStatus !== 'matched') {
        continue;
      }

      const resolvedPropertyListId = Number(resolved.property_list_id || 0);
      const resolvedProperty = cleanTextValue(resolved.property || resolved.property_name || '');
      const resolvedDd = cleanTextValue(resolved.dd || '');
      if (resolvedPropertyListId <= 0 && resolvedProperty === '' && resolvedDd === '') {
        continue;
      }

      const canonicalRecord = resolvedPropertyListId > 0
        ? propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === resolvedPropertyListId)
        : null;
      const canonicalProperty = cleanTextValue(canonicalRecord?.property || '');
      const canonicalDd = cleanTextValue(canonicalRecord?.dd || '');

      return {
        ...rowData,
        property_list_id: resolvedPropertyListId > 0 ? resolvedPropertyListId : Number(rowData.property_list_id || 0),
        dd: canonicalDd || resolvedDd || rowData.dd || '',
        property: canonicalProperty || resolvedProperty || rowData.property || '',
        due_period: rowData.due_period || resolved.due_period || '',
        unit_owner: resolved.unit_owner || rowData.unit_owner || '',
        classification: resolved.classification || rowData.classification || '',
        deposit: resolved.deposit || rowData.deposit || '',
        rent: resolved.rent || rowData.rent || '',
        per_property_status: resolved.per_property_status || rowData.per_property_status || '',
        real_property_tax: resolved.real_property_tax || rowData.real_property_tax || '',
        rpt_payment_status: resolved.rpt_payment_status || rowData.rpt_payment_status || '',
        penalty: resolved.penalty || rowData.penalty || ''
      };
    }

    return rowData;
  }

  async function handleUpload(event) {
    if (loadingReviewQueue) {
      setReviewFeedback({
        tone: 'warning',
        title: 'Queue Still Loading',
        message: 'Please wait for the saved Bills Review queue to finish loading first.'
      });
      event.target.value = '';
      return;
    }

    if (!ocrUploadHealthy) {
      setReviewFeedback({
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

    setUploading(true);
    setReviewFeedback({
      tone: 'info',
      title: 'Uploading Bills',
      message: `Please wait while ${files.length} file(s) are scanned and added to the review queue.`
    });

    try {
      const scannedRows = [];
      for (const file of files) {
        const nextRows = await scanFileToRows(file, 0);
        scannedRows.push(...nextRows);
      }

      if (scannedRows.length > 0) {
        upsertRows(scannedRows);
      }
      setIsUploadModalOpen(false);
      const successCount = scannedRows.filter((row) => row.status === 'ready').length;
      const needsReviewCount = scannedRows.filter((row) => row.status === 'needs_review').length;
      const failedCount = scannedRows.filter((row) => row.status === 'scan_failed').length;
      if (failedCount > 0) {
        const firstFailure = scannedRows.find((row) => row.status === 'scan_failed');
        showToast('error', `${firstFailure?.source_file_name || 'Upload'}: ${firstFailure?.diagnostics?.message || 'Upload failed.'}`);
      }
      setReviewFeedback({
        tone: failedCount > 0 || needsReviewCount > 0 ? 'warning' : 'success',
        title: failedCount > 0 || needsReviewCount > 0 ? 'Scan Finished With Review Needed' : 'Scan Complete',
        message: `Ready: ${successCount}. Need review: ${needsReviewCount}. Failed: ${failedCount}.`
      });
      showToast(
        failedCount > 0 || needsReviewCount > 0 ? 'warning' : 'success',
        `Scan completed: ${successCount} ready, ${needsReviewCount} need review, ${failedCount} failed.`
      );
    } catch (error) {
      setReviewFeedback({
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

  function renderMobileReviewCard(row) {
    const isEditing = editingRowId === row.id;
    const propertyId = Number(row.data.property_list_id || 0);
    const canonicalRecord = propertyId > 0
      ? propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === propertyId)
      : null;
    const canonicalProperty = cleanTextValue(canonicalRecord?.property || '');
    const canonicalDd = cleanTextValue(canonicalRecord?.dd || '');
    const rowFields = BILL_TYPE_RECORD_FIELDS[row.bill_type] || [];
    const propertyQuery = editingPropertySearch.trim().toLowerCase();
    const filteredPropertyOptions = propertyRecords.filter((record) => {
      const label = getPropertyRecordLabel(record).toLowerCase();
      const owner = String(record.unit_owner || '').toLowerCase();
      return propertyQuery === '' || label.includes(propertyQuery) || owner.includes(propertyQuery);
    });

    return (
      <article
        key={row.id}
        className={`review-mobile-card review-mobile-card-${row.status}${selectedRowIds.includes(row.id) ? ' active' : ''}`}
      >
        <div className="review-mobile-card-top">
          <label className="review-mobile-checkbox">
            <input
              type="checkbox"
              checked={selectedRowIds.includes(row.id)}
              onChange={() => handleToggleRowSelection(row.id)}
              disabled={!isRowSelectable(row)}
            />
            <span>Select</span>
          </label>
          <span className={`review-status review-status-${row.status}`}>{getReviewStatusLabel(row.status)}</span>
        </div>

        <div className="review-mobile-card-header">
          <div>
            <p className="review-mobile-file">{row.source_file_name || 'Uploaded file'}</p>
            {isEditing ? (
              <select
                value={row.bill_type || ''}
                onChange={(event) => handleRowBillTypeChange(row.id, event.target.value)}
                disabled={row.status === 'saving'}
              >
                <option value="">Select type</option>
                {Object.entries(BILL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <h3>{BILL_TYPE_LABELS[row.bill_type] || row.bill_type || 'Scan failed'}</h3>
            )}
          </div>
          <span className="review-mobile-pill">{row.data.due_period || 'No due period'}</span>
        </div>

        <div className="review-mobile-card-body">
          <label className="review-field-item">
            <span>Property / DD</span>
            {isEditing ? (
              <div className="combo-wrap review-combo-wrap">
                <input
                  value={editingPropertySearch}
                  autoComplete="off"
                  onChange={(event) => handleEditingPropertySearchChange(event.target.value)}
                  onFocus={() => setIsEditingPropertyDropdownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsEditingPropertyDropdownOpen(false), 120);
                  }}
                  disabled={loadingPropertyRecords || row.status === 'saving'}
                  className="combo-input"
                />
                <span className="combo-search-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                </span>
                {isEditingPropertyDropdownOpen && (
                  <div className="combo-list review-combo-list">
                    {loadingPropertyRecords && <p className="muted-text combo-item">Loading property records...</p>}
                    {!loadingPropertyRecords && filteredPropertyOptions.length === 0 && (
                      <p className="muted-text combo-item">No matching property record.</p>
                    )}
                    {!loadingPropertyRecords &&
                      filteredPropertyOptions.map((record) => {
                        const recordId = Number(record.property_list_id || record.id || 0);
                        return (
                          <button
                            key={`review-mobile-prop-${recordId}`}
                            type="button"
                            className="combo-item-btn"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleEditingPropertyOptionSelect(record)}
                          >
                            <span>{getPropertyRecordLabel(record)}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <strong>{canonicalProperty || canonicalDd || row.data.property || row.data.dd || '-'}</strong>
            )}
          </label>

          <label className="review-field-item">
            <span>Due Period</span>
            {isEditing ? (
              <input
                type="month"
                value={row.data.due_period || ''}
                onChange={(event) => handleRowFieldChange(row.id, 'due_period', event.target.value)}
                disabled={loadingPropertyRecords || row.status === 'saving'}
              />
            ) : (
              <strong>{row.data.due_period || '-'}</strong>
            )}
          </label>

          <div className="review-mobile-fields">
            {rowFields.map((field) => (
              <label key={`${row.id}-${field}`} className="review-field-item">
                <span>{field}</span>
                {isEditing ? (
                  field === 'water_payment_status' ? (
                    <select
                      value={WATER_STATUS_OPTIONS.includes(row.data[field]) ? row.data[field] : ''}
                      onChange={(event) => handleRowFieldChange(row.id, field, event.target.value)}
                      disabled={row.status === 'saving'}
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      {WATER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={row.data[field] || ''}
                      onChange={(event) => handleRowFieldChange(row.id, field, event.target.value)}
                      disabled={row.status === 'saving'}
                    />
                  )
                ) : (
                  <strong>{row.data[field] || '-'}</strong>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="review-action-status">
          {row.scan_error && <p className="error review-error">{row.scan_error}</p>}
          {row.save_error && <p className="error review-error">{row.save_error}</p>}
          {cleanTextValue(row.data?.account_lookup_message) !== '' && (
            <p className="review-helper-text">{row.data.account_lookup_message}</p>
          )}
          {Array.isArray(row.data?.account_lookup_candidates) && row.data.account_lookup_candidates.length > 0 && (
            <div className="review-candidate-list">
              {row.data.account_lookup_candidates.map((candidate) => (
                <button
                  key={`${row.id}-mobile-candidate-${candidate.property_list_id}`}
                  type="button"
                  className="btn btn-secondary review-candidate-btn"
                  onClick={() => handleRowPropertyChange(row.id, candidate.property_list_id)}
                  disabled={row.status === 'saving'}
                >
                  {candidate.property || candidate.dd || `Property #${candidate.property_list_id}`}
                </button>
              ))}
            </div>
          )}
          {row.diagnostics && (
            <div className="review-diagnostics">
              <p><strong>{row.diagnostics.title}</strong></p>
              <p>{row.diagnostics.message}</p>
              {row.diagnostics.status_code > 0 && <p>HTTP {row.diagnostics.status_code}</p>}
              {row.diagnostics.request_id && <p>Request ID: {row.diagnostics.request_id}</p>}
              {row.diagnostics.retry_count > 0 && <p>Retries: {row.diagnostics.retry_count}</p>}
              {row.diagnostics.details && <p>{row.diagnostics.details}</p>}
            </div>
          )}
        </div>

        <div className="review-mobile-card-actions">
          {!isEditing && (
            <button
              type="button"
              className="btn btn-secondary review-btn review-btn-edit"
              onClick={() => setEditingRowId(row.id)}
              disabled={row.status === 'saving'}
            >
              Review
            </button>
          )}
          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary review-btn review-btn-done"
              onClick={() => setEditingRowId(null)}
              disabled={row.status === 'saving'}
            >
              Done
            </button>
          )}
          <button
            type="button"
            className="btn review-btn review-btn-primary"
            onClick={() => saveRowById(row.id)}
            disabled={row.status === 'saving' || row.status === 'saved' || row.status === 'scan_failed'}
            aria-label={row.status === 'saving' ? 'Saving...' : 'Save Row'}
          >
            {row.status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {row.status === 'scan_failed' && (
            <button
              type="button"
              className="btn btn-secondary review-btn review-btn-done"
              onClick={() => retryRowScan(row.id)}
              disabled={row.status === 'saving'}
              aria-label="Retry Scan"
            >
              Try Again
            </button>
          )}
          {row.status === 'scan_failed' && (
            <button
              type="button"
              className="btn btn-secondary review-btn review-btn-edit"
              onClick={() => requeueFailedRow(row.id)}
              disabled={row.status === 'saving'}
            >
              Requeue
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary review-btn review-btn-cancel"
            onClick={() => removeRow(row.id)}
            disabled={row.status === 'saving'}
          >
            Remove
          </button>
        </div>
      </article>
    );
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={uploading || loadingReviewQueue || !ocrUploadHealthy}
              title={
                loadingReviewQueue
                  ? 'Loading saved Bills Review queue...'
                  : !ocrUploadHealthy && ocrUploadHealthMessage
                    ? ocrUploadHealthMessage
                    : ''
              }
              aria-label="Upload Bills"
            >
              {loadingReviewQueue ? 'Loading Queue...' : uploading ? 'Uploading Bills...' : 'Upload Bills'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSaveSelected} disabled={selectedCount === 0} aria-label={`Save Selected (${selectedSavableRows.length})`}>
              Save Ready ({selectedSavableRows.length})
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRetrySelected} disabled={selectedFailedScanRows.length === 0} aria-label={`Retry Selected (${selectedFailedScanRows.length})`}>
              Try Again ({selectedFailedScanRows.length})
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleRequeueSelected} disabled={selectedFailedScanRows.length === 0} aria-label="Requeue Selected">
              Move to Review
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClearSelected} disabled={selectedCount === 0} aria-label="Clear Selected">
              Remove Selected
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
              aria-label="Clear Queue"
            >
              Remove All
            </button>
          </div>
        </div>

        <StatusBanner feedback={reviewFeedback} />
        {!reviewFeedback && ocrHealthNotice && <StatusBanner feedback={ocrHealthNotice} />}
        {queueSyncError && <p className="error">{queueSyncError}</p>}
        {!queueSyncError && isQueueSyncing && <p className="muted-text">Saving queue changes...</p>}

        <div className="review-summary-grid">
          <div className="review-summary-card">
            <span>Queue</span>
            <strong>{queueStats.total}</strong>
          </div>
          <div className="review-summary-card">
            <span>Ready</span>
            <strong>{queueStats.ready}</strong>
          </div>
          <div className="review-summary-card">
            <span>Need Review</span>
            <strong>{queueStats.needs_review}</strong>
          </div>
          <div className="review-summary-card">
            <span>Scan Failed</span>
            <strong>{queueStats.scan_failed}</strong>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="empty-state">
            <p>
              {loadingReviewQueue
                ? 'Loading saved Bills Review queue...'
                : !ocrUploadHealthy
                  ? `No scanned bills yet. Upload is blocked until OCR is healthy. ${ocrUploadHealthMessage || ''}`.trim()
                  : 'No scanned bills yet. Upload files to start review.'}
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="property-records-content">
            {isPhoneLayout && (
              <div className="review-mobile-list" aria-label="Bills review mobile list">
                {rows.map((row) => renderMobileReviewCard(row))}
              </div>
            )}
            {!isPhoneLayout && (
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
                    <th>Due Period</th>
                    <th>Fields</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = editingRowId === row.id;
                    const propertyId = Number(row.data.property_list_id || 0);
                    const canonicalRecord = propertyId > 0
                      ? propertyRecords.find((record) => Number(record.property_list_id || record.id || 0) === propertyId)
                      : null;
                    const canonicalProperty = cleanTextValue(canonicalRecord?.property || '');
                    const canonicalDd = cleanTextValue(canonicalRecord?.dd || '');
                    const rowFields = BILL_TYPE_RECORD_FIELDS[row.bill_type] || [];
                    const propertyQuery = editingPropertySearch.trim().toLowerCase();
                    const filteredPropertyOptions = propertyRecords.filter((record) => {
                      const label = getPropertyRecordLabel(record).toLowerCase();
                      const owner = String(record.unit_owner || '').toLowerCase();
                      return propertyQuery === '' || label.includes(propertyQuery) || owner.includes(propertyQuery);
                    });
                    const compactReviewMessage = getCompactReviewMessage(row);
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
                        <td>
                          {isEditing ? (
                            <select
                              value={row.bill_type || ''}
                              onChange={(event) => handleRowBillTypeChange(row.id, event.target.value)}
                              disabled={row.status === 'saving'}
                            >
                              <option value="">Select type</option>
                              {Object.entries(BILL_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            BILL_TYPE_LABELS[row.bill_type] || row.bill_type || 'Scan failed'
                          )}
                        </td>
                        <td className={isEditing ? 'review-property-cell' : ''}>
                          {isEditing ? (
                            <div className="combo-wrap review-combo-wrap">
                              <input
                                value={editingPropertySearch}
                                autoComplete="off"
                                onChange={(event) => handleEditingPropertySearchChange(event.target.value)}
                                onFocus={() => setIsEditingPropertyDropdownOpen(true)}
                                onBlur={() => {
                                  window.setTimeout(() => setIsEditingPropertyDropdownOpen(false), 120);
                                }}
                                disabled={loadingPropertyRecords || row.status === 'saving'}
                                className="combo-input"
                              />
                              <span className="combo-search-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="11" cy="11" r="7" />
                                  <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                                </svg>
                              </span>
                              {isEditingPropertyDropdownOpen && (
                                <div className="combo-list review-combo-list">
                                  {loadingPropertyRecords && <p className="muted-text combo-item">Loading property records...</p>}
                                  {!loadingPropertyRecords && filteredPropertyOptions.length === 0 && (
                                    <p className="muted-text combo-item">No matching property record.</p>
                                  )}
                                  {!loadingPropertyRecords &&
                                    filteredPropertyOptions.map((record) => {
                                      const recordId = Number(record.property_list_id || record.id || 0);
                                      return (
                                        <button
                                          key={`review-prop-${recordId}`}
                                          type="button"
                                          className="combo-item-btn"
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => handleEditingPropertyOptionSelect(record)}
                                        >
                                          <span>{getPropertyRecordLabel(record)}</span>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          ) : (
                            canonicalProperty || canonicalDd || row.data.property || row.data.dd || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input
                              type="month"
                              value={row.data.due_period || ''}
                              onChange={(event) => handleRowFieldChange(row.id, 'due_period', event.target.value)}
                              disabled={loadingPropertyRecords || row.status === 'saving'}
                            />
                          ) : (
                            row.data.due_period || '-'
                          )}
                        </td>
                        <td className="review-fields-cell">
                          {rowFields.map((field) => (
                            <label key={`${row.id}-${field}`} className="review-field-item">
                              <span>{field}</span>
                              {isEditing ? (
                                field === 'water_payment_status' ? (
                                  <select
                                    value={WATER_STATUS_OPTIONS.includes(row.data[field]) ? row.data[field] : ''}
                                    onChange={(event) => handleRowFieldChange(row.id, field, event.target.value)}
                                    disabled={row.status === 'saving'}
                                  >
                                    <option value="" disabled>
                                      Select status
                                    </option>
                                    {WATER_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    value={row.data[field] || ''}
                                    onChange={(event) => handleRowFieldChange(row.id, field, event.target.value)}
                                    disabled={row.status === 'saving'}
                                  />
                                )
                              ) : (
                                <strong>{row.data[field] || '-'}</strong>
                              )}
                            </label>
                          ))}
                        </td>
                        <td>
                          <div className={`action-buttons review-action-cell${isEditing ? ' review-action-cell-editing' : ''}`}>
                            <div className="review-action-summary">
                              <span className={`review-status review-status-${row.status}`}>{getReviewStatusLabel(row.status)}</span>
                              {!isEditing && compactReviewMessage !== '' && (
                                <p className="review-action-inline-message" title={compactReviewMessage}>
                                  {compactReviewMessage}
                                </p>
                              )}
                            </div>
                            {isEditing && (
                              <div className="review-action-details">
                                {row.scan_error && <p className="error review-error">{row.scan_error}</p>}
                                {row.save_error && <p className="error review-error">{row.save_error}</p>}
                                {cleanTextValue(row.data?.account_lookup_message) !== '' && (
                                  <p className="review-helper-text">{row.data.account_lookup_message}</p>
                                )}
                                {Array.isArray(row.data?.account_lookup_candidates) && row.data.account_lookup_candidates.length > 0 && (
                                  <div className="review-candidate-list">
                                    {row.data.account_lookup_candidates.map((candidate) => (
                                      <button
                                        key={`${row.id}-candidate-${candidate.property_list_id}`}
                                        type="button"
                                        className="btn btn-secondary review-candidate-btn"
                                        onClick={() => handleRowPropertyChange(row.id, candidate.property_list_id)}
                                        disabled={row.status === 'saving'}
                                      >
                                        {candidate.property || candidate.dd || `Property #${candidate.property_list_id}`}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {row.diagnostics && (
                                  <div className="review-diagnostics">
                                    <p><strong>{row.diagnostics.title}</strong></p>
                                    <p>{row.diagnostics.message}</p>
                                    {row.diagnostics.status_code > 0 && <p>HTTP {row.diagnostics.status_code}</p>}
                                    {row.diagnostics.request_id && <p>Request ID: {row.diagnostics.request_id}</p>}
                                    {row.diagnostics.retry_count > 0 && <p>Retries: {row.diagnostics.retry_count}</p>}
                                    {row.diagnostics.details && <p>{row.diagnostics.details}</p>}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="review-action-buttons">
                              {!isEditing && (
                                <button
                                  type="button"
                                  className="btn btn-secondary review-btn review-btn-edit"
                                  onClick={() => setEditingRowId(row.id)}
                                  disabled={row.status === 'saving'}
                                >
                                  Review
                                </button>
                              )}
                              {isEditing && (
                                <button
                                  type="button"
                                  className="btn btn-secondary review-btn review-btn-done"
                                  onClick={() => setEditingRowId(null)}
                                  disabled={row.status === 'saving'}
                                >
                                  Done
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn review-btn review-btn-primary"
                                onClick={() => saveRowById(row.id)}
                                disabled={row.status === 'saving' || row.status === 'saved' || row.status === 'scan_failed'}
                                aria-label={row.status === 'saving' ? 'Saving...' : 'Save Row'}
                              >
                                {row.status === 'saving' ? 'Saving...' : 'Save'}
                              </button>
                              {row.status === 'scan_failed' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary review-btn review-btn-done"
                                  onClick={() => retryRowScan(row.id)}
                                  disabled={row.status === 'saving'}
                                  aria-label="Retry Scan"
                                >
                                  Try Again
                                </button>
                              )}
                              {row.status === 'scan_failed' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary review-btn review-btn-edit"
                                  onClick={() => requeueFailedRow(row.id)}
                                  disabled={row.status === 'saving'}
                                >
                                  Requeue
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-secondary review-btn review-btn-cancel"
                                onClick={() => removeRow(row.id)}
                                disabled={row.status === 'saving'}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}
      </section>

      {isPhoneLayout && rows.length > 0 && (
        <div className="mobile-sticky-bar review-mobile-sticky-bar">
          <div className="mobile-sticky-bar-copy">
            <strong>{selectedCount > 0 ? `${selectedCount} row(s) selected` : 'Select review rows'}</strong>
            <span>Ready: {selectedSavableRows.length} | Retry: {selectedFailedScanRows.length}</span>
          </div>
          <div className="mobile-sticky-bar-actions review-mobile-sticky-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={uploading || loadingReviewQueue || !ocrUploadHealthy}
            >
              Upload
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleSaveSelected} disabled={selectedCount === 0}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetrySelected}
              disabled={selectedFailedScanRows.length === 0}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRequeueSelected}
              disabled={selectedFailedScanRows.length === 0}
            >
              Review
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClearSelected} disabled={selectedCount === 0}>
              Remove
            </button>
          </div>
        </div>
      )}

      <UploadModal
        open={isUploadModalOpen}
        uploading={uploading}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </AppLayout>
  );
}


