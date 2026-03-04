<?php
/*
 * Finance App File: backend/tests/Unit/ExpensesValidationTest.php
 * Purpose: Unit tests for expense payload amount normalization and validation.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../src/Modules/Expenses/LegacyExpenses.php';

final class ExpensesValidationTest extends TestCase
{
    public function testNormalizeExpenseAmountValueReturnsEmptyStringForEmptyInput(): void
    {
        $this->assertSame('', normalize_expense_amount_value(''));
        $this->assertSame('', normalize_expense_amount_value('   '));
    }

    public function testValidateExpensePayloadRejectsMissingAmount(): void
    {
        $payload = normalize_expense_payload([
            'expense_date' => '2026-03-04',
            'payee' => 'QA Payee',
            'description' => 'Office supplies',
            'amount' => '',
        ]);

        $this->assertSame('Amount is required.', validate_expense_payload($payload));
    }

    public function testValidateExpensePayloadRejectsInvalidAmount(): void
    {
        $payload = normalize_expense_payload([
            'expense_date' => '2026-03-04',
            'payee' => 'QA Payee',
            'description' => 'Office supplies',
            'amount' => 'abc',
        ]);

        $this->assertSame('Amount must be a valid number.', validate_expense_payload($payload));
    }

    public function testValidateExpensePayloadAcceptsZeroAmount(): void
    {
        $payload = normalize_expense_payload([
            'expense_date' => '2026-03-04',
            'payee' => 'QA Payee',
            'description' => 'Office supplies',
            'amount' => '0',
        ]);

        $this->assertSame('', validate_expense_payload($payload));
    }
}

