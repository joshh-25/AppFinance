// Finance App File: docs\n8n_code_parser.js
// Purpose: n8n Code node parser for OCR/PDF extracted text.

// Input: one item with JSON payload from Extract/OCR plus hints from webhook
// Output: [{ json: { success: true, data: {...finance schema...}, extracted_text: "..." } }]

const item = items[0] || { json: {} };
const j = item.json || {};

function toText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function pickTextPayload(source) {
  const candidates = [
    source.text,
    source.extracted_text,
    source.content,
    source.raw,
    source.fullText,
    source.extractedText,
    source.ocr_text,
    source.data,
    source.message
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') {
      return c;
    }
  }

  if (source.content?.parts?.[0]?.text) {
    return String(source.content.parts[0].text);
  }

  if (source.pages?.[0]?.text) {
    return String(source.pages[0].text);
  }

  return '';
}

function normalizeNoise(value) {
  return toText(value)
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00E6/g, 'ae') // "Watæ" -> "Watae"
    .replace(/\u00D8/g, 'O')
    .replace(/\u00F8/g, 'o');
}

function normalizeForSearch(value) {
  return normalizeNoise(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const extractedText = normalizeNoise(pickTextPayload(j));
const searchText = normalizeForSearch(extractedText);

function pick(regexes, source = extractedText) {
  for (const re of regexes) {
    const m = source.match(re);
    if (m && m[1]) return String(m[1]).trim();
  }
  return '';
}

function normalizeBillType(value) {
  const s = toText(value).trim().toLowerCase();
  if (s === 'wifi') return 'internet';
  if (s === 'association') return 'association_dues';
  if (['internet', 'water', 'electricity', 'association_dues'].includes(s)) return s;
  return '';
}

function detectBillTypeByText(rawSearchText) {
  if (/(wifi|internet|broadband|fiber|isp)/.test(rawSearchText)) return 'internet';
  if (/(electric|kwh|kilowatt|meralco|meter\s*reading)/.test(rawSearchText)) return 'electricity';
  if (/(association|hoa|dues|condo\s*dues)/.test(rawSearchText)) return 'association_dues';

  // tolerant water markers for noisy OCR
  if (/(water|watae|watr|wat\W*cons|cubic\s*meter|\bm3\b|maynilad|manila\s*water|cms\.)/.test(rawSearchText)) {
    return 'water';
  }

  return '';
}

function toYYYYMM(value) {
  const v = toText(value).trim();
  if (/^\d{4}-\d{2}$/.test(v)) return v;

  const ym = v.match(/^(\d{4})[/-](\d{1,2})$/);
  if (ym) return `${ym[1]}-${String(Number(ym[2])).padStart(2, '0')}`;

  const monthText = v.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i);
  if (!monthText) return '';

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  return `${monthText[2]}-${monthMap[monthText[1].toLowerCase().slice(0, 3)]}`;
}

function normalizeDate(value) {
  const s = toText(value).trim();
  if (s === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const ymd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${String(Number(ymd[2])).padStart(2, '0')}-${String(Number(ymd[3])).padStart(2, '0')}`;

  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(Number(dmy[2])).padStart(2, '0')}-${String(Number(dmy[1])).padStart(2, '0')}`;

  const dMonY = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-,\s]+(\d{4})$/);
  if (dMonY) {
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[dMonY[2].toLowerCase().slice(0, 3)];
    if (month) return `${dMonY[3]}-${month}-${String(Number(dMonY[1])).padStart(2, '0')}`;
  }

  const monDY = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monDY) {
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[monDY[1].toLowerCase().slice(0, 3)];
    if (month) return `${monDY[3]}-${month}-${String(Number(monDY[2])).padStart(2, '0')}`;
  }

  return '';
}

function cleanAmount(value) {
  const raw = toText(value)
    .replace(/(\d)\s+(?=\d{3}(?:\D|$))/g, '$1')
    .replace(/,\s+(?=\d{3}(?:\D|$))/g, ',')
    .replace(/[\s,]/g, '')
    .replace(/^(php|usd|eur|gbp|sgd|aud|cad|p)/i, '')
    .replace(/[^\d.\-]/g, '')
    .trim();

  if (/^-?\d+(?:\.\d{2})$/.test(raw)) return raw;
  return '';
}

function findAmountInLine(line) {
  const matches = String(line).match(/-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|-?\d+\.\d{2}/g) || [];
  if (matches.length === 0) return '';
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const cleaned = cleanAmount(matches[i]);
    if (cleaned !== '') return cleaned;
  }
  return '';
}

function pickWaterAmountFromText(sourceText) {
  const direct = pick([
    /\bTotal\s*Balance\s*Due[^\n\d\-]*([0-9]{1,3}(?:[,\s]\d{3})*\.\d{2}|[0-9]+\.\d{2})/i,
    /\bAmount\s*Due[^\n\d\-]*([0-9]{1,3}(?:[,\s]\d{3})*\.\d{2}|[0-9]+\.\d{2})/i,
    /\bCurrent\s*Charges[^\n\d\-]*([0-9]{1,3}(?:[,\s]\d{3})*\.\d{2}|[0-9]+\.\d{2})/i,
    /\bWater(?:\s*Consumption|\s*Cons\.?|\s*Amount)?[^\n\d\-]*([0-9]{1,3}(?:[,\s]\d{3})*\.\d{2}|[0-9]+\.\d{2})/i
  ], sourceText);

  const cleanedDirect = cleanAmount(direct);
  if (cleanedDirect !== '') return cleanedDirect;

  // line-based fallback for noisy OCR
  const lines = sourceText.split('\n');
  for (const line of lines) {
    const normalizedLine = normalizeForSearch(line);
    if (/(water|watae|watr|wat\W*cons|cms\.)/.test(normalizedLine)) {
      const amount = findAmountInLine(line);
      if (amount !== '') return amount;
    }
  }

  return '';
}

function pickDueDateFromText(sourceText) {
  const raw = pick([
    /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([^\n]+)/i,
    /\bDue\s*Date[:\s-]*([^\n]+)/i,
    /\bDue\s*Date\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
    /\bDue\s*Date\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i
  ], sourceText);

  return normalizeDate(raw);
}

const hintedBillType = normalizeBillType(
  j.bill_type ||
  j.bill_type_hint ||
  j.utility_type ||
  j.module ||
  j.context?.bill_type
);

// Use explicit webhook/module hint first. Detect from OCR only if hint is missing.
const billType = hintedBillType || detectBillTypeByText(searchText) || 'water';

const billingPeriod = toYYYYMM(
  j.billing_period ||
  j.billing_period_hint ||
  pick([
    /\bBilling\s*Period[:\s]*([A-Za-z]{3,9}\s+\d{4})\b/i,
    /\bBilling\s*Period[:\s]*(\d{4}[/-]\d{1,2})\b/i,
    /\bPeriod[:\s]*([A-Za-z]{3,9}\s+\d{4})\b/i
  ])
);

const dd = toText(j.dd || j.dd_hint || '').trim() || pick([
  /\bProperty\/DD[:\s]*([A-Za-z0-9 \-]+)/i,
  /\bDD[:\s]*([A-Za-z0-9 \-]+)/i,
  /\bCustomer\s*Name[:\s-]*([^\n]+)/i
]);

const property = toText(j.property || j.property_hint || '').trim() || pick([
  /\bProperty[:\s]*([A-Za-z0-9 \-]+)/i,
  /\bCondo[:\s]*([A-Za-z0-9 \-]+)/i,
  /\bTHE\s+PALLADIUM\b/i
]);

const dueDate = pickDueDateFromText(extractedText);

const genericAmount = cleanAmount(pick([
  /\bAmount\s*Due[:\s]*([^\n]+)/i,
  /\bTotal\s*(?:Amount)?[:\s]*([^\n]+)/i
]));

const waterAmount = cleanAmount(
  toText(j.water_amount || j.total_balance_due).trim() ||
  pickWaterAmountFromText(extractedText) ||
  genericAmount
);

const waterAccountNo = toText(
  j.water_account_no ||
  pick([
    /\bWater\s*Account\s*No\.?[:\s]*([A-Za-z0-9\-]+)/i,
    /\bCustomer\s*Acct\.?\s*No\.?[:\s]*([A-Za-z0-9\-]+)/i
  ])
).trim();

const internetAccountNo = toText(
  j.internet_account_no ||
  pick([
    /\bInternet\s*Account\s*No\.?[:\s]*([A-Za-z0-9\-]+)/i,
    /\bAccount\s*(?:No|Number)\.?\s*[:\s]*([A-Za-z0-9\-]+)/i
  ])
).trim();

const electricityAccountNo = toText(
  j.electricity_account_no ||
  pick([
    /\bElectricity\s*Account\s*No\.?[:\s]*([A-Za-z0-9\-]+)/i,
    /\bMeter\s*No\.?[:\s]*([A-Za-z0-9\-]+)/i,
    /\bAccount\s*(?:No|Number)\.?\s*[:\s]*([A-Za-z0-9\-]+)/i
  ])
).trim();

const status = toText(
  j.payment_status ||
  j.water_payment_status ||
  j.electricity_payment_status ||
  j.wifi_payment_status ||
  pick([
    /\bPayment\s*Status[:\s]*([A-Za-z ]+)/i,
    /\bunpaid\b/i,
    /\bpaid\b/i
  ])
).trim();

const normalizedStatus = status !== ''
  ? (/paid/i.test(status) ? 'Paid' : 'Unpaid')
  : '';

const data = {
  bill_type: billType,
  billing_period: billingPeriod,
  dd,
  property,
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

if (billType === 'internet') {
  data.internet_provider = toText(j.internet_provider).trim();
  data.internet_account_no = internetAccountNo;
  data.wifi_amount = cleanAmount(toText(j.wifi_amount || j.amount || genericAmount));
  data.wifi_due_date = normalizeDate(toText(j.wifi_due_date || dueDate));
  data.wifi_payment_status = toText(j.wifi_payment_status || normalizedStatus).trim();
} else if (billType === 'electricity') {
  data.electricity_account_no = electricityAccountNo;
  data.electricity_amount = cleanAmount(toText(j.electricity_amount || j.total_amount_due || j.amount || genericAmount));
  data.electricity_due_date = normalizeDate(toText(j.electricity_due_date || dueDate));
  data.electricity_payment_status = toText(j.electricity_payment_status || normalizedStatus).trim();
} else if (billType === 'association_dues') {
  data.association_dues = cleanAmount(toText(j.association_dues || j.amount || genericAmount));
  data.association_due_date = normalizeDate(toText(j.association_due_date || dueDate));
  data.association_payment_status = toText(j.association_payment_status || normalizedStatus).trim();
} else {
  // Water: never map unit/address/filename into water_account_no.
  data.water_account_no = waterAccountNo;
  data.water_amount = waterAmount;
  data.water_due_date = normalizeDate(toText(j.water_due_date || dueDate));

  const looksLikeWaterDoc = detectBillTypeByText(searchText) === 'water';
  data.water_payment_status = toText(j.water_payment_status || normalizedStatus).trim();
  if (data.water_payment_status === '' && (data.water_amount !== '' || data.water_due_date !== '' || looksLikeWaterDoc)) {
    data.water_payment_status = 'Unpaid';
  }
}

return [{
  json: {
    success: true,
    data,
    extracted_text: extractedText
  }
}];
