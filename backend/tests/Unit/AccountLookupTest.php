<?php
/*
 * Finance App File: backend/tests/Unit/AccountLookupTest.php
 * Purpose: Unit tests for account-lookup normalization helpers.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../src/Core/LegacyBootstrap.php';
require_once __DIR__ . '/../../src/Modules/AccountLookup/LegacyAccountLookup.php';

final class AccountLookupTest extends TestCase
{
    public function testNormalizeAccountLookupAccountNumberRemovesSeparators(): void
    {
        $this->assertSame('manabe43090802', normalize_account_lookup_account_number(' MANABE-4309 0802 '));
        $this->assertSame('abc123', normalize_account_lookup_account_number('A.B-C_123'));
    }

    public function testNormalizeAccountLookupUtilityTypeMapsWifiToInternet(): void
    {
        $this->assertSame('internet', normalize_account_lookup_utility_type('wifi'));
        $this->assertSame('internet', normalize_account_lookup_utility_type('Internet'));
        $this->assertSame('water', normalize_account_lookup_utility_type('water'));
        $this->assertSame('', normalize_account_lookup_utility_type('association'));
    }

    public function testNormalizeAccountLookupBillingMonthSupportsMonthTokens(): void
    {
        $this->assertSame('2026-02', normalize_account_lookup_billing_month('2026-02'));
        $this->assertSame('2026-01', normalize_account_lookup_billing_month('January 2026'));
        $this->assertSame('2026-03', normalize_account_lookup_billing_month('2026/3'));
        $this->assertSame('', normalize_account_lookup_billing_month('invalid-value'));
    }
}

