export const UPLOAD_REQUIRED_FIELDS_BY_TYPE = {
    internet: ['wifi_amount', 'internet_account_no', 'wifi_due_date', 'wifi_payment_status'],
    water: ['water_amount', 'water_account_no', 'water_due_date', 'water_payment_status'],
    electricity: ['electricity_amount', 'electricity_account_no', 'electricity_due_date', 'electricity_payment_status'],
    association_dues: ['association_dues', 'association_due_date']
};

export const UPLOAD_FIELD_LABELS = {
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
    return String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function canonicalUploadKey(key) {
    return String(key ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
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

function normalizeBillingPeriodValue(value) {
    const raw = cleanTextValue(value);
    if (raw === '') {
        return '';
    }

    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) {
        return raw;
    }

    const yearMonth = raw.match(/^(\d{4})[/-](0?[1-9]|1[0-2])$/);
    if (yearMonth) {
        return `${yearMonth[1]}-${String(Number(yearMonth[2])).padStart(2, '0')}`;
    }

    const monthYear = raw.match(/^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})$/i);
    if (monthYear) {
        const monthMap = {
            jan: '01', january: '01',
            feb: '02', february: '02',
            mar: '03', march: '03',
            apr: '04', april: '04',
            may: '05',
            jun: '06', june: '06',
            jul: '07', july: '07',
            aug: '08', august: '08',
            sep: '09', sept: '09', september: '09',
            oct: '10', october: '10',
            nov: '11', november: '11',
            dec: '12', december: '12'
        };
        const monthToken = monthYear[1].toLowerCase();
        if (monthMap[monthToken]) {
            return `${monthYear[2]}-${monthMap[monthToken]}`;
        }
    }

    const normalizedDate = normalizeDateValue(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        return normalizedDate.slice(0, 7);
    }

    return '';
}

function normalizeAmountValue(value) {
    const raw = cleanTextValue(value);
    if (raw === '') {
        return '';
    }
    const normalizedGrouping = raw
        .replace(/(\d)\s+(?=\d{3}(?:\D|$))/g, '$1')
        .replace(/,\s+(?=\d{3}(?:\D|$))/g, ',');
    const tokens = raw.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2}/g);
    const normalizedTokens = (
        tokens ||
        normalizedGrouping.match(/-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|-?\d+\.\d{2}/g) ||
        []
    )
        .map((token) => token.replace(/[,\s]/g, ''))
        .filter((token) => /^-?\d+(?:\.\d{2})$/.test(token));
    if (normalizedTokens.length > 0) {
        return normalizedTokens[normalizedTokens.length - 1];
    }
    const cleaned = normalizedGrouping
        .replace(/[,\s]/g, '')
        .replace(/^(php|usd|eur|gbp|sgd|aud|cad|p)/i, '')
        .replace(/[^\d.-]/g, '')
        .trim();
    return cleaned || raw;
}

function normalizePaymentStatusValue(value) {
    const raw = cleanTextValue(value);
    if (raw === '') {
        return '';
    }

    const normalizedRaw = raw.replace(/\s+/g, ' ').trim();
    const knownStatus = normalizedRaw.match(/\b(unpaid|paid|overdue|pending|partial)\b/i);
    if (knownStatus && knownStatus[1]) {
        const token = knownStatus[1].toLowerCase();
        return token.charAt(0).toUpperCase() + token.slice(1);
    }

    const trimmed = normalizedRaw.split(/\b(?:reference|ref(?:erence)?\s*no\.?)\b/i)[0].trim();
    return trimmed || normalizedRaw;
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

    const parsingText = text
        .replace(/\r/g, '\n')
        // OCR often glues tokens like "2026Due Date"; recover separators for pattern matching.
        .replace(/([0-9])([A-Za-z])/g, '$1 $2');
    const normalizedText = parsingText.replace(/\s+/g, ' ');

    const inferredBillType = (() => {
        const lowered = normalizedText.toLowerCase();
        if (/\b(electricity|electric bill|kwh|kilowatt)\b/.test(lowered)) {
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

    const customerName = pickTextMatch(parsingText, [/\bCustomer\s*Name[:\s-]*([^\n]+?)(?:\s+Business\s*Style[:\s-]|$)/i]);
    const addressLine = pickTextMatch(parsingText, [/\bAddress[:\s-]*([^\n]+?)(?:\s+TIN\s*\(|$)/i]);
    const propertyFromAddress = cleanTextValue(addressLine.split(',')[0] || '');

    return {
        bill_type:
            pickTextMatch(parsingText, [/\bBill\s*Type[:\s-]*([A-Za-z_ ]+)/i, /\bUtility\s*Type[:\s-]*([A-Za-z_ ]+)/i]) ||
            inferredBillType,
        dd:
            customerName || pickTextMatch(parsingText, [/\bProperty\/DD[:\s-]*([A-Za-z0-9 -]+)/i, /\bDD[:\s-]*([A-Za-z0-9 -]+)/i]),
        property: propertyFromAddress || pickTextMatch(parsingText, [/\bProperty[:\s-]*([A-Za-z0-9 -]+)/i]),
        internet_provider: pickTextMatch(parsingText, [/\bInternet\s*Provider[:\s-]*([^\n]+)/i, /\bISP[:\s-]*([^\n]+)/i, /\bProvider[:\s-]*([^\n]+)/i]),
        internet_account_no: pickTextMatch(parsingText, [
            /\bInternet\s*Account\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i,
            /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i,
            /\bAccount\s*(?:No|Number)\.?\s*[:\s-]*([A-Za-z0-9-]+)/i
        ]),
        wifi_amount: pickTextMatch(parsingText, [/\bAmount\s*Due[:\s-]*([^\n]+)/i, /\bTotal(?:\s*Amount)?[:\s-]*([^\n]+)/i]),
        wifi_due_date: pickTextMatch(parsingText, [/\bDue\s*Date[:\s-]*([^\n]+)/i]),
        wifi_payment_status: pickTextMatch(parsingText, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
        water_account_no: pickTextMatch(parsingText, [
            /\bWater\s*Account\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i,
            /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i
        ]),
        water_amount: pickTextMatch(parsingText, [
            /\bWater\s*Cons(?:umption)?[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
            /\bWater(?:\s*Amount)?[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
            /\bCurrent\s*Charges[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
            /\bAmount\s*Due[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i,
            /\bTotal\s*Balance\s*Due[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i
        ]),
        water_due_date: pickTextMatch(parsingText, [
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bDue\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bDue\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
            /\bDue\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
        ]),
        water_payment_status: pickTextMatch(parsingText, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
        electricity_account_no: pickTextMatch(parsingText, [
            /\bElectricity\s*Account\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i,
            /\bCustomer\s*Acct\.?\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i,
            /\bCustomer\s*Acct\.?\s*No\.?\s*[:\s-]*([A-Za-z0-9-]+)/i,
            /\bMeter\s*No\.?[:\s-]*([A-Za-z0-9-]+)/i
        ]),
        electricity_amount: pickTextMatch(parsingText, [
            /\bTOTAL\s*CURRENT\s*BILL\s*AMOUNT[^\d-]*([0-9][0-9,]*\.\d{2})/i,
            /\bCurrent\s*Charges[^\d-]*([0-9][0-9,]*\.\d{2})/i,
            /\bTotal\s*Amount\s*Due[^\d-]*([0-9][0-9,]*\.\d{2})/i,
            /\bAmount\s*Due[^\d-]*([0-9][0-9,]*\.\d{2})/i
        ]),
        electricity_total_amount_due: pickTextMatch(parsingText, [
            /\bTotal\s*Amount\s*Due[^\d-]*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2}))/i
        ]),
        electricity_due_date: pickTextMatch(parsingText, [
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bDue\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bDue\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
            /\bDue\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
        ]),
        electricity_payment_status: pickTextMatch(parsingText, [/\bPayment\s*Status[:\s-]*([^\n]+)/i]),
        association_dues: pickTextMatch(parsingText, [
            /\bAssociation\s*Dues[^\n]*?([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/i
        ]),
        association_due_date: pickTextMatch(parsingText, [
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bDue\s*Date[:\s-]*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bDue\s*Date\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bDue\s*Date[:\s-]*(\d{4}-\d{2}-\d{2})/i,
            /\bCurrent\s*Bill\s*Due\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
            /\bDue\s*Date[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
        ]),
        association_payment_status: pickTextMatch(parsingText, [/\bPayment\s*Status[:\s-]*([^\n]+)/i])
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
    const next = data && typeof data === 'object' ? { ...data } : {};
    const name = cleanTextValue(filename);
    if (name === '') {
        return next;
    }

    const genericAccount = parseAccountNoFromFilename(name);

    if (billType === 'water') {
        if (
            cleanTextValue(next.water_payment_status) === '' &&
            (cleanTextValue(next.water_amount) !== '' ||
                cleanTextValue(next.water_due_date) !== '' ||
                cleanTextValue(next.water_account_no) !== '')
        ) {
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
        return JSON.parse(
            value
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim()
        );
    } catch (error) {
        return value;
    }
}

export function detectBillTypeFromData(data) {
    if (!data || typeof data !== 'object') {
        return 'water';
    }

    const hinted = cleanTextValue(data.bill_type).toLowerCase();
    const hintedType = hinted.includes('association')
        ? 'association_dues'
        : hinted.includes('electric')
          ? 'electricity'
          : (hinted.includes('internet') || hinted.includes('wifi'))
            ? 'internet'
            : hinted.includes('water')
              ? 'water'
              : '';

    if (hintedType !== '') {
        return hintedType;
    }

    const scoreByType = Object.keys(UPLOAD_REQUIRED_FIELDS_BY_TYPE).reduce((acc, type) => {
        const fields = UPLOAD_REQUIRED_FIELDS_BY_TYPE[type] || [];
        acc[type] = fields.reduce((sum, field) => sum + (cleanTextValue(data[field]) !== '' ? 1 : 0), 0);
        return acc;
    }, {});

    let bestType = '';
    let bestScore = 0;
    Object.entries(scoreByType).forEach(([type, score]) => {
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    });

    if (bestScore > 0) {
        if (hintedType !== '' && scoreByType[hintedType] === bestScore) {
            return hintedType;
        }
        const topTypes = Object.keys(scoreByType).filter((type) => scoreByType[type] === bestScore);
        if (topTypes.length > 1) {
            if (
                topTypes.includes('association_dues') &&
                cleanTextValue(data.association_dues) !== ''
            ) {
                return 'association_dues';
            }
            if (
                topTypes.includes('electricity') &&
                (cleanTextValue(data.electricity_account_no) !== '' || cleanTextValue(data.electricity_due_date) !== '')
            ) {
                return 'electricity';
            }
            if (topTypes.includes('water') && cleanTextValue(data.water_account_no) !== '') {
                return 'water';
            }
            if (topTypes.includes('internet') && cleanTextValue(data.internet_provider) !== '') {
                return 'internet';
            }

            const priority = ['electricity', 'water', 'internet', 'association_dues'];
            const preferred = priority.find((type) => topTypes.includes(type));
            if (preferred) {
                return preferred;
            }
        }
        return bestType;
    }

    return 'water';
}

export function validateUploadExtraction(data, requiredBillType) {
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
    const moduleMismatch =
        detectedBillType !== billType
            ? ` Detected bill type looks like ${detectedBillType.replace('_', ' ')}; upload it from the matching module tab.`
            : '';
    return {
        valid: false,
        message: `We couldn't clearly read the required amounts or dates from this document.${moduleMismatch} Expected fields: ${requiredLabels.join(', ')}`
    };
}

export function normalizeUploadData(input) {
    let data = input;
    let envelope = safeJsonParse(input);
    if (Array.isArray(envelope) && envelope.length > 0) {
        envelope = envelope[0];
    }
    const envelopeText = envelope && typeof envelope === 'object' ? extractUploadText(envelope) : '';

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
    const filenameAccountNo = parseAccountNoFromFilename(pickUploadValue(lookup, ['filename', 'file_name', 'name'], ''));
    const resolvedBillType = pickUploadValue(
        lookup,
        ['bill_type', 'billType', 'utility_type'],
        parsedFromText.bill_type || ''
    );

    const wifiAmount = normalizeAmountValue(
        pickUploadValue(
            lookup,
            ['wifi_amount', 'wifiAmount', 'internet_amount', 'amount', 'amount_due'],
            parsedFromText.wifi_amount || ''
        )
    );
    const parsedWaterAmount = normalizeAmountValue(parsedFromText.water_amount || '');
    const waterAmount = parsedWaterAmount || normalizeAmountValue(
        pickUploadValue(
            lookup,
            [
                'water_amount',
                'waterAmount',
                'total_balance_due',
                'totalBalanceDue',
                'amount',
                'amount_due',
                'total_amount_due',
                'totalAmountDue'
            ],
            parsedFromText.water_amount || ''
        )
    );
    const totalAmountDueValue = normalizeAmountValue(
        parsedFromText.electricity_total_amount_due ||
        pickUploadValue(lookup, ['total_amount_due', 'totalAmountDue', 'amount_due', 'amountDue'], '')
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
    const electricityAmount =
        electricityAmountFromPayload !== '' ? electricityAmountFromPayload : electricityAmountCandidates[0] || '';
    const associationDues = normalizeAmountValue(
        pickUploadValue(lookup, ['association_dues', 'associationDues'], parsedFromText.association_dues || '')
    );
    const normalizedTotalAmountDue = normalizeAmountValue(
        parsedFromText.electricity_total_amount_due ||
        pickUploadValue(lookup, ['total_amount_due', 'totalAmountDue', 'amount_due', 'amountDue', 'subtotal'], '')
    );
    const electricityDueDate = normalizeDateValue(
        parsedFromText.electricity_due_date ||
        pickUploadValue(
            lookup,
            [
                'electricity_due_date',
                'electricityDueDate',
                'current_bill_due_date',
                'currentBillDueDate',
                'due_date',
                'dueDate'
            ],
            ''
        )
    );
    const associationDueDate = normalizeDateValue(
        pickUploadValue(lookup, ['association_due_date', 'associationDueDate'], parsedFromText.association_due_date || '')
    );
    const wifiPaymentStatus = normalizePaymentStatusValue(
        pickUploadValue(
            lookup,
            ['wifi_payment_status', 'wifiPaymentStatus', 'payment_status'],
            parsedFromText.wifi_payment_status || ''
        )
    );
    const waterPaymentStatus = normalizePaymentStatusValue(
        pickUploadValue(
            lookup,
            ['water_payment_status', 'waterPaymentStatus', 'payment_status'],
            parsedFromText.water_payment_status || ''
        )
    );
    const electricityPaymentStatus = normalizePaymentStatusValue(
        pickUploadValue(
            lookup,
            ['electricity_payment_status', 'electricityPaymentStatus', 'payment_status'],
            parsedFromText.electricity_payment_status || ''
        )
    );
    const associationPaymentStatus = normalizePaymentStatusValue(
        pickUploadValue(
            lookup,
            ['association_payment_status', 'associationPaymentStatus', 'payment_status'],
            parsedFromText.association_payment_status || ''
        )
    );
    const billingPeriod = normalizeBillingPeriodValue(
        pickUploadValue(
            lookup,
            [
                'billing_period',
                'billingPeriod',
                'billing_month',
                'billingMonth',
                'billing_date',
                'billingDate',
                'bill_date',
                'billDate',
                'statement_date',
                'statementDate'
            ],
            ''
        )
    ) || normalizeBillingPeriodValue(parsedFromText.billing_period || '')
      || normalizeBillingPeriodValue(pickUploadValue(lookup, ['electricity_billing_date', 'electricityBillingDate'], ''))
      || normalizeBillingPeriodValue(electricityDueDate)
      || normalizeBillingPeriodValue(associationDueDate);

    let result = {
        bill_type: resolvedBillType,
        property_list_id: Number(pickUploadValue(lookup, ['property_list_id', 'propertyListId'], '0')) || 0,
        dd: pickUploadValue(lookup, ['dd', 'property_dd', 'propertydd'], parsedFromText.dd || ''),
        property: pickUploadValue(lookup, ['property', 'property_name', 'propertyName'], parsedFromText.property || ''),
        billing_period: billingPeriod,
        unit_owner: pickUploadValue(lookup, ['unit_owner', 'unitOwner', 'tenant_name', 'tenantName']),
        classification: pickUploadValue(lookup, ['classification']),
        deposit: normalizeAmountValue(pickUploadValue(lookup, ['deposit'])),
        rent: normalizeAmountValue(pickUploadValue(lookup, ['rent'])),
        internet_provider: pickUploadValue(
            lookup,
            ['internet_provider', 'internetProvider', 'provider'],
            parsedFromText.internet_provider || ''
        ),
        internet_account_no: pickUploadValue(
            lookup,
            ['internet_account_no', 'internetAccountNo', 'account_no', 'accountNo'],
            parsedFromText.internet_account_no || ''
        ),
        wifi_amount: wifiAmount,
        wifi_due_date: normalizeDateValue(
            pickUploadValue(lookup, ['wifi_due_date', 'wifiDueDate', 'internet_due_date'], parsedFromText.wifi_due_date || '')
        ),
        wifi_payment_status: wifiPaymentStatus || (wifiAmount !== '' ? 'Unpaid' : ''),
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
        water_payment_status: waterPaymentStatus || (waterAmount !== '' ? 'Unpaid' : ''),
        electricity_account_no:
            parsedFromText.electricity_account_no ||
            pickUploadValue(
                lookup,
                ['electricity_account_no', 'electricityAccountNo', 'customer_acct_no', 'customerAcctNo', 'meter_no', 'meterNo'],
                filenameAccountNo
            ),
        electricity_amount: electricityAmount,
        electricity_due_date: electricityDueDate,
        electricity_payment_status: electricityPaymentStatus || (electricityAmount !== '' ? 'Unpaid' : ''),
        association_dues: associationDues,
        association_due_date: associationDueDate,
        association_payment_status: associationPaymentStatus || (associationDues !== '' ? 'Unpaid' : ''),
        total_amount_due: normalizedTotalAmountDue,
        real_property_tax: normalizeAmountValue(pickUploadValue(lookup, ['real_property_tax', 'realPropertyTax'])),
        rpt_payment_status: pickUploadValue(lookup, ['rpt_payment_status', 'rptPaymentStatus']),
        penalty: normalizeAmountValue(pickUploadValue(lookup, ['penalty'])),
        per_property_status: pickUploadValue(lookup, ['per_property_status', 'perPropertyStatus'])
    };

    const originalFileName = String(lookup.filename || lookup.file_name || lookup.name || '');
    if (originalFileName) {
        result = addUploadFileFallback(result, originalFileName, resolvedBillType || detectBillTypeFromData(result));
    }

    return result;
}
