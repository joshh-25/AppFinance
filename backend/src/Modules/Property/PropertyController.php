<?php
/*
 * Finance App File: backend/src/Modules/Property/PropertyController.php
 * Purpose: Property module API controller wrapper.
 */
class PropertyController
{
    public static function handle(string $action): bool
    {
        return handle_property_actions($action);
    }
}
