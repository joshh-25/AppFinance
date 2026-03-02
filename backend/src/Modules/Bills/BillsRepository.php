<?php
/*
 * Finance App File: backend/src/Modules/Bills/BillsRepository.php
 * Purpose: Bills data-access helpers.
 */
class BillsRepository
{
    public static function hydrateRow(array $row): array
    {
        return hydrate_bill_row_from_property_master($row);
    }
}
