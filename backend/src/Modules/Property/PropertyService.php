<?php
/*
 * Finance App File: backend/src/Modules/Property/PropertyService.php
 * Purpose: Property business-rule helpers.
 */
class PropertyService
{
    public static function normalizePayload(array $data): array
    {
        return normalize_property_record_payload($data);
    }
}
