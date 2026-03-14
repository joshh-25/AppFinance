import { describe, expect, it } from 'vitest';
import {
  INITIAL_EDIT_LOCK,
  buildPropertyRecordContextFromBillForm,
  buildUpdatePayloadForType,
  deriveDuePeriodFromDueDate,
  getContextBillIdByType,
  getPreSaveBillError,
  mapRecordsContextToForm,
  normalizeBillTypeValue,
  shouldIncludeBillRowForType,
  toFriendlyErrorMessage
} from '../paymentFormState.js';

describe('paymentFormState', () => {
  it('normalizes bill type aliases', () => {
    expect(normalizeBillTypeValue('wifi')).toBe('internet');
    expect(normalizeBillTypeValue('association')).toBe('association_dues');
  });

  it('maps records context into a full bill form without dropping module data', () => {
    const form = mapRecordsContextToForm(
      {
        property_list_id: 7,
        dd: 'DD-007',
        property: 'Unit G',
        due_period: '2026-03',
        water_amount: '1200',
        wifi_amount: '900'
      },
      'water'
    );

    expect(form.bill_type).toBe('water');
    expect(form.property_list_id).toBe(7);
    expect(form.water_amount).toBe('1200');
    expect(form.wifi_amount).toBe('900');
  });

  it('builds update payloads with edit lock targeting metadata', () => {
    const payload = buildUpdatePayloadForType(
      {
        property_list_id: 12,
        dd: 'DD-012',
        property: 'Unit L',
        due_period: '2026-04',
        wifi_amount: '1500',
        wifi_due_date: '2026-04-20',
        wifi_payment_status: 'Unpaid'
      },
      'internet',
      {
        property_list_id: 5,
        dd: 'DD-005',
        property: 'Unit E',
        due_period: '2026-02',
        bill_type: 'internet'
      }
    );

    expect(payload.bill_type).toBe('internet');
    expect(payload.wifi_amount).toBe('1500');
    expect(payload.target_property_list_id).toBe(5);
    expect(payload.target_due_period).toBe('2026-02');
  });

  it('derives due periods only from full date values', () => {
    expect(deriveDuePeriodFromDueDate('2026-03-21')).toBe('2026-03');
    expect(deriveDuePeriodFromDueDate('2026-03')).toBe('');
  });

  it('resolves context bill ids by bill type', () => {
    const context = {
      editing_bill_id: 4,
      wifi_bill_id: 8,
      association_bill_id: 11
    };

    expect(getContextBillIdByType(context, 'internet')).toBe(8);
    expect(getContextBillIdByType(context, 'water')).toBe(4);
    expect(getContextBillIdByType(context, 'association_dues')).toBe(11);
  });

  it('creates property record context from the bill form', () => {
    const context = buildPropertyRecordContextFromBillForm({
      property_list_id: 3,
      dd: 'DD-003',
      property: 'Unit C',
      due_period: '2026-05'
    });

    expect(context).toMatchObject({
      property_list_id: 3,
      dd: 'DD-003',
      property: 'Unit C',
      due_period: '2026-05'
    });
  });

  it('returns friendly duplicate save messaging', () => {
    expect(toFriendlyErrorMessage(new Error('Duplicate row already exists'))).toBe(
      'A record with this DD and Due Period already exists.'
    );
  });

  it('validates property selection before save', () => {
    expect(getPreSaveBillError({}, 'water')).toBe('Choose the property first before saving this bill.');
  });

  it('keeps rows visible when type data exists even if bill_type text differs', () => {
    expect(
      shouldIncludeBillRowForType(
        {
          bill_type: 'association',
          association_dues: '',
          water_amount: '500'
        },
        'water'
      )
    ).toBe(true);
  });

  it('uses the default edit lock shape when one is not provided', () => {
    const payload = buildUpdatePayloadForType(
      {
        property_list_id: 12,
        dd: 'DD-012',
        property: 'Unit L',
        due_period: '2026-04',
        water_amount: '1500'
      },
      'water'
    );

    expect(payload.target_property_list_id).toBe(INITIAL_EDIT_LOCK.property_list_id);
  });
});
