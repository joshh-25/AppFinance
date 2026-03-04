<?php
/*
 * Finance App File: backend/src/Modules/Expenses/ExpensesRepository.php
 * Purpose: Expenses data-access helpers.
 */
class ExpensesRepository
{
    public static function mapRow(array $row): array
    {
        return map_expense_row($row);
    }
}

