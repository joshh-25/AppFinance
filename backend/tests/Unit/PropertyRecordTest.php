<?php
/*
 * Finance App File: backend/tests/Unit/PropertyRecordTest.php
 * Purpose: Unit tests for property record normalization, billing period parsing,
 *          and positive integer sanitization from LegacyBootstrap helpers.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

// Load the shared bootstrap helpers without triggering any I/O or DB calls.
// We define the required constant in BillsValidationTest, but guard against redefinition here.
if (!defined('API_BILL_TYPES')) {
    define('API_BILL_TYPES', ['water', 'internet', 'electricity', 'association_dues']);
}

// LegacyBootstrap.php emits HTTP headers and starts a session at the top level.
// Suppress the output_buffering violations in test mode and stub `session_start`.
// We require the file after calling ob_start() to swallow the header() calls.
ob_start();
require_once __DIR__ . '/../../src/Core/LegacyBootstrap.php';
ob_end_clean();

final class PropertyRecordTest extends TestCase
{
    // ──────────────────────────────────────────────
    // normalize_positive_int
    // ──────────────────────────────────────────────

    public function testNormalizePositiveIntWithPositiveValue(): void
    {
        $this->assertSame(5, normalize_positive_int(5));
        $this->assertSame(1, normalize_positive_int(1));
        $this->assertSame(9999, normalize_positive_int('9999'));
    }

    public function testNormalizePositiveIntReturnsZeroForNonPositive(): void
    {
        $this->assertSame(0, normalize_positive_int(0));
        $this->assertSame(0, normalize_positive_int(-1));
        $this->assertSame(0, normalize_positive_int(''));
        $this->assertSame(0, normalize_positive_int('abc'));
    }

    // ──────────────────────────────────────────────
    // normalize_billing_period_value
    // ──────────────────────────────────────────────

    public function testNormalizeBillingPeriodPassesThroughValidFormat(): void
    {
        $this->assertSame('2025-01', normalize_billing_period_value('2025-01'));
        $this->assertSame('2025-12', normalize_billing_period_value('2025-12'));
    }

    public function testNormalizeBillingPeriodPadsMonth(): void
    {
        $this->assertSame('2025-03', normalize_billing_period_value('2025/3'));
        $this->assertSame('2025-03', normalize_billing_period_value('2025-3'));
    }

    public function testNormalizeBillingPeriodParsesMonthName(): void
    {
        $this->assertSame('2025-01', normalize_billing_period_value('January 2025'));
        $this->assertSame('2025-12', normalize_billing_period_value('December 2025'));
        $this->assertSame('2025-06', normalize_billing_period_value('Jun 2025'));
    }

    public function testNormalizeBillingPeriodReturnsEmptyForEmpty(): void
    {
        $this->assertSame('', normalize_billing_period_value(''));
    }

    // ──────────────────────────────────────────────
    // normalize_property_record_payload
    // ──────────────────────────────────────────────

    public function testNormalizePropertyRecordPayloadReturnsAllRequiredKeys(): void
    {
        $payload = [
            'dd'                => '  101  ',
            'property'          => '  Lafayette  ',
            'billing_period'    => '2025-03',
            'unit_owner'        => 'John Doe',
            'classification'    => 'Residential',
            'deposit'           => '10000',
            'rent'              => '5000',
            'per_property_status' => 'Active',
            'real_property_tax' => '1200',
            'rpt_payment_status' => 'Paid',
            'penalty'           => '0',
            'property_list_id'  => '7',
        ];

        $result = normalize_property_record_payload($payload);

        $this->assertSame('101', $result['dd']);
        $this->assertSame('Lafayette', $result['property']);
        $this->assertSame('2025-03', $result['billing_period']);
        $this->assertSame('John Doe', $result['unit_owner']);
        $this->assertSame(7, $result['property_list_id']);
    }

    public function testNormalizePropertyRecordPayloadTrimsWhitespace(): void
    {
        $result = normalize_property_record_payload([
            'dd'       => '  B-02  ',
            'property' => '   Unit B   ',
        ]);

        $this->assertSame('B-02', $result['dd']);
        $this->assertSame('Unit B', $result['property']);
    }

    public function testNormalizePropertyRecordPayloadHandlesMissingKeys(): void
    {
        $result = normalize_property_record_payload([]);

        $this->assertSame('', $result['dd']);
        $this->assertSame('', $result['property']);
        $this->assertSame('', $result['billing_period']);
        $this->assertSame(0, $result['property_list_id']);
    }

    public function testNormalizePropertyRecordPayloadNormalizesBillingPeriod(): void
    {
        $result = normalize_property_record_payload(['billing_period' => 'March 2025']);
        $this->assertSame('2025-03', $result['billing_period']);
    }

    public function testNormalizeCsvPayloadUsesDuePeriodWhenProvided(): void
    {
        $result = normalize_csv_payload([
            'bill_type' => 'water',
            'due_period' => '2026-03',
            'water_due_date' => '2026-03-20',
        ]);

        $this->assertSame('2026-03', $result['due_period']);
    }

    public function testNormalizeCsvPayloadDerivesDuePeriodFromDueDateWhenMissing(): void
    {
        $result = normalize_csv_payload([
            'bill_type' => 'internet',
            'wifi_due_date' => '2026-04-15',
        ]);

        $this->assertSame('2026-04', $result['due_period']);
    }
}
