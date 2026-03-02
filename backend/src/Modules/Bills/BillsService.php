<?php
/*
 * Finance App File: backend/src/Modules/Bills/BillsService.php
 * Purpose: Bills business-rule helpers.
 */
class BillsService
{
    public static function normalizeFilter($value): string
    {
        return normalize_bill_type_filter($value);
    }
}
