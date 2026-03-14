import { cleanTextValue } from '../../../shared/lib/billPropertyUtils.js';
import { validateUploadExtraction } from '../../../shared/lib/ocrParser.js';

export const DUE_PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const WATER_STATUS_OPTIONS = ['Paid', 'Unpaid'];
export const REVIEW_QUEUE_SYNC_DELAY_MS = 250;
export const REVIEW_QUEUE_RETRY_DELAY_MS = 5000;

export const BILL_TYPE_RECORD_FIELDS = {
  internet: ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'],
  water: ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'],
  electricity: ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'],
  association_dues: ['association_dues', 'association_due_date', 'association_payment_status']
};

export const BILL_TYPE_LABELS = {
  internet: 'WiFi/Internet',
  water: 'Water',
  electricity: 'Electricity',
  association_dues: 'Association'
};

export const ACCOUNT_FIELD_BY_TYPE = {
  internet: 'internet_account_no',
  water: 'water_account_no',
  electricity: 'electricity_account_no'
};

export const SHARED_FIELDS = [
  'property_list_id',
  'dd',
  'property',
  'due_period',
  'unit_owner',
  'classification',
  'deposit',
  'rent',
  'real_property_tax',
  'rpt_payment_status',
  'penalty',
  'per_property_status'
];

export const INITIAL_BILL_DATA = {
  bill_type: 'water',
  property_list_id: 0,
  dd: '',
  property: '',
  due_period: '',
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

export const FAILED_ROW_DATA = {
  ...INITIAL_BILL_DATA,
  bill_type: ''
};

export const REVIEW_STATUS_LABELS = {
  ready: 'Ready to save',
  needs_review: 'Needs review',
  scan_failed: 'Scan failed',
  save_failed: 'Save failed',
  saving: 'Saving',
  saved: 'Saved'
};

export function normalizeBillTypeValue(value) {
  const normalized = cleanTextValue(value).toLowerCase();
  if (normalized === 'wifi') {
    return 'internet';
  }
  if (normalized === 'association') {
    return 'association_dues';
  }
  return normalized;
}

export function normalizeAmountToken(value) {
  const raw = cleanTextValue(value).replace(/,/g, '');
  if (raw === '') {
    return '';
  }
  const match = raw.match(/-?\d+(?:\.\d{1,4})?/);
  return match ? match[0] : raw;
}

export function isWaterLineDetected(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (data.water_line_detected === true) {
    return true;
  }
  const token = cleanTextValue(data.water_line_detected).toLowerCase();
  return token === 'true' || token === '1' || token === 'yes';
}

export function hasHighConfidenceSecondaryTypeSignal(data, billType) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (billType === 'water') {
    return cleanTextValue(data.water_account_no) !== '' && normalizeAmountToken(data.water_amount) !== '';
  }
  if (billType === 'electricity') {
    return cleanTextValue(data.electricity_account_no) !== '' && normalizeAmountToken(data.electricity_amount) !== '';
  }
  if (billType === 'internet') {
    const accountNo = cleanTextValue(data.internet_account_no);
    const provider = cleanTextValue(data.internet_provider);
    const amount = normalizeAmountToken(data.wifi_amount);
    return (accountNo !== '' || provider !== '') && amount !== '';
  }
  if (billType === 'association_dues') {
    return normalizeAmountToken(data.association_dues) !== '';
  }
  return false;
}

export function deriveReviewBillTypes(normalized, primaryType) {
  const resolvedPrimary = BILL_TYPE_RECORD_FIELDS[primaryType] ? primaryType : 'water';
  const types = [resolvedPrimary];

  if (resolvedPrimary === 'association_dues') {
    const associationAmount = normalizeAmountToken(normalized.association_dues);
    const waterAmount = normalizeAmountToken(normalized.water_amount);
    const electricityAmount = normalizeAmountToken(normalized.electricity_amount);
    const totalAmountDue = normalizeAmountToken(normalized.total_amount_due);
    const hasWaterSignal =
      isWaterLineDetected(normalized) ||
      cleanTextValue(normalized.water_account_no) !== '' ||
      cleanTextValue(normalized.water_due_date) !== '' ||
      cleanTextValue(normalized.water_payment_status) !== '';
    const waterLooksLikeGenericTotal =
      (electricityAmount !== '' && waterAmount === electricityAmount) ||
      (totalAmountDue !== '' && waterAmount === totalAmountDue);
    if (waterAmount !== '' && waterAmount !== associationAmount && hasWaterSignal && !waterLooksLikeGenericTotal) {
      types.push('water');
    }
  }

  ['internet', 'water', 'electricity', 'association_dues'].forEach((candidateType) => {
    if (!types.includes(candidateType) && hasHighConfidenceSecondaryTypeSignal(normalized, candidateType)) {
      types.push(candidateType);
    }
  });

  return types;
}

export function createRowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function classifyUploadFailure(error) {
  const message = String(error?.message || 'Upload failed.');
  const normalized = message.toLowerCase();
  const statusCode = Number(error?.statusCode || 0);

  if (error?.category === 'retryable' || normalized.includes('timed out') || normalized.includes('no response')) {
    return {
      code: 'retryable',
      title: 'Retry scan',
      guidance: 'The OCR service did not complete cleanly. Retry the file first.'
    };
  }

  if (error?.category === 'ocr_response' || normalized.includes('empty response') || normalized.includes('invalid response')) {
    return {
      code: 'ocr_response',
      title: 'Requeue for review',
      guidance: 'OCR returned an empty or invalid payload. Requeue if you want to review the bill manually.'
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      code: 'file_validation',
      title: 'Fix file',
      guidance: 'This file was rejected before OCR. Check file type, size, or upload content.'
    };
  }

  return {
    code: 'scan_failed',
    title: 'Investigate',
    guidance: 'Review the file diagnostics, then retry or requeue the upload.'
  };
}

export function buildFailedUploadRow(file, error, retryCount = 0) {
  const diagnostics = classifyUploadFailure(error);
  return {
    id: createRowId(),
    source_file_name: file?.name || 'Uploaded file',
    bill_type: '',
    status: 'scan_failed',
    scan_error: diagnostics.guidance,
    save_error: '',
    data: { ...FAILED_ROW_DATA },
    diagnostics: {
      code: diagnostics.code,
      title: diagnostics.title,
      message: String(error?.message || 'Upload failed.'),
      details: String(error?.details || ''),
      request_id: String(error?.requestId || ''),
      status_code: Number(error?.statusCode || 0),
      retry_count: retryCount
    }
  };
}

export function buildCreatePayload(data, billType) {
  const payload = { bill_type: billType };
  SHARED_FIELDS.forEach((field) => {
    payload[field] = data[field];
  });
  (BILL_TYPE_RECORD_FIELDS[billType] || []).forEach((field) => {
    payload[field] = data[field];
  });
  return payload;
}

export function getReviewStatusLabel(status) {
  const normalized = cleanTextValue(status).toLowerCase();
  return REVIEW_STATUS_LABELS[normalized] || status || 'Needs review';
}

export function getFriendlyReviewSaveError(row) {
  const propertyListId = Number(row?.data?.property_list_id || 0);
  if (propertyListId <= 0) {
    return 'Choose the property before saving this row.';
  }
  if (!DUE_PERIOD_REGEX.test(cleanTextValue(row?.data?.due_period))) {
    return 'Choose the due period before saving this row.';
  }
  const validation = validateUploadExtraction(row?.data || {}, row?.bill_type || '');
  if (!validation.valid) {
    return validation.message || 'Complete the missing bill details before saving this row.';
  }
  return '';
}

export function getCompactReviewMessage(row) {
  const normalizedStatus = cleanTextValue(row?.status).toLowerCase();
  const validationMessage = cleanTextValue(row?.scan_error);
  const confidenceSummary = cleanTextValue(row?.data?.ocr_confidence?.summary).toLowerCase();
  if (normalizedStatus === 'ready' && validationMessage !== '') {
    if (confidenceSummary === 'medium') {
      return `Ready with heuristic OCR fields. ${validationMessage}`;
    }
    return `Ready with warnings. ${validationMessage}`;
  }
  const saveError = cleanTextValue(row?.save_error);
  if (saveError !== '') {
    return saveError;
  }
  if (validationMessage !== '') {
    return validationMessage;
  }
  const accountLookupMessage = cleanTextValue(row?.data?.account_lookup_message);
  if (accountLookupMessage !== '') {
    return accountLookupMessage;
  }
  if (String(row?.status || '').trim().toLowerCase() === 'scan_failed') {
    return cleanTextValue(row?.diagnostics?.title || 'Retry or requeue this scan.');
  }
  return '';
}

export function normalizeRowStatus(data, billType) {
  const validation = validateUploadExtraction(data, billType);
  const warningMessage =
    validation.valid && validation.message ? validation.message : '';
  return {
    status: validation.valid ? 'ready' : 'needs_review',
    validationMessage: validation.valid ? warningMessage : validation.message || '',
    confidence: validation.confidence || null
  };
}

export function isRowSelectable(row) {
  return row.status !== 'saved' && row.status !== 'saving';
}
