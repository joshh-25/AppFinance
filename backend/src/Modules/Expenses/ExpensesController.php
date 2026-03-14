<?php
/*
 * Finance App File: backend/src/Modules/Expenses/ExpensesController.php
 * Purpose: Expenses module API controller wrapper.
 */
class ExpensesController
{
    public static function handle(string $action): bool
    {
        return handle_expense_actions($action);
    }
}

