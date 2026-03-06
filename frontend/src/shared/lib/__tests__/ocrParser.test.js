import { describe, expect, it } from 'vitest';
import { detectBillTypeFromData, normalizeUploadData } from '../ocrParser.js';

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
    expect(normalized.association_due_date).toBe('2026-02-20');
    expect(normalized.water_due_date).toBe('2026-02-20');
  });
});
