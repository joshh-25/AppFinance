// Finance App File: frontend/src/shared/lib/expenseOcr.js
// Purpose: Client-side OCR extraction and heuristics for expense receipts.

import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const CATEGORY_RULES = [
  ['Merchandise Inventory', /\b(inventory|stock|wholesale|resale|merchandise)\b/i],
  ['Repair', /\b(repair|maintenance|service\s*fee|fix|labor)\b/i],
  ['Asset', /\b(asset|equipment|machine|furniture|computer|device)\b/i],
  ['Store Supplies', /\b(supplies|office|stationery|consumable|cleaning)\b/i],
  ['Freight In', /\b(freight|shipping|delivery|cargo|logistics)\b/i]
];

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  const raw = cleanText(value);
  if (raw === '') {
    return '';
  }

  if (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${String(Number(ymd[2])).padStart(2, '0')}-${String(Number(ymd[3])).padStart(2, '0')}`;
  }

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const year = Number(dmy[3]) < 100 ? `20${String(dmy[3]).padStart(2, '0')}` : String(dmy[3]);
    return `${year}-${String(Number(dmy[2])).padStart(2, '0')}-${String(Number(dmy[1])).padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

function normalizeAmount(value) {
  const raw = cleanText(value);
  if (raw === '') {
    return '';
  }
  const normalized = raw.replace(/[,\s]/g, '').replace(/[^\d.-]/g, '');
  if (normalized === '' || Number.isNaN(Number(normalized))) {
    return '';
  }
  return Number(normalized).toFixed(2);
}

function extractDate(text) {
  const labeled = text.match(
    /\b(date|invoice\s*date|receipt\s*date)\b\s*[:#-]?\s*([A-Za-z0-9,/\- ]{6,30})/i
  );
  if (labeled?.[2]) {
    const normalized = normalizeDate(labeled[2]);
    if (normalized !== '') {
      return normalized;
    }
  }

  const fallback = text.match(
    /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/
  );
  return normalizeDate(fallback?.[1] || '');
}

function extractAmount(text) {
  const labeled = text.match(
    /\b(grand\s*total|total\s*due|total|amount\s*due|net\s*amount)\b[^\n\d-]*([0-9][0-9,.\s]{1,18})/i
  );
  if (labeled?.[2]) {
    const normalized = normalizeAmount(labeled[2]);
    if (normalized !== '') {
      return normalized;
    }
  }

  const candidates = [...text.matchAll(/([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.\d{2})|[0-9]+\.\d{2})/g)]
    .map((match) => normalizeAmount(match[1]))
    .filter((value) => value !== '');
  if (candidates.length === 0) {
    return '';
  }

  return candidates
    .map((value) => Number(value))
    .sort((a, b) => b - a)[0]
    .toFixed(2);
}

function extractPayee(text) {
  const labeled = text.match(/\b(payee|vendor|supplier|merchant|billed\s*by|sold\s*by)\b\s*[:#-]?\s*([^\n]+)/i);
  if (labeled?.[2]) {
    return cleanText(labeled[2]);
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);
  const firstMeaningful = lines.find(
    (line) => !/\b(receipt|invoice|official|tax|vat|date|total)\b/i.test(line) && /[a-z]/i.test(line)
  );
  return firstMeaningful || '';
}

function extractDescription(text) {
  const labeled = text.match(/\b(description|particulars|details|item)\b\s*[:#-]?\s*([^\n]+)/i);
  if (labeled?.[2]) {
    return cleanText(labeled[2]);
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => line.length > 4)
    .filter((line) => !/\b(receipt|invoice|date|total|amount|tin|vat)\b/i.test(line));
  return lines[1] || lines[0] || '';
}

function extractTin(text) {
  const matched = text.match(/\b(tin|tax\s*id|vat\s*reg(?:istration)?\s*no\.?)\b\s*[:#-]?\s*([0-9-]{9,20})/i);
  return cleanText(matched?.[2] || '');
}

function extractPayment(text) {
  const lowered = text.toLowerCase();
  if (/\bgcash\b/.test(lowered)) return 'Online';
  if (/\bcredit\s*card|visa|mastercard\b/.test(lowered)) return 'Card';
  if (/\bdebit\s*card\b/.test(lowered)) return 'Card';
  if (/\bbank\s*transfer|wire\s*transfer\b/.test(lowered)) return 'Bank Transfer';
  if (/\bcheck|cheque\b/.test(lowered)) return 'Check';
  if (/\bcash\b/.test(lowered)) return 'Cash';
  if (/\bonline\b/.test(lowered)) return 'Online';
  return '';
}

function extractCategory(text) {
  for (const [label, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) {
      return label;
    }
  }
  return '';
}

function extractNonVat(text) {
  const lowered = text.toLowerCase();
  if (/\b(non[\s-]?vat|vat[\s-]?exempt)\b/.test(lowered)) {
    return 1;
  }
  if (/\b(vatable|vat[\s-]?inclusive|vat[\s-]?inc)\b/.test(lowered)) {
    return 0;
  }
  return null;
}

async function renderPdfPageToBlob(page) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create rendering context for PDF OCR.');
  }

  await page.render({ canvasContext: context, viewport }).promise;
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function extractTextFromPdf(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const worker = await createWorker('eng');
  const maxPages = Math.min(pdf.numPages, 3);
  let fullText = '';

  try {
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const imageBlob = await renderPdfPageToBlob(page);
      if (!imageBlob) {
        continue;
      }
      const result = await worker.recognize(imageBlob);
      fullText += `\n${result?.data?.text || ''}`;
    }
  } finally {
    await worker.terminate();
  }

  return fullText.trim();
}

async function extractTextFromImage(file) {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(file);
    return cleanText(result?.data?.text || '');
  } finally {
    await worker.terminate();
  }
}

function parseExpenseFieldsFromText(text) {
  const normalizedText = String(text || '').replace(/\r/g, '\n');
  const nonVat = extractNonVat(normalizedText);
  return {
    expense_date: extractDate(normalizedText),
    payee: extractPayee(normalizedText),
    description: extractDescription(normalizedText),
    category: extractCategory(normalizedText),
    amount: extractAmount(normalizedText),
    payment: extractPayment(normalizedText),
    tin_number: extractTin(normalizedText),
    non_vat: nonVat,
    remarks: ''
  };
}

export async function runExpenseOcr(file) {
  if (!file) {
    throw new Error('No file selected for OCR.');
  }

  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  const isPdf = type.includes('pdf') || name.endsWith('.pdf');
  const extractedText = isPdf ? await extractTextFromPdf(file) : await extractTextFromImage(file);
  const fields = parseExpenseFieldsFromText(extractedText);

  return {
    text: extractedText,
    fields
  };
}

