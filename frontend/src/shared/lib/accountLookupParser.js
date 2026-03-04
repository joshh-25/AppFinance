// Finance App File: frontend/src/shared/lib/accountLookupParser.js
// Purpose: Parse monthly Excel/CSV billing files into account-to-property lookup rows.

const MONTH_TOKEN_MAP = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12'
};

const ACCOUNT_HINTS = ['account', 'acct', 'meter', 'consumer', 'service', 'reference', 'ref'];
const ELECTRICITY_HINTS = ['electricity', 'electric', 'elec', 'kuryente', 'power'];
const WATER_HINTS = ['water', 'tubig'];
const INTERNET_HINTS = ['wifi', 'wi-fi', 'internet', 'broadband'];

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(header) {
  return cleanText(header)
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

export function normalizeAccountNumberForLookup(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeUtilityType(value) {
  const normalized = cleanText(value).toLowerCase();
  if (normalized === 'wifi') {
    return 'internet';
  }
  if (normalized === 'internet' || normalized === 'water' || normalized === 'electricity') {
    return normalized;
  }
  return '';
}

export function detectBillingMonthFromText(value) {
  const source = cleanText(value).toLowerCase();
  if (source === '') {
    return '';
  }

  const isoLike = source.match(/(20\d{2})[-_/](0?[1-9]|1[0-2])/);
  if (isoLike) {
    return `${isoLike[1]}-${String(Number(isoLike[2])).padStart(2, '0')}`;
  }

  const monthYear = source.match(
    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(20\d{2})\b/
  );
  if (monthYear) {
    const month = MONTH_TOKEN_MAP[monthYear[1]] || '';
    if (month !== '') {
      return `${monthYear[2]}-${month}`;
    }
  }

  return '';
}

function hasAccountHint(normalizedHeader) {
  return ACCOUNT_HINTS.some((hint) => normalizedHeader.includes(hint));
}

function detectUtilityFromHeader(normalizedHeader) {
  if (ELECTRICITY_HINTS.some((hint) => normalizedHeader.includes(hint))) {
    return 'electricity';
  }
  if (WATER_HINTS.some((hint) => normalizedHeader.includes(hint))) {
    return 'water';
  }
  if (INTERNET_HINTS.some((hint) => normalizedHeader.includes(hint))) {
    return 'internet';
  }
  return '';
}

function scorePropertyHeader(normalizedHeader) {
  if (normalizedHeader === 'property name') {
    return 100;
  }
  if (normalizedHeader.includes('property')) {
    return 80;
  }
  if (normalizedHeader.includes('unit') && normalizedHeader.includes('name')) {
    return 70;
  }
  if (normalizedHeader === 'unit' || normalizedHeader === 'apartment' || normalizedHeader === 'address') {
    return 60;
  }
  return 0;
}

function resolveHeaders(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      propertyHeader: '',
      utilityHeaders: {}
    };
  }

  const firstRow = rows.find((row) => row && typeof row === 'object');
  if (!firstRow) {
    return {
      propertyHeader: '',
      utilityHeaders: {}
    };
  }

  const headers = Object.keys(firstRow);
  let propertyHeader = '';
  let propertyScore = 0;
  const utilityHeaders = {};

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    const currentScore = scorePropertyHeader(normalized);
    if (currentScore > propertyScore) {
      propertyScore = currentScore;
      propertyHeader = header;
    }

    const utility = detectUtilityFromHeader(normalized);
    if (utility === '') {
      return;
    }

    if (!hasAccountHint(normalized) && !normalized.endsWith('no') && !normalized.endsWith('#')) {
      return;
    }

    if (!utilityHeaders[utility]) {
      utilityHeaders[utility] = [];
    }
    utilityHeaders[utility].push(header);
  });

  return {
    propertyHeader,
    utilityHeaders
  };
}

export function extractAccountLookupRowsFromSheetRows(rows, meta = {}) {
  const sourceFile = cleanText(meta.source_file);
  const sheetName = cleanText(meta.sheet_name);
  const explicitBillingMonth = detectBillingMonthFromText(meta.billing_month || '');
  const inferredBillingMonth = detectBillingMonthFromText(`${sourceFile} ${sheetName}`);
  const billingMonth = explicitBillingMonth || inferredBillingMonth;

  const { propertyHeader, utilityHeaders } = resolveHeaders(rows);
  if (propertyHeader === '') {
    return [];
  }

  const seen = new Set();
  const output = [];

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') {
      return;
    }

    const propertyName = cleanText(row[propertyHeader]);
    if (propertyName === '') {
      return;
    }

    Object.entries(utilityHeaders).forEach(([utilityType, headers]) => {
      headers.forEach((header) => {
        const accountNumber = cleanText(row[header]);
        const normalizedAccount = normalizeAccountNumberForLookup(accountNumber);
        if (normalizedAccount === '') {
          return;
        }

        const dedupeKey = `${normalizedAccount}|${utilityType}|${propertyName.toLowerCase()}|${billingMonth}`;
        if (seen.has(dedupeKey)) {
          return;
        }
        seen.add(dedupeKey);

        output.push({
          account_number: accountNumber,
          utility_type: utilityType,
          property_name: propertyName,
          billing_month: billingMonth,
          source_file: sourceFile,
          sheet_name: sheetName
        });
      });
    });
  });

  return output;
}

export async function parseAccountLookupFiles(files) {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.length === 0) {
    return {
      entries: [],
      stats: {
        files: 0,
        sheets: 0,
        rows: 0
      }
    };
  }

  const XLSX = await import('xlsx');
  let sheetCount = 0;
  let rowCount = 0;
  const allEntries = [];

  for (const file of selectedFiles) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false });
    const sheetNames = Array.isArray(workbook?.SheetNames) ? workbook.SheetNames : [];

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets?.[sheetName];
      if (!worksheet) {
        continue;
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
      sheetCount += 1;
      rowCount += Array.isArray(rows) ? rows.length : 0;
      const extracted = extractAccountLookupRowsFromSheetRows(rows, {
        source_file: file.name,
        sheet_name: sheetName
      });
      allEntries.push(...extracted);
    }
  }

  return {
    entries: allEntries,
    stats: {
      files: selectedFiles.length,
      sheets: sheetCount,
      rows: rowCount
    }
  };
}

