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

    public function testResolveAccountLookupCandidatesReturnsMatchedForSingleProperty(): void
    {
        $resolution = resolve_account_lookup_candidates([
            [
                'property_name' => 'Lafayette',
                'property_list_id' => 10,
                'utility_type' => 'water',
                'account_number_raw' => 'WTR-001',
            ],
            [
                'property_name' => ' lafayette ',
                'property_list_id' => 0,
                'utility_type' => 'water',
                'account_number_raw' => 'WTR001',
            ],
        ]);

        $this->assertSame('matched', $resolution['match_status']);
        $this->assertSame(1, $resolution['candidate_count']);
        $this->assertSame('Lafayette', $resolution['candidate']['property']);
        $this->assertSame(10, $resolution['candidate']['property_list_id']);
    }

    public function testResolveAccountLookupCandidatesReturnsNeedsReviewForAmbiguousProperty(): void
    {
        $resolution = resolve_account_lookup_candidates([
            [
                'property_name' => 'Lafayette',
                'property_list_id' => 10,
                'utility_type' => 'water',
                'account_number_raw' => 'WTR-001',
            ],
            [
                'property_name' => 'Oak Residence',
                'property_list_id' => 22,
                'utility_type' => 'water',
                'account_number_raw' => 'WTR-001',
            ],
        ]);

        $this->assertSame('needs_review', $resolution['match_status']);
        $this->assertSame(2, $resolution['candidate_count']);
        $this->assertNull($resolution['candidate']);
        $this->assertCount(2, $resolution['candidates']);
    }
}
