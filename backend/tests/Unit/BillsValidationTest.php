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
}
