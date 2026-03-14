<?php
/*
 * Finance App File: backend/tests/Unit/BillsValidationTest.php
 * Purpose: Unit tests for bill type normalization and module field resolution.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

// Bills module functions have a dependency on a constant defined in api.php.
// We define it here so the Bills module can be loaded standalone.
if (!defined('API_BILL_TYPES')) {
    define('API_BILL_TYPES', ['water', 'internet', 'electricity', 'association_dues']);
}

require_once __DIR__ . '/../../src/Modules/Bills/LegacyBills.php';

final class BillsValidationTest extends TestCase
{
    // ──────────────────────────────────────────────
    // normalize_bill_type_filter
    // ──────────────────────────────────────────────

    public function testNormalizesWifiToInternet(): void
    {
        $this->assertSame('internet', normalize_bill_type_filter('wifi'));
        $this->assertSame('internet', normalize_bill_type_filter('WiFi'));
        $this->assertSame('internet', normalize_bill_type_filter('WIFI'));
    }

    public function testNormalizesAssociationToAssociationDues(): void
    {
        $this->assertSame('association_dues', normalize_bill_type_filter('association'));
        $this->assertSame('association_dues', normalize_bill_type_filter('ASSOCIATION'));
    }

    public function testPassesThroughValidBillTypes(): void
    {
        $this->assertSame('water', normalize_bill_type_filter('water'));
        $this->assertSame('electricity', normalize_bill_type_filter('electricity'));
        $this->assertSame('internet', normalize_bill_type_filter('internet'));
        $this->assertSame('association_dues', normalize_bill_type_filter('association_dues'));
    }

    public function testReturnsEmptyStringForUnknownTypes(): void
    {
        $this->assertSame('', normalize_bill_type_filter('unknown'));
        $this->assertSame('', normalize_bill_type_filter(''));
        $this->assertSame('', normalize_bill_type_filter('gas'));
    }

    public function testBillJsonPayloadValidationAcceptsEmptyObjectPayload(): void
    {
        $decoded = json_decode('{}', true);
        $this->assertTrue(is_valid_bill_json_payload($decoded));
    }

    public function testBillJsonPayloadValidationRejectsInvalidPayload(): void
    {
        $this->assertFalse(is_valid_bill_json_payload(json_decode('null', true)));
        $this->assertFalse(is_valid_bill_json_payload('raw-json-string'));
    }

    // ──────────────────────────────────────────────
    // get_bill_type_module_fields
    // ──────────────────────────────────────────────

    public function testWaterFieldsAreCorrect(): void
    {
        $fields = get_bill_type_module_fields('water');
        $this->assertContains('water_amount', $fields);
        $this->assertContains('water_account_no', $fields);
        $this->assertContains('water_due_date', $fields);
        $this->assertContains('water_payment_status', $fields);
    }

    public function testInternetFieldsAreCorrect(): void
    {
        $fields = get_bill_type_module_fields('internet');
        $this->assertContains('wifi_amount', $fields);
        $this->assertContains('internet_account_no', $fields);
        $this->assertContains('internet_provider', $fields);
    }

    public function testElectricityFieldsAreCorrect(): void
    {
        $fields = get_bill_type_module_fields('electricity');
        $this->assertContains('electricity_amount', $fields);
        $this->assertContains('electricity_account_no', $fields);
        $this->assertContains('electricity_due_date', $fields);
        $this->assertContains('electricity_payment_status', $fields);
    }

    public function testAssociationFieldsAreCorrect(): void
    {
        $fields = get_bill_type_module_fields('association_dues');
        $this->assertContains('association_dues', $fields);
        $this->assertContains('association_due_date', $fields);
        $this->assertContains('association_payment_status', $fields);
    }

    public function testUnknownTypeDefaultsToWaterFields(): void
    {
        // An unrecognised type normalizes to '' which falls through to water
        $fields = get_bill_type_module_fields('garbage');
        $this->assertContains('water_amount', $fields);
    }

    // ──────────────────────────────────────────────
    // escape_like_pattern
    // ──────────────────────────────────────────────

    public function testEscapeLikePatternEscapesSpecialCharacters(): void
    {
        $this->assertSame('100\%', escape_like_pattern('100%'));
        $this->assertSame('unit\_1', escape_like_pattern('unit_1'));
        $this->assertSame('back\\\\slash', escape_like_pattern('back\\slash'));
    }

    public function testEscapeLikePatternPassesThroughSafeInput(): void
    {
        $this->assertSame('Lafayette', escape_like_pattern('Lafayette'));
        $this->assertSame('2025-01', escape_like_pattern('2025-01'));
    }

    public function testMergeBillRowsKeepLatestValuesCombinesMonthlyModuleFields(): void
    {
        $rows = [
            [
                'id' => 202,
                'property_list_id' => 7,
                'dd' => '24 LPS 9PQ',
                'property' => 'Lafayette',
                'due_period' => '2026-03',
                'bill_type' => 'electricity',
                'electricity_amount' => '1900',
                'water_amount' => '',
            ],
            [
                'id' => 201,
                'property_list_id' => 7,
                'dd' => '24 LPS 9PQ',
                'property' => 'Lafayette',
                'due_period' => '2026-03',
                'bill_type' => 'water',
                'electricity_amount' => '',
                'water_amount' => '900',
            ],
        ];

        $merged = merge_bill_rows_keep_latest_values($rows);

        $this->assertSame(7, $merged['property_list_id']);
        $this->assertSame('2026-03', $merged['due_period']);
        $this->assertSame('electricity', $merged['bill_type']);
        $this->assertSame('1900', $merged['electricity_amount']);
        $this->assertSame('900', $merged['water_amount']);
    }

    public function testBuildMonthlyRecordPayloadMapsSingleRowIdsForAllModules(): void
    {
        $payload = build_monthly_record_payload([
            'id' => 301,
            'property_list_id' => 10,
            'dd' => 'DD-01',
            'property' => 'Unit A',
            'due_period' => '2026-03',
            'bill_type' => 'water',
            'water_amount' => '100',
            'wifi_amount' => '200',
        ]);

        $this->assertSame(301, $payload['id']);
        $this->assertSame(301, $payload['water_bill_id']);
        $this->assertSame(0, $payload['electricity_bill_id']);
        $this->assertSame(301, $payload['internet_bill_id']);
        $this->assertSame(0, $payload['association_bill_id']);
        $this->assertSame('2026-03', $payload['due_period']);
        $this->assertSame('100', $payload['water_amount']);
        $this->assertSame('200', $payload['wifi_amount']);
    }

    public function testHydrateBillRowFromPropertyMasterKeepsBillDuePeriodAndFillsMissingMetadata(): void
    {
        $row = hydrate_bill_row_from_property_master([
            'id' => 501,
            'property_list_id' => 10,
            'dd' => '',
            'property' => '',
            'due_period' => '2026-03',
            'pl_dd' => 'DD-10',
            'pl_property' => 'Unit 10',
            'pl_due_period' => '2026-01',
            'pl_unit_owner' => 'Owner Name',
            'pl_classification' => 'Fixed',
            'pl_deposit' => '1000',
            'pl_rent' => '500',
            'pl_per_property_status' => 'Active',
            'pl_real_property_tax' => '150',
            'pl_rpt_payment_status' => 'Paid',
            'pl_penalty' => '0',
        ]);

        $this->assertSame('DD-10', $row['dd']);
        $this->assertSame('Unit 10', $row['property']);
        $this->assertSame('2026-03', $row['due_period']);
        $this->assertSame('Owner Name', $row['unit_owner']);
        $this->assertSame('Fixed', $row['classification']);
        $this->assertSame('150', $row['real_property_tax']);
        $this->assertArrayNotHasKey('pl_dd', $row);
    }

    public function testBuildMonthlyRecordPayloadKeepsBillDuePeriodWhenMasterPeriodDiffers(): void
    {
        $payload = build_monthly_record_payload([
            'id' => 808,
            'property_list_id' => 20,
            'dd' => '',
            'property' => '',
            'due_period' => '2026-05',
            'pl_dd' => 'DD-20',
            'pl_property' => 'Unit 20',
            'pl_due_period' => '2026-01',
            'pl_unit_owner' => 'Hydrated Owner',
            'water_amount' => '450',
            'association_dues' => '980',
        ]);

        $this->assertSame('2026-05', $payload['due_period']);
        $this->assertSame('DD-20', $payload['dd']);
        $this->assertSame('Unit 20', $payload['property']);
        $this->assertSame('Hydrated Owner', $payload['unit_owner']);
        $this->assertSame(808, $payload['water_bill_id']);
        $this->assertSame(808, $payload['association_bill_id']);
        $this->assertSame(0, $payload['electricity_bill_id']);
        $this->assertSame(0, $payload['internet_bill_id']);
    }
}
