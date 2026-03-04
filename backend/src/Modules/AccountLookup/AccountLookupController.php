<?php
/*
 * Finance App File: backend/src/Modules/AccountLookup/AccountLookupController.php
 * Purpose: Account lookup module API controller wrapper.
 */
class AccountLookupController
{
    public static function handle(string $action): bool
    {
        return handle_account_lookup_actions($action);
    }
}

