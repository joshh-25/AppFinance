<?php
/*
 * Finance App File: backend/src/Modules/Property/PropertyRepository.php
 * Purpose: Property data-access helpers.
 */
class PropertyRepository
{
    public static function findById(PDO $pdo, int $id): ?array
    {
        $row = find_property_list_by_id($pdo, $id);
        return is_array($row) ? $row : null;
    }
}
