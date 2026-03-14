import { describe, expect, it } from 'vitest';
import { deriveUploadConfidence, detectBillTypeFromData, normalizeUploadData, validateUploadExtraction } from '../ocrParser.js';

const MIXED_ASSOC_AND_WATER_INVOICE_TEXT = `
THE PALLADIUM CONDOMINIUM ASSOCIATION, INC.
BILLING INVOICE
No. 8183
Date Billed February 5, 2026
Due Date February 20, 2026
Date Description Amount CM Ref. CM Amount Balance
February 5, 2026 February 2026 Association Dues - 7,440.00- - 7,440.00-
February 5, 2026 Water Cons. (Rate 43Php/cu.m.): 5 cu.m. - 215.00- - 215.00-
Total Current Charges 7,655.00
Total Balance Due 7,655.00
`;

const ASSOCIATION_ONLY_INVOICE_TEXT = `
ONE SPATIAL ILOILO CONDOMINIUM CORPORATION
BILLING STATEMENT
Date: 22/12/2025
Name of Owner: PANES, LISA ROCHAR
Period Covered: January 1 - January 31
Due Date: January 15, 2026
Association Dues - Residential - January 2026 2,900.70
Total (VAT Exclusive) 2,990.41
Amount Due 2,990.41
`;

const WATER_METER_LINE_TEXT = `
ONE MADISON PLACE CONDOMINIUM ASSOCIATION, INC.
Bill To : Sps. Ibrahim Khalilullah & Marny Arambola Ringo
Due Date : November 25, 2025
4 Utilities - Water
Prev: 155.00, Curr: 163.00, Used: 8.00, Rate: 74.36/cu.m.594.88 0.00 0.00 594.88
Total Amount Due 7,034.56
`;

describe('ocrParser mixed-invoice parsing', () => {
  it('extracts line-item association dues and water amount from a combined invoice', () => {
    const normalized = normalizeUploadData({
      text: MIXED_ASSOC_AND_WATER_INVOICE_TEXT,
      name: '8183_SW-9E FEBRUARY 2026 BILLING INVOICE.pdf'
    });

    expect(normalized).toBeTruthy();
    expect(detectBillTypeFromData(normalized)).toBe('association_dues');
    expect(normalized.association_dues).toBe('7440.00');
    expect(normalized.water_amount).toBe('215.00');
    expect(normalized.water_line_detected).toBe(true);
    expect(normalized.association_due_date).toBe('2026-02-20');
    expect(normalized.water_due_date).toBe('2026-02-20');
  });

  it('does not treat association amount due as water amount when no water line exists', () => {
    const normalized = normalizeUploadData({
      text: ASSOCIATION_ONLY_INVOICE_TEXT,
      name: 'OSI JAN 2026 SOA-1718.pdf'
    });

    expect(normalized).toBeTruthy();
    expect(detectBillTypeFromData(normalized)).toBe('association_dues');
    expect(normalized.association_dues).toBe('2900.70');
    expect(normalized.water_amount).toBe('');
    expect(normalized.water_line_detected).toBe(false);
  });

  it('ignores wrong payload water_amount for association-only documents', () => {
    const normalized = normalizeUploadData({
      bill_type: 'association_dues',
      association_dues: '2900.70',
      water_amount: '5980.74',
      due_date: '2026-01-15',
      text: ASSOCIATION_ONLY_INVOICE_TEXT,
      name: 'OSI JAN 2026 SOA-1718.pdf'
    });

    expect(normalized).toBeTruthy();
    expect(detectBillTypeFromData(normalized)).toBe('association_dues');
    expect(normalized.association_dues).toBe('2900.70');
    expect(normalized.water_amount).toBe('');
    expect(normalized.water_line_detected).toBe(false);
  });

  it('parses water meter-line amount and prefers it over wrong payload water amount', () => {
    const normalized = normalizeUploadData({
      bill_type: 'association_dues',
      water_amount: '155.00',
      text: WATER_METER_LINE_TEXT,
      name: '51485-sample.pdf'
    });

    expect(normalized).toBeTruthy();
    expect(normalized.water_line_detected).toBe(true);
    expect(normalized.water_amount).toBe('594.88');
  });

  it('returns warnings for usable OCR data that is missing only optional fields', () => {
    const validation = validateUploadExtraction(
      {
        bill_type: 'internet',
        due_period: '2026-03',
        dd: '24 LPS 9PQ',
        property: 'Lafayette',
        internet_account_no: 'INT-0049281',
        wifi_amount: '1899.00',
        wifi_due_date: '2026-03-24'
      },
      'internet'
    );

    expect(validation.valid).toBe(true);
    expect(validation.warnings).toContain('Internet Provider');
    expect(validation.warnings).toContain('WiFi Payment Status');
  });

  it('blocks save when critical OCR fields are still missing', () => {
    const validation = validateUploadExtraction(
      {
        bill_type: 'internet',
        wifi_amount: '1899.00'
      },
      'internet'
    );

    expect(validation.valid).toBe(false);
    expect(validation.missingFields).toContain('property');
    expect(validation.missingFields).toContain('due_period');
    expect(validation.missingFields).toContain('internet_account_no');
    expect(validation.missingFields).toContain('wifi_due_date');
  });

  it('classifies unresolved property OCR as heuristic confidence', () => {
    const confidence = deriveUploadConfidence(
      {
        bill_type: 'internet',
        due_period: '2026-03',
        property: 'Lafayette',
        dd: '24 LPS 9PQ',
        internet_account_no: 'INT-0049281',
        wifi_amount: '1899.00',
        wifi_due_date: '2026-03-24'
      },
      'internet'
    );

    expect(confidence.summary).toBe('medium');
    expect(confidence.heuristicFields).toContain('Property');
    expect(confidence.heuristicFields).toContain('DD');
    expect(confidence.missingCriticalFields).toEqual([]);
  });
});
