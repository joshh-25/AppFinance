import { describe, expect, it, vi } from 'vitest';
import { resolveUploadPropertyBeforeRender } from '../uploadPropertyResolver.js';

describe('resolveUploadPropertyBeforeRender', () => {
  it('matches OCR property text to a canonical property record before account lookup', async () => {
    const nextForm = {
      property_list_id: 0,
      property: 'The Palladium',
      dd: 'SW-9E',
      due_period: '2026-02',
      association_dues: '7440.00'
    };
    const propertyRecords = [
      {
        property_list_id: 9,
        property: 'The Palladium',
        dd: 'SW-9E',
        unit_owner: 'Sps. Arlene & Louie Tirador',
        classification: 'Condominium'
      }
    ];
    const lookupPropertyByAccountNumber = vi.fn();

    const resolved = await resolveUploadPropertyBeforeRender({
      nextForm,
      activeBillType: 'association_dues',
      accountLookupFieldByType: {},
      lookupPropertyByAccountNumber,
      propertyRecords
    });

    expect(resolved.property_list_id).toBe(9);
    expect(resolved.property).toBe('The Palladium');
    expect(resolved.dd).toBe('SW-9E');
    expect(resolved.unit_owner).toBe('Sps. Arlene & Louie Tirador');
    expect(lookupPropertyByAccountNumber).not.toHaveBeenCalled();
  });

  it('matches abbreviated OCR text to the best property record when the score is unique', async () => {
    const nextForm = {
      property_list_id: 0,
      property: 'Lafayette Park Square',
      dd: '5Z LPSQ',
      due_period: '2026-01',
      electricity_account_no: 'MANABE43090802'
    };
    const propertyRecords = [
      {
        property_list_id: 1,
        property: 'Lafayette Park Square',
        dd: '5Z LPSQ',
        classification: 'Residential'
      },
      {
        property_list_id: 2,
        property: 'Oak Residence',
        dd: '88 ABC'
      }
    ];
    const lookupPropertyByAccountNumber = vi.fn();

    const resolved = await resolveUploadPropertyBeforeRender({
      nextForm,
      activeBillType: 'electricity',
      accountLookupFieldByType: { electricity: 'electricity_account_no' },
      lookupPropertyByAccountNumber,
      propertyRecords
    });

    expect(resolved.property_list_id).toBe(1);
    expect(resolved.property).toBe('Lafayette Park Square');
    expect(resolved.dd).toBe('5Z LPSQ');
    expect(lookupPropertyByAccountNumber).not.toHaveBeenCalled();
  });

  it('falls back to account lookup when OCR property text is ambiguous', async () => {
    const nextForm = {
      property_list_id: 0,
      property: 'Lafayette',
      dd: '',
      due_period: '2026-03',
      water_account_no: 'WTR-AMBIG-01'
    };
    const propertyRecords = [
      { property_list_id: 1, property: 'Lafayette Park Square', dd: '24 LPS 9PQ' },
      { property_list_id: 2, property: 'Lafayette Gardens', dd: '25 LPS 9PR' }
    ];
    const lookupPropertyByAccountNumber = vi.fn().mockResolvedValue({
      data: {
        property_list_id: 2,
        property: 'Lafayette Gardens',
        dd: '25 LPS 9PR'
      }
    });

    const resolved = await resolveUploadPropertyBeforeRender({
      nextForm,
      activeBillType: 'water',
      accountLookupFieldByType: { water: 'water_account_no' },
      lookupPropertyByAccountNumber,
      propertyRecords
    });

    expect(lookupPropertyByAccountNumber).toHaveBeenCalledTimes(1);
    expect(resolved.property_list_id).toBe(2);
    expect(resolved.property).toBe('Lafayette Gardens');
    expect(resolved.dd).toBe('25 LPS 9PR');
  });
});
