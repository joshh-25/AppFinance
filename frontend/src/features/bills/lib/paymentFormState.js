import { cleanTextValue } from '../../../shared/lib/billPropertyUtils.js';
import { validateUploadExtraction } from '../../../shared/lib/ocrParser.js';

export const ROWS_PER_PAGE = 10;
export const EDIT_DRAFT_KEY_PREFIX = 'finance-bill-edit-draft:';

export const INITIAL_FORM = {
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

export const INITIAL_EDIT_LOCK = {
  property_list_id: 0,
  dd: '',
  property: '',
  due_period: '',
  bill_type: ''
};

export const BILL_TYPE_FIELDS = {
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

export const BILL_TYPE_RECORD_FIELDS = {
  internet: ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'],
  water: ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'],
  electricity: ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'],
  association_dues: ['association_dues', 'association_due_date', 'association_payment_status']
};

export const SHARED_BILL_SAVE_FIELDS = [
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

export const BILL_MODE_TO_TYPE = {
  water: 'water',
  electricity: 'electricity',
  wifi: 'internet',
  association: 'association_dues'
};

export const BILL_FLOW_MODES = ['wifi', 'water', 'electricity', 'association'];

export const BILL_TYPE_UPLOAD_LABELS = {
  internet: 'WiFi',
  water: 'Water',
  electricity: 'Electricity',
  association_dues: 'Association'
};

export const ACCOUNT_LOOKUP_FIELD_BY_BILL_TYPE = {
  internet: 'internet_account_no',
  water: 'water_account_no',
  electricity: 'electricity_account_no'
};

export const BILL_DUE_DATE_FIELDS = new Set([
  'wifi_due_date',
  'water_due_date',
  'electricity_due_date',
  'association_due_date'
]);

export const ALL_TYPE_FIELDS = [
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

export function deriveDuePeriodFromDueDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(raw)) {
    return raw.slice(0, 7);
  }
  return '';
}

export function rowHasBillTypeData(row, billType) {
  const fields = BILL_TYPE_RECORD_FIELDS[billType] || [];
  return fields.some((field) => cleanTextValue(row?.[field]) !== '');
}

export function shouldIncludeBillRowForType(row, billType) {
  if (!row || typeof row !== 'object') {
    return false;
  }

  if (rowHasBillTypeData(row, billType)) {
    return true;
  }

  return normalizeBillTypeValue(row.bill_type) === billType;
}

export function getContextBillIdByType(context, billType) {
  const toPositiveNumber = (value) => {
    const parsed = Number(value || 0);
    return parsed > 0 ? parsed : 0;
  };

  switch (billType) {
    case 'internet':
      return toPositiveNumber(context.internet_bill_id || context.wifi_bill_id || context.editing_bill_id);
    case 'water':
      return toPositiveNumber(context.water_bill_id || context.editing_bill_id);
    case 'electricity':
      return toPositiveNumber(context.electricity_bill_id || context.editing_bill_id);
    case 'association_dues':
      return toPositiveNumber(
        context.association_bill_id || context.association_dues_bill_id || context.editing_bill_id
      );
    default:
      return 0;
  }
}

export function mapRecordsContextToForm(context, billType) {
  const base = { ...INITIAL_FORM, bill_type: billType };
  if (!context) {
    return base;
  }

  SHARED_BILL_SAVE_FIELDS.forEach((field) => {
    if (context[field] !== undefined && context[field] !== null) {
      base[field] = context[field];
    }
  });

  Object.values(BILL_TYPE_RECORD_FIELDS).forEach((fields) => {
    fields.forEach((field) => {
      if (context[field] !== undefined && context[field] !== null) {
        base[field] = context[field];
      }
    });
  });

  return base;
}

export function buildEditLock(form, billType) {
  return {
    property_list_id: form.property_list_id,
    dd: form.dd,
    property: form.property,
    due_period: form.due_period,
    bill_type: billType
  };
}

export function buildClearedFormForBillType(billType) {
  return { ...INITIAL_FORM, bill_type: billType };
}

export function buildUpdatePayloadForType(form, type, editLock = INITIAL_EDIT_LOCK) {
  const payload = { bill_type: type };
  SHARED_BILL_SAVE_FIELDS.forEach((field) => {
    payload[field] = form[field];
  });
  const mappedType = type === 'internet' ? 'wifi' : type;
  const targetFields = BILL_TYPE_FIELDS[mappedType] || BILL_TYPE_FIELDS[type] || [];
  targetFields.forEach(([key]) => {
    payload[key] = form[key];
  });
  return {
    ...payload,
    target_property_list_id: Number(editLock?.property_list_id || 0),
    target_dd: editLock?.dd || '',
    target_property: editLock?.property || '',
    target_due_period: editLock?.due_period || '',
    target_bill_type: editLock?.bill_type || type
  };
}

export function buildTabScopedPayload(form, type) {
  return buildUpdatePayloadForType(form, type);
}

export function buildPropertyRecordContextFromBillForm(form) {
  const source = form && typeof form === 'object' ? form : INITIAL_FORM;
  return {
    property_list_id: Number(source.property_list_id || 0),
    dd: source.dd || '',
    property: source.property || '',
    due_period: source.due_period || '',
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

export function toFriendlyErrorMessage(error) {
  const message = error?.message || String(error);
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists')) {
    return 'A record with this DD and Due Period already exists.';
  }
  return message;
}

export function getPreSaveBillError(form, billType) {
  const propertySelected =
    Number(form?.property_list_id || 0) > 0 ||
    String(form?.dd || '').trim() !== '' ||
    String(form?.property || '').trim() !== '';
  if (!propertySelected) {
    return 'Choose the property first before saving this bill.';
  }

  const validation = validateUploadExtraction(form, billType);
  if (!validation.valid) {
    return validation.message || 'Complete the missing bill details before saving.';
  }

  return '';
}

export function getBillTypeUploadLabel(type) {
  return BILL_TYPE_UPLOAD_LABELS[type] || String(type || '').replace(/_/g, ' ');
}
