// Finance App File: frontend\src\pages\PaymentFormPage.jsx
// Purpose: Frontend/support source file for the Finance app.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout.jsx';
import Toast from '../components/Toast.jsx';
import PaymentForm from '../components/payment/PaymentForm.jsx';
import UploadModal from '../components/payment/UploadModal.jsx';
import { createBill, fetchBills, fetchPropertyRecords, updateBill, uploadBill } from '../lib/api.js';
import {
  clearScopedGlobalEditMode,
  getGlobalEditMode,
  getScopedGlobalEditMode,
  setScopedGlobalEditMode,
  subscribeGlobalEditMode
} from '../lib/globalEditMode.js';
import { useToast } from '../hooks/useToast.js';

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

const UPLOAD_REQUIRED_FIELDS_BY_TYPE = {
  internet: ['wifi_amount', 'internet_account_no', 'wifi_due_date', 'wifi_payment_status', 'internet_provider'],
  water: ['water_amount', 'water_account_no', 'water_due_date', 'water_payment_status'],
  electricity: ['electricity_amount', 'electricity_account_no', 'electricity_due_date', 'electricity_payment_status'],
  association_dues: ['association_dues', 'association_due_date']
};

const UPLOAD_FIELD_LABELS = {
  internet_provider: 'Internet Provider',
  internet_account_no: 'Internet Account No.',
  wifi_amount: 'WiFi Amount',
  wifi_due_date: 'WiFi Due Date',
  wifi_payment_status: 'WiFi Payment Status',
  water_account_no: 'Water Account No.',
  water_amount: 'Water Amount',
  water_due_date: 'Water Due Date',
  water_payment_status: 'Water Payment Status',
  electricity_account_no: 'Electricity Account No.',
  electricity_amount: 'Electricity Amount',
  electricity_due_date: 'Electricity Due Date',
  electricity_payment_status: 'Electricity Payment Status',
  association_dues: 'Association Dues',
  association_due_date: 'Association Due Date',
  association_payment_status: 'Association Payment Status'
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

function canonicalUploadKey(key) {
  return String(key ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDateValue(value) {
  const raw = cleanTextValue(value);
  if (raw === '') {
    return '';
  }
  const directYmd = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (directYmd) {
    return directYmd[1];
  }
  const inlineDmy = raw.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (inlineDmy) {
    return `${inlineDmy[3]}-${String(Number(inlineDmy[2])).padStart(2, '0')}-${String(Number(inlineDmy[1])).padStart(2, '0')}`;
  }
  const inlineDMonY = raw.match(/\b(\d{1,2})[-\s]([A-Za-z]{3,9})[-,\s]+(\d{4})\b/);
  if (inlineDMonY) {
    const monthMap = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12'
    };
    const month = monthMap[inlineDMonY[2].toLowerCase().slice(0, 3)];
    if (month) {
      return `${inlineDMonY[3]}-${month}-${String(Number(inlineDMonY[1])).padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${String(Number(ymd[2])).padStart(2, '0')}-${String(Number(ymd[3])).padStart(2, '0')}`;
  }

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${String(Number(dmy[2])).padStart(2, '0')}-${String(Number(dmy[1])).padStart(2, '0')}`;
  }

  const dMonY = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-,\s]+(\d{4})$/);
  if (dMonY) {
    const monthMap = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12'
    };
    const month = monthMap[dMonY[2].toLowerCase().slice(0, 3)];
    if (month) {
      return `${dMonY[3]}-${month}-${String(Number(dMonY[1])).padStart(2, '0')}`;
    }
  }

  const monDY = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monDY) {
    const monthMap = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12'
    };
    const month = monthMap[monDY[1].toLowerCase().slice(0, 3)];
    if (month) {
      return `${monDY[3]}-${month}-${String(Number(monDY[2])).padStart(2, '0')}`;
    }
  }

  return raw;
}

function normalizeAmountValue(value) {
  const raw = cleanTextValue(value);
  if (raw === '') {
    return '';
  }
  const normalizedGrouping = raw
    // OCR sometimes inserts spaces between thousand groups: "6 506.71" -> "6506.71"
    .replace(/(\d)\s+(?=\d{3}(?:\D|$))/g, '$1')
    // Also normalize comma+space cases.
    .replace(/,\s+(?=\d{3}(?:\D|$))/g, ',');
  const tokens = raw.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2}/g);
  const normalizedTokens = (tokens || normalizedGrouping.match(/-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|-?\d+\.\d{2}/g) || [])
    .map((token) => token.replace(/[,\s]/g, ''))
    .filter((token) => /^-?\d+(?:\.\d{2})$/.test(token));
  if (normalizedTokens.length > 0) {
    return normalizedTokens[normalizedTokens.length - 1];
  }
  const cleaned = normalizedGrouping
    .replace(/[,\s]/g, '')
    .replace(/^(php|usd|eur|gbp|sgd|aud|cad|p)/i, '')
    .replace(/[^\d.\-]/g, '')
    .trim();
  return cleaned || raw;
}

function extractUploadText(data) {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const candidates = [
    data.raw_response,
    data.raw,
    data.text,
    data.extracted_text,
    data.extractedText,
    data.fullText,
    data.ocr_text,
    data.content?.parts?.[0]?.text
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.replace(/\r/g, '\n').trim();
    }
  }

  return '';
}

function pickTextMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanTextValue(match[1]);
    }
  }
  return '';
}

function parseUploadFieldsFromText(text) {
  if (!text) {
    return {};
  }

  const normalizedText = text.replace(/\s+/g, ' ');

  const inferredBillType = (() => {
    const lowered = normalizedText.toLowerCase();
    if (/\b(electric|kwh|meter reading)\b/.test(lowered)) {
      return 'electricity';
    }
    if (/\b(wifi|internet|broadband|isp)\b/.test(lowered)) {
      return 'internet';
    }
    if (/\b(association|hoa|dues)\b/.test(lowered)) {
      return 'association_dues';
    }
    if (/\b(water|cubic meter|m3)\b/.test(lowered)) {
      return 'water';
    }
    return '';
  })();

  const customerName = pickTextMatch(text, [
    /\bCustomer\s*Name[:\s-]*([^\n]+?)(?:\s+Business\s*Style[:\s-]|$)/i
  ]);
  const addressLine = pickTextMatch(text, [
    /\bAddress[:\s-]*([^\n]+?)(?:\s+TIN\s*\(|$)/i
  ]);
  const propertyFromAddress = cleanTextValue(addressLine.split(',')[0] || '');

  return {
    bill_type: pickTextMatch(text, [
      /\bBill\s*Type[:\s-]*([A-Za-z_ ]+)/i,
      /\bUtility\s*Type[:\s-]*([A-Za-z_ ]+)/i
    ]) || inferredBillType,
    dd: customerName || pickTextMatch(text, [
      /\bProperty\/DD[:\s-]*([A-Za-z0-9 \-]+)/i,
      /\bDD[:\s-]*([A-Za-z0-9 \-]+)/i
    ]),
    property: propertyFromAddress || pickTextMatch(text, [
      /\bProperty[:\s-]*([A-Za-z0-9 \-]+)/i
    ]),
    internet_provider: pickTextMatch(text, [
      /\bInternet\s*Provider[:\s-]*([^\n]+)/i,
      /\bProvider[:\s-]*([^\n]+)/i
    ]),
    internet_account_no: pickTextMatch(text, [
      /\bInternet\s*Account\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bAccount\s*(?:No|Number)\.?\s*[:\s-]*([A-Za-z0-9\-]+)/i
    ]),
    wifi_amount: pickTextMatch(text, [
      /\bAmount\s*Due[:\s-]*([^\n]+)/i,
      /\bTotal(?:\s*Amount)?[:\s-]*([^\n]+)/i
    ]),
    wifi_due_date: pickTextMatch(text, [/\bDue\s*Date[:\s-]*([^\n]+)/i]),
    wifi_payment_status: pickTextMatch(text, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
    water_account_no: pickTextMatch(text, [
      /\bWater\s*Account\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i
    ]),
    water_amount: pickTextMatch(text, [
      /\bTotal\s*Balance\s*Due[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
      /\bWater(?:\s*Amount)?[:\s-]*([^\n]+)/i,
      /\bWater\s*Cons(?:umption)?[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
      /\bCurrent\s*Charges[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
      /\bAmount\s*Due[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i
    ]),
    water_due_date: pickTextMatch(text, [
      /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([^\n]+)/i,
      /\bDue\s*Date[:\s-]*([^\n]+)/i,
      /\bDue\s*Date\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
      /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
      /\bDue\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i
    ]),
    water_payment_status: pickTextMatch(text, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
    electricity_account_no: pickTextMatch(text, [
      /\bElectricity\s*Account\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bCustomer\s*Acct\.?\s*No\.?\s*[:\s-]*([A-Za-z0-9\-]+)/i,
      /\bMeter\s*No\.?[:\s-]*([A-Za-z0-9\-]+)/i
    ]),
    electricity_amount: pickTextMatch(text, [
      /\bTOTAL\s*CURRENT\s*BILL\s*AMOUNT[^\d\-]*([0-9][0-9,]*\.\d{2})/i,
      /\bCurrent\s*Charges[^\d\-]*([0-9][0-9,]*\.\d{2})/i,
      /\bTotal\s*Amount\s*Due[^\d\-]*([0-9][0-9,]*\.\d{2})/i,
      /\bAmount\s*Due[^\d\-]*([0-9][0-9,]*\.\d{2})/i
    ]),
    electricity_total_amount_due: pickTextMatch(text, [
      /\bTotal\s*Amount\s*Due[^\d\-]*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2}))/i
    ]),
    electricity_due_date: pickTextMatch(text, [
      /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
      /\bDue\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i
    ]),
    electricity_payment_status: pickTextMatch(text, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
    association_dues: pickTextMatch(text, [/\bAssociation\s*Dues[:\s-]*([^\n]+)/i]),
    association_due_date: pickTextMatch(text, [
      /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([^\n]+)/i,
      /\bDue\s*Date[:\s-]*([^\n]+)/i
    ]),
    association_payment_status: pickTextMatch(text, [/\bPayment\s*Status[:\s-]*([^\n]+)/i])
  };
}

function buildUploadLookup(data) {
  const lookup = {};
  if (!data || typeof data !== 'object') {
    return lookup;
  }

  Object.entries(data).forEach(([key, value]) => {
    const cleanKey = cleanTextValue(key);
    if (!cleanKey) {
      return;
    }
    lookup[cleanKey] = value;
    lookup[canonicalUploadKey(cleanKey)] = value;
  });

  return lookup;
}

function pickUploadValue(lookup, keys, fallback = '') {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(lookup, key)) {
      return cleanTextValue(lookup[key]);
    }
    const canonical = canonicalUploadKey(key);
    if (Object.prototype.hasOwnProperty.call(lookup, canonical)) {
      return cleanTextValue(lookup[canonical]);
    }
  }
  return cleanTextValue(fallback);
}

function parseAccountNoFromFilename(filename) {
  const raw = cleanTextValue(filename);
  if (raw === '') {
    return '';
  }
  const match = raw.match(/([A-Za-z0-9]{8,})-\d{6}/);
  if (!match || !match[1]) {
    return '';
  }
  return cleanTextValue(match[1]);
}

function addUploadFileFallback(data, filename, billType) {
  const next = (data && typeof data === 'object') ? { ...data } : {};
  const name = cleanTextValue(filename);
  if (name === '') {
    return next;
  }

  const genericAccount = parseAccountNoFromFilename(name);

  if (billType === 'water') {
    if (cleanTextValue(next.water_payment_status) === '' && (
      cleanTextValue(next.water_amount) !== '' || cleanTextValue(next.water_due_date) !== '' || cleanTextValue(next.water_account_no) !== ''
    )) {
      next.water_payment_status = 'Unpaid';
    }
  }

  if (billType === 'electricity' && cleanTextValue(next.electricity_account_no) === '' && genericAccount !== '') {
    next.electricity_account_no = genericAccount;
  }
  if (billType === 'internet' && cleanTextValue(next.internet_account_no) === '' && genericAccount !== '') {
    next.internet_account_no = genericAccount;
  }

  return next;
}

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    return value;
  }
}

function normalizeUploadData(input) {
  let data = input;
  let envelope = safeJsonParse(input);
  if (Array.isArray(envelope) && envelope.length > 0) {
    envelope = envelope[0];
  }
  const envelopeText = envelope && typeof envelope === 'object'
    ? extractUploadText(envelope)
    : '';

  function unwrapPayload(value) {
    let current = safeJsonParse(value);

    // Handle list responses from "All Incoming Items" or array-wrapped payloads.
    if (Array.isArray(current) && current.length > 0) {
      current = current[0];
    }

    // Unwrap nested envelopes often returned by n8n node variants.
    for (let i = 0; i < 6; i += 1) {
      if (!current || typeof current !== 'object') {
        break;
      }
      const parsedJsonField = safeJsonParse(current.json);
      if (parsedJsonField && typeof parsedJsonField === 'object') {
        current = parsedJsonField;
        continue;
      }
      const parsedDataField = safeJsonParse(current.data);
      if (parsedDataField && typeof parsedDataField === 'object') {
        current = parsedDataField;
        continue;
      }
      if (current.success === true && current.data && typeof current.data === 'object') {
        current = current.data;
        continue;
      }
      if (Array.isArray(current.items) && current.items.length > 0) {
        current = current.items[0];
        continue;
      }
      break;
    }

    return safeJsonParse(current);
  }

  data = unwrapPayload(data);

  if (data && typeof data === 'object') {
    const nestedKeys = ['body', 'result', 'output', 'response', 'payload', 'message'];
    for (const key of nestedKeys) {
      const parsedNested = safeJsonParse(data[key]);
      const unwrappedNested = unwrapPayload(parsedNested);
      if (unwrappedNested && typeof unwrappedNested === 'object') {
        data = { ...data, ...unwrappedNested };
      }
    }
  }

  if (data && typeof data === 'object' && data.json) {
    data = data.json;
  }

  if (data && data.content && data.content.parts && data.content.parts[0] && data.content.parts[0].text) {
    const parsed = safeJsonParse(data.content.parts[0].text);
    if (parsed && typeof parsed === 'object') {
      data = parsed;
    }
  }

  data = unwrapPayload(data);

  if (!data || typeof data !== 'object') {
    return null;
  }

  const uploadText = extractUploadText(data) || envelopeText;
  const parsedFromText = parseUploadFieldsFromText(uploadText);
  const lookup = buildUploadLookup({ ...data, ...parsedFromText });
  const filenameAccountNo = parseAccountNoFromFilename(
    pickUploadValue(lookup, ['filename', 'file_name', 'name'], '')
  );
  const resolvedBillType = pickUploadValue(lookup, ['bill_type', 'billType', 'utility_type'], parsedFromText.bill_type || '');

  const wifiAmount = normalizeAmountValue(
    pickUploadValue(lookup, ['wifi_amount', 'wifiAmount', 'internet_amount', 'amount', 'amount_due'], parsedFromText.wifi_amount || '')
  );
  const waterAmount = normalizeAmountValue(
    pickUploadValue(
      lookup,
      ['water_amount', 'waterAmount', 'total_balance_due', 'totalBalanceDue', 'amount', 'amount_due', 'total_amount_due', 'totalAmountDue'],
      parsedFromText.water_amount || ''
    )
  );
  const totalAmountDueValue = normalizeAmountValue(
    parsedFromText.electricity_total_amount_due || pickUploadValue(lookup, ['total_amount_due', 'totalAmountDue', 'amount_due', 'amountDue'], '')
  );
  const electricityAmountCandidates = [
    totalAmountDueValue,
    normalizeAmountValue(parsedFromText.electricity_amount || ''),
    normalizeAmountValue(pickUploadValue(lookup, ['total_current_bill_amount', 'totalCurrentBillAmount'], '')),
    normalizeAmountValue(pickUploadValue(lookup, ['current_charges', 'currentCharges'], '')),
    normalizeAmountValue(pickUploadValue(lookup, ['current_bill_amount', 'currentBillAmount'], '')),
    normalizeAmountValue(pickUploadValue(lookup, ['electricity_amount', 'electricityAmount'], ''))
  ].filter((value) => value !== '');
  const electricityAmountFromPayload = normalizeAmountValue(
    cleanTextValue(data.electricity_amount ?? data.electricityAmount ?? '')
  );
  const electricityAmount = electricityAmountFromPayload !== ''
    ? electricityAmountFromPayload
    : (electricityAmountCandidates[0] || '');
  const associationDues = normalizeAmountValue(
    pickUploadValue(lookup, ['association_dues', 'associationDues'], parsedFromText.association_dues || '')
  );
  const normalizedTotalAmountDue = normalizeAmountValue(
    parsedFromText.electricity_total_amount_due || pickUploadValue(
      lookup,
      ['total_amount_due', 'totalAmountDue', 'amount_due', 'amountDue', 'subtotal'],
      ''
    )
  );

  return {
    bill_type: resolvedBillType,
    property_list_id: Number(pickUploadValue(lookup, ['property_list_id', 'propertyListId'], '0')) || 0,
    dd: pickUploadValue(lookup, ['dd', 'property_dd', 'propertydd'], parsedFromText.dd || ''),
    property: pickUploadValue(lookup, ['property', 'property_name', 'propertyName'], parsedFromText.property || ''),
    unit_owner: pickUploadValue(lookup, ['unit_owner', 'unitOwner', 'tenant_name', 'tenantName']),
    classification: pickUploadValue(lookup, ['classification']),
    deposit: normalizeAmountValue(pickUploadValue(lookup, ['deposit'])),
    rent: normalizeAmountValue(pickUploadValue(lookup, ['rent'])),
    internet_provider: pickUploadValue(lookup, ['internet_provider', 'internetProvider', 'provider'], parsedFromText.internet_provider || ''),
    internet_account_no: pickUploadValue(lookup, ['internet_account_no', 'internetAccountNo', 'account_no', 'accountNo'], parsedFromText.internet_account_no || ''),
    wifi_amount: wifiAmount,
    wifi_due_date: normalizeDateValue(pickUploadValue(lookup, ['wifi_due_date', 'wifiDueDate', 'internet_due_date'], parsedFromText.wifi_due_date || '')),
    wifi_payment_status: pickUploadValue(lookup, ['wifi_payment_status', 'wifiPaymentStatus', 'payment_status'], parsedFromText.wifi_payment_status || '')
      || (wifiAmount !== '' ? 'Unpaid' : ''),
    water_account_no: pickUploadValue(
      lookup,
      ['water_account_no', 'waterAccountNo', 'wateracctno', 'wateracctnumber'],
      parsedFromText.water_account_no || ''
    ),
    water_amount: waterAmount,
    water_due_date: normalizeDateValue(
      pickUploadValue(
        lookup,
        ['water_due_date', 'waterDueDate', 'due_date', 'dueDate', 'current_bill_due_date', 'currentBillDueDate'],
        parsedFromText.water_due_date || ''
      )
    ),
    water_payment_status: pickUploadValue(lookup, ['water_payment_status', 'waterPaymentStatus', 'payment_status'], parsedFromText.water_payment_status || '')
      || (waterAmount !== '' ? 'Unpaid' : ''),
    electricity_account_no: parsedFromText.electricity_account_no || pickUploadValue(
      lookup,
      ['electricity_account_no', 'electricityAccountNo', 'customer_acct_no', 'customerAcctNo', 'meter_no', 'meterNo'],
      filenameAccountNo
    ),
    electricity_amount: electricityAmount,
    electricity_due_date: normalizeDateValue(
      parsedFromText.electricity_due_date || pickUploadValue(
        lookup,
        ['electricity_due_date', 'electricityDueDate', 'current_bill_due_date', 'currentBillDueDate', 'due_date', 'dueDate'],
        ''
      )
    ),
    electricity_payment_status: pickUploadValue(lookup, ['electricity_payment_status', 'electricityPaymentStatus', 'payment_status'], parsedFromText.electricity_payment_status || '')
      || (electricityAmount !== '' ? 'Unpaid' : ''),
    association_dues: associationDues,
    association_due_date: normalizeDateValue(pickUploadValue(lookup, ['association_due_date', 'associationDueDate'], parsedFromText.association_due_date || '')),
    association_payment_status: pickUploadValue(lookup, ['association_payment_status', 'associationPaymentStatus', 'payment_status'], parsedFromText.association_payment_status || '')
      || (associationDues !== '' ? 'Unpaid' : ''),
    total_amount_due: normalizedTotalAmountDue,
    real_property_tax: normalizeAmountValue(pickUploadValue(lookup, ['real_property_tax', 'realPropertyTax'])),
    rpt_payment_status: pickUploadValue(lookup, ['rpt_payment_status', 'rptPaymentStatus']),
    penalty: normalizeAmountValue(pickUploadValue(lookup, ['penalty'])),
    per_property_status: pickUploadValue(lookup, ['per_property_status', 'perPropertyStatus'])
  };
}

function detectBillTypeFromData(data) {
  if (!data || typeof data !== 'object') {
    return 'water';
  }

  const hinted = cleanTextValue(data.bill_type).toLowerCase();
  if (hinted.includes('association')) {
    return 'association_dues';
  }
  if (hinted.includes('electric')) {
    return 'electricity';
  }
  if (hinted.includes('internet') || hinted.includes('wifi')) {
    return 'internet';
  }
  if (hinted.includes('water')) {
    return 'water';
  }

  if (data.association_dues || data.association_due_date) {
    return 'association_dues';
  }

  if (data.electricity_amount || data.electricity_account_no || data.electricity_due_date || data.electricity_payment_status) {
    return 'electricity';
  }

  if (data.wifi_amount || data.internet_account_no || data.internet_provider || data.wifi_due_date || data.wifi_payment_status) {
    return 'internet';
  }

  return 'water';
}

function validateUploadExtraction(data, requiredBillType) {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      message: 'Document processing returned no structured data.'
    };
  }

  const billType = requiredBillType || detectBillTypeFromData(data);
  const requiredFields = UPLOAD_REQUIRED_FIELDS_BY_TYPE[billType] || [];
  const populatedFields = requiredFields.filter((field) => cleanTextValue(data[field]) !== '');

  if (populatedFields.length > 0) {
    return { valid: true, message: '' };
  }

  const detectedBillType = detectBillTypeFromData(data);
  const requiredLabels = requiredFields.map((field) => UPLOAD_FIELD_LABELS[field] || field);
  const moduleMismatch = detectedBillType !== billType
    ? ` Detected bill type looks like ${detectedBillType.replace('_', ' ')}; upload it from the matching module tab.`
    : '';

  return {
    valid: false,
    message: `No required ${billType.replace('_', ' ')} fields were extracted. Expected at least one of: ${requiredLabels.join(', ')}.${moduleMismatch}`
  };
}

function remapUploadDataToBillType(data, targetBillType) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const next = { ...data };
  const hasValue = (key) => cleanTextValue(next[key]) !== '';

  if (targetBillType === 'electricity') {
    if (!hasValue('electricity_amount') && hasValue('wifi_amount')) {
      next.electricity_amount = next.wifi_amount;
    }
    if (!hasValue('electricity_account_no') && hasValue('internet_account_no')) {
      next.electricity_account_no = next.internet_account_no;
    }
    if (!hasValue('electricity_due_date') && hasValue('wifi_due_date')) {
      next.electricity_due_date = next.wifi_due_date;
    }
    if (!hasValue('electricity_payment_status') && hasValue('wifi_payment_status')) {
      next.electricity_payment_status = next.wifi_payment_status;
    }
  } else if (targetBillType === 'internet') {
    if (!hasValue('wifi_amount') && hasValue('electricity_amount')) {
      next.wifi_amount = next.electricity_amount;
    }
    if (!hasValue('internet_account_no') && hasValue('electricity_account_no')) {
      next.internet_account_no = next.electricity_account_no;
    }
    if (!hasValue('wifi_due_date') && hasValue('electricity_due_date')) {
      next.wifi_due_date = next.electricity_due_date;
    }
    if (!hasValue('wifi_payment_status') && hasValue('electricity_payment_status')) {
      next.wifi_payment_status = next.electricity_payment_status;
    }
  } else if (targetBillType === 'water') {
    if (!hasValue('water_amount') && hasValue('wifi_amount')) {
      next.water_amount = next.wifi_amount;
    }
    if (!hasValue('water_due_date') && hasValue('wifi_due_date')) {
      next.water_due_date = next.wifi_due_date;
    }
    if (!hasValue('water_payment_status') && hasValue('wifi_payment_status')) {
      next.water_payment_status = next.wifi_payment_status;
    }
  } else if (targetBillType === 'association_dues') {
    if (!hasValue('association_dues') && hasValue('wifi_amount')) {
      next.association_dues = next.wifi_amount;
    }
    if (!hasValue('association_due_date') && hasValue('wifi_due_date')) {
      next.association_due_date = next.wifi_due_date;
    }
  }

  // Respect active module selected by user.
  next.bill_type = targetBillType;
  return next;
}

function buildClearedFormForBillType(billType) {
  return {
    ...INITIAL_FORM,
    bill_type: billType
  };
}

function buildPostSaveForm(currentForm, billType) {
  const next = {
    ...INITIAL_FORM,
    ...currentForm,
    bill_type: billType,
    property_list_id: Number(currentForm?.property_list_id || 0)
  };

  const billFields = BILL_TYPE_RECORD_FIELDS[billType] || [];
  billFields.forEach((field) => {
    next[field] = '';
  });

  return next;
}

function buildTabScopedPayload(form, billType) {
  const payload = {
    ...INITIAL_FORM,
    bill_type: billType
  };

  SHARED_BILL_SAVE_FIELDS.forEach((field) => {
    if (field === 'property_list_id') {
      payload[field] = Number(form?.[field] || 0);
    } else {
      payload[field] = form?.[field] ?? '';
    }
  });

  const scopedFields = BILL_TYPE_RECORD_FIELDS[billType] || [];
  scopedFields.forEach((field) => {
    payload[field] = form?.[field] ?? '';
  });

  return payload;
}

function buildUpdatePayloadForType(form, billType, editLock) {
  return {
    ...buildTabScopedPayload(form, billType),
    target_property_list_id: Number(editLock?.property_list_id || 0),
    target_dd: editLock?.dd || '',
    target_property: editLock?.property || '',
    target_billing_period: editLock?.billing_period || '',
    target_bill_type: editLock?.bill_type || billType
  };
}

function mapRecordsContextToForm(context, billType) {
  const nextForm = {
    ...INITIAL_FORM,
    bill_type: billType
  };

  Object.keys(INITIAL_FORM).forEach((key) => {
    if (key === 'bill_type') {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      if (key === 'property_list_id') {
        nextForm[key] = Number(context[key] || context.id || 0);
      } else {
        nextForm[key] = context[key] ?? '';
      }
    }
  });

  return nextForm;
}

function getContextBillIdByType(context, billType) {
  if (!context || typeof context !== 'object') {
    return 0;
  }

  const scopedEditingId = Number(context.editing_bill_id || 0);
  if (scopedEditingId > 0 && String(context.bill_type || '') === billType) {
    return scopedEditingId;
  }

  if (billType === 'water') {
    return Number(context.water_bill_id || 0);
  }
  if (billType === 'electricity') {
    return Number(context.electricity_bill_id || 0);
  }
  if (billType === 'internet') {
    return Number(context.internet_bill_id || 0);
  }
  if (billType === 'association_dues') {
    return Number(context.association_bill_id || 0);
  }
  return 0;
}

function buildEditLock(source, billType) {
  if (!source || typeof source !== 'object') {
    return INITIAL_EDIT_LOCK;
  }

  return {
    property_list_id: Number(source.property_list_id || 0),
    dd: source.dd || '',
    property: source.property || '',
    billing_period: source.billing_period || '',
    bill_type: billType || source.bill_type || ''
  };
}

function toFriendlyErrorMessage(rawMessage) {
  const message = String(rawMessage || '').trim();
  const lower = message.toLowerCase();
  if (lower.includes('record for this dd/property and bill type already exists') || lower.includes('property and bill type already exists')) {
    return 'This property already has a saved row for that bill type. Open the existing row and click Update.';
  }
  if (lower.includes('dd or property is required') || lower.includes('select a property from property list')) {
    return 'Select or enter a Property/DD first, then save.';
  }
  if (lower.includes('bill record not found for the selected property')) {
    return 'This bill entry could not be found for the selected property. Refresh and reopen Edit.';
  }
  return message || 'Request failed. Please try again.';
}

export default function PaymentFormPage({ billMode = 'water' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fromPropertyRecordsNext = location.state?.fromPropertyRecordsNext === true;
  const isListRoute = location.pathname.endsWith('/list');
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
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
  const baselineSnapshotRef = useRef({
    form: INITIAL_FORM,
    comboSearch: ''
  });
  const { toasts, showToast, removeToast } = useToast();
  const normalizedBillMode = BILL_MODE_TO_TYPE[billMode] !== undefined ? billMode : 'water';
  const currentBaseRoute = `/bills/${normalizedBillMode}`;
  const forcedBillType = BILL_MODE_TO_TYPE[normalizedBillMode];
  const currentFlowIndex = BILL_FLOW_MODES.indexOf(normalizedBillMode);
  const nextFlowPath = currentFlowIndex >= 0 && currentFlowIndex < BILL_FLOW_MODES.length - 1
    ? `/bills/${BILL_FLOW_MODES[currentFlowIndex + 1]}`
    : null;
  const isLastFlowStep = currentFlowIndex === BILL_FLOW_MODES.length - 1;
  const finalStepBackPath = '/property-records';
  const activeBillType = forcedBillType;
  const editDraftKey = `${EDIT_DRAFT_KEY_PREFIX}${normalizedBillMode}`;
  const billSelectionKey = SHARED_BILL_SELECTION_KEY;
  const billsScopedSnapshot = globalEditSnapshot.scopes?.bills || { active: false, context: null };
  const isRecordsEditMode = billsScopedSnapshot.active === true && billsScopedSnapshot.context?.source === 'records';
  const isEditMode = editingBillId !== null;
  const formModeLabel = isRecordsEditMode && isEditMode
    ? 'Edit Mode (From Records)'
    : isEditMode
      ? 'Edit Mode'
      : 'Create Mode';
  const isDirty = useMemo(() => (
    JSON.stringify(form) !== JSON.stringify(baselineSnapshot.form) ||
    comboSearch !== baselineSnapshot.comboSearch
  ), [form, comboSearch, baselineSnapshot]);

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
    const nextLabel = (nextForm.property && String(nextForm.property).trim() !== '') ? nextForm.property : nextForm.dd || '';
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
      setEditLock(draft.editLock && typeof draft.editLock === 'object'
        ? { ...INITIAL_EDIT_LOCK, ...draft.editLock }
        : buildEditLock(draft.form || restoredForm, activeBillType));
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

      const persistedForm = selection.form && typeof selection.form === 'object'
        ? selection.form
        : null;
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
    const persistedForm = !shouldStartFreshFromPropertyRecords && selection?.form && typeof selection.form === 'object'
      ? selection.form
      : null;
    const nextComboSearch = String(
      shouldStartFreshFromPropertyRecords
        ? (contextLabel || '')
        : (selection?.comboSearch || contextLabel || '')
    );
    const nextPropertyListId = Number(
      shouldStartFreshFromPropertyRecords
        ? (contextPropertyListId || 0)
        : (selection?.property_list_id || persistedForm?.property_list_id || contextPropertyListId || 0)
    );
    const nextDdValue = String(
      shouldStartFreshFromPropertyRecords
        ? (ddValue || '')
        : (selection?.dd || persistedForm?.dd || ddValue || '')
    );
    const nextPropertyValue = String(
      shouldStartFreshFromPropertyRecords
        ? (propertyValue || '')
        : (selection?.property || persistedForm?.property || propertyValue || '')
    );
    const nextBillingPeriod = String(
      shouldStartFreshFromPropertyRecords
        ? (context.billing_period || '')
        : (selection?.billing_period || persistedForm?.billing_period || context.billing_period || '')
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

  const {
    data: propertyRecords = [],
    isLoading: loadingPropertyRecords
  } = useQuery({
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

  function applyFormData(data) {
    setForm((prev) => {
      const next = {
        ...prev,
        ...data,
        // Keep selected property identity from the form; upload should only fill bill fields.
        property_list_id: Number(prev.property_list_id || 0),
        dd: prev.dd || '',
        property: prev.property || '',
        billing_period: prev.billing_period || '',
        bill_type: forcedBillType || data.bill_type || detectBillTypeFromData(data)
      };
      formRef.current = next;
      return next;
    });

    const label = (formRef.current.property && String(formRef.current.property).trim() !== '') ? formRef.current.property : formRef.current.dd || '';
    if (label) {
      comboSearchRef.current = label;
      setComboSearch(label);
    }
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

  function handleOptionSelect(record) {
    const selectedPropertyListId = Number(record.property_list_id || record.id || 0);
    if (!isEditMode) {
      setEditingBillId(null);
      setEditLock(INITIAL_EDIT_LOCK);
      window.sessionStorage.removeItem(editDraftKey);
      clearScopedGlobalEditMode('bills');
    }
    setForm((prev) => {
      const next = {
        ...prev,
        bill_type: activeBillType,
        property_list_id: selectedPropertyListId,
        dd: record.dd || '',
        property: record.property || '',
        billing_period: record.billing_period || prev.billing_period || '',
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
      return next;
    });
    const label = getPropertyRecordLabel(record);
    comboSearchRef.current = label;
    setComboSearch(label);
    setIsComboDropdownOpen(false);
  }

  async function handleUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
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
      const normalizedRaw = normalizeUploadData(result);
      const normalized = addUploadFileFallback(
        remapUploadDataToBillType(normalizedRaw, activeBillType),
        file.name || '',
        activeBillType
      );
      const extractionValidation = validateUploadExtraction(normalized, activeBillType);

      if (normalized && extractionValidation.valid) {
        applyFormData(normalized);
        showToast('success', 'Bill scan complete. Form auto-populated.');
        setIsUploadModalOpen(false);
      } else {
        showToast('warning', 'No bill fields detected from this file. You can enter values manually.');
        setIsUploadModalOpen(false);
      }
    } catch (error) {
      showToast('error', String(error?.message || 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function saveBill() {
    const currentForm = formRef.current;
    if (Number(currentForm.property_list_id || 0) <= 0 && String(currentForm.dd || '').trim() === '' && String(currentForm.property || '').trim() === '') {
      showToast('error', 'Select a Property/DD before saving.');
      return false;
    }

    setSaving(true);

    try {
      const shouldUpdate = editingBillId !== null;
      const runWaterUpdate = () => updateBill(
        editingBillId,
        buildUpdatePayloadForType(currentForm, 'water', editLock)
      );
      const runElectricityUpdate = () => updateBill(
        editingBillId,
        buildUpdatePayloadForType(currentForm, 'electricity', editLock)
      );
      const runInternetUpdate = () => updateBill(
        editingBillId,
        buildUpdatePayloadForType(currentForm, 'internet', editLock)
      );
      const runAssociationUpdate = () => updateBill(
        editingBillId,
        buildUpdatePayloadForType(currentForm, 'association_dues', editLock)
      );

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
      showToast('success', result.message || (shouldUpdate ? 'Record updated successfully.' : 'Record saved successfully.'));
      const nextForm = buildPostSaveForm(currentForm, activeBillType);
      const nextLabel = (nextForm.property && String(nextForm.property).trim() !== '')
        ? nextForm.property
        : (nextForm.dd || '');
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
      window.sessionStorage.setItem(billSelectionKey, JSON.stringify({
        form: nextForm,
        property_list_id: Number(nextForm.property_list_id || 0),
        dd: nextForm.dd || '',
        property: nextForm.property || '',
        billing_period: nextForm.billing_period || '',
        comboSearch: nextLabel
      }));
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

  const visibleBillRows = useMemo(() => (
    billRows.filter((row) => shouldIncludeBillRowForType(row, activeBillType))
  ), [billRows, activeBillType]);

  const billTableColumns = useMemo(() => [
    ['display_property_dd', 'Property / DD'],
    ...(BILL_TYPE_FIELDS[activeBillType] || [])
  ], [activeBillType]);

  const filteredBillRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) {
      return visibleBillRows;
    }

    return visibleBillRows.filter((row) => (
      billTableColumns.some(([key]) => {
        const rawValue = key === 'display_property_dd'
          ? (row.property && String(row.property).trim() !== '' ? row.property : row.dd || '')
          : row[key] || '';
        return String(rawValue).toLowerCase().includes(query);
      })
    ));
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
    const nextLabel = (row.property && String(row.property).trim() !== '') ? row.property : row.dd || '';

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

  async function handleViewRecord() {
    setEditingBillId(null);
    setEditLock(INITIAL_EDIT_LOCK);
    window.sessionStorage.removeItem(editDraftKey);
    clearGlobalEditModeIfNotRecords();
    setPanelMode('table');
    setTableSearch('');
    setTablePage(1);
    await refetchBillRows();
    navigate(`${currentBaseRoute}/list`, {
      state: fromPropertyRecordsNext ? { fromPropertyRecordsNext: true } : null
    });
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
    const payload = {
      form,
      property_list_id: Number(form.property_list_id || 0),
      dd: form.dd || '',
      property: form.property || '',
      billing_period: form.billing_period || '',
      comboSearch: comboSearch || form.property || form.dd || ''
    };
    window.sessionStorage.setItem(billSelectionKey, JSON.stringify(payload));
  }

  async function handleBillFlowNavigation(to, options = {}) {
    if (!to) {
      return;
    }
    const { skipUnsavedPrompt = false } = options;
    persistFlowSelectionContext();
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
    const matchedRecord = propertyRecords.find((record) => (
      getPropertyRecordLabel(record).trim().toLowerCase() === normalizedSearch
    ));
    if (matchedRecord) {
      handleOptionSelect(matchedRecord);
    }
  }

  function handleTableSearchChange(event) {
    setTableSearch(event.target.value);
    setTablePage(1);
  }

  return (
    <AppLayout
      title="Bills"
      subtitle="Create and update utility bill records by module."
      contentClassName="shell-content-lock-scroll"
    >
      <Toast toasts={toasts} onDismiss={removeToast} />

      <PaymentForm
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
        isLastFlowStep={isLastFlowStep}
        nextFlowPath={nextFlowPath}
        onNavigateNext={() => handleBillFlowNavigation(nextFlowPath)}
        onNavigateBack={() => handleBillFlowNavigation(finalStepBackPath, { skipUnsavedPrompt: true })}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        nextButtonLabel="Back to Property Records"
      />

      <UploadModal
        open={isUploadModalOpen}
        uploading={uploading}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </AppLayout>
  );
}
