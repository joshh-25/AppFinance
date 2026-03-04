<?php
/*
 * Finance App File: backend/src/Modules/Expenses/ExpensesService.php
 * Purpose: Expenses business-rule helpers.
 */
class ExpensesService
{
    public static function normalizePayload($payload): array
    {
        return normalize_expense_payload($payload);
    }
}

