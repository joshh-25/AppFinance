import { describe, expect, it } from 'vitest';
import {
  buildCreatePayload,
  buildFailedUploadRow,
  deriveReviewBillTypes,
  getCompactReviewMessage,
  getFriendlyReviewSaveError,
  isRowSelectable,
  normalizeAmountToken,
  normalizeRowStatus
} from '../reviewPageHelpers.js';

describe('reviewPageHelpers', () => {
  it('normalizes numeric OCR tokens', () => {
    expect(normalizeAmountToken('PHP 4,680.00 due')).toBe('4680.00');
  });

  it('derives mixed review bill types for association invoices with water line items', () => {
    const billTypes = deriveReviewBillTypes(
      {
        association_dues: '4680.00',
        water_amount: '640.00',
        water_account_no: 'W-100',
        water_line_detected: true
      },
      'association_dues'
    );

    expect(billTypes).toEqual(['association_dues', 'water']);
  });

  it('builds failed upload rows with diagnostics', () => {
    const row = buildFailedUploadRow({ name: 'bill.pdf' }, new Error('Upload timed out'), 2);

    expect(row.source_file_name).toBe('bill.pdf');
    expect(row.status).toBe('scan_failed');
    expect(row.diagnostics.retry_count).toBe(2);
  });

  it('builds create payloads with shared and bill-type fields only', () => {
    const payload = buildCreatePayload(
      {
        property_list_id: 6,
        dd: 'DD-006',
        property: 'Unit F',
        due_period: '2026-06',
        water_amount: '900',
        wifi_amount: '1000'
      },
      'water'
    );

    expect(payload.property_list_id).toBe(6);
    expect(payload.water_amount).toBe('900');
    expect(payload.wifi_amount).toBeUndefined();
  });

  it('surfaces the highest-priority compact review message', () => {
    expect(getCompactReviewMessage({ save_error: 'Save failed', scan_error: 'Scan failed' })).toBe('Save failed');
  });

  it('labels ready heuristic OCR rows more explicitly', () => {
    expect(
      getCompactReviewMessage({
        status: 'ready',
        scan_error: 'OCR confidence: medium. Heuristic fields: Property, DD.',
        data: {
          ocr_confidence: {
            summary: 'medium'
          }
        }
      })
    ).toBe('Ready with heuristic OCR fields. OCR confidence: medium. Heuristic fields: Property, DD.');
  });

  it('explains why a row cannot be saved yet', () => {
    expect(getFriendlyReviewSaveError({ data: { property_list_id: 0 }, bill_type: 'water' })).toBe(
      'Choose the property before saving this row.'
    );
  });

  it('marks incomplete rows as needing review', () => {
    expect(normalizeRowStatus({ property_list_id: 2 }, 'water').status).toBe('needs_review');
  });

  it('returns OCR confidence details for review rows', () => {
    const statusInfo = normalizeRowStatus(
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

    expect(statusInfo.status).toBe('ready');
    expect(statusInfo.confidence).toMatchObject({
      summary: 'medium'
    });
    expect(statusInfo.validationMessage).toContain('OCR confidence: medium.');
  });

  it('prevents selecting rows that are already finalized', () => {
    expect(isRowSelectable({ status: 'saving' })).toBe(false);
    expect(isRowSelectable({ status: 'saved' })).toBe(false);
    expect(isRowSelectable({ status: 'ready' })).toBe(true);
  });
});
