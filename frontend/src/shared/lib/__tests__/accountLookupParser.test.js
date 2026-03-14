import { describe, expect, it } from 'vitest';
import {
  detectBillingMonthFromText,
  extractAccountLookupRowsFromSheetRows,
  normalizeAccountNumberForLookup,
  normalizeUtilityType
} from '../accountLookupParser.js';

describe('accountLookupParser helpers', () => {
  it('normalizes account numbers by removing separators', () => {
    expect(normalizeAccountNumberForLookup(' MANABE-4309 0802 ')).toBe('manabe43090802');
    expect(normalizeAccountNumberForLookup('A.B/C_123')).toBe('abc123');
  });

  it('detects billing month from month/year text', () => {
    expect(detectBillingMonthFromText('BILLS JANUARY 2026.xlsx')).toBe('2026-01');
    expect(detectBillingMonthFromText('2026-02 utility file')).toBe('2026-02');
    expect(detectBillingMonthFromText('no month value')).toBe('');
  });

  it('extracts utility account mappings from row objects', () => {
    const rows = [
      {
        'Property Name': 'Lafayette',
        'Electricity Account No': 'ELEC-111',
        'Water Account No': 'WTR-222',
        'WiFi Account No': 'WIFI-333'
      }
    ];

    const entries = extractAccountLookupRowsFromSheetRows(rows, {
      source_file: 'BILLS FEBRUARY 2026.xlsx',
      sheet_name: 'Sheet1'
    });

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.utility_type).sort()).toEqual(['electricity', 'internet', 'water']);
    expect(entries[0].property_name).toBe('Lafayette');
    expect(entries[0].billing_month).toBe('2026-02');
  });

  it('normalizes utility type labels', () => {
    expect(normalizeUtilityType('wifi')).toBe('internet');
    expect(normalizeUtilityType('electricity')).toBe('electricity');
    expect(normalizeUtilityType('association')).toBe('');
  });
});

