<?php
/*
 * Finance App File: backend/src/Modules/Bills/BillsController.php
 * Purpose: Bills module API controller wrapper.
 */
class BillsController
{
    public static function handle(string $action): bool
    {
        return handle_bill_actions($action);
    }
}
