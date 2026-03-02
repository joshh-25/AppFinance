<?php
/*
 * Finance App File: backend/src/Modules/Auth/AuthService.php
 * Purpose: Auth business-rule helpers.
 */
class AuthService
{
    public static function normalizeRole($role, string $defaultRole = 'admin'): string
    {
        return normalize_user_role($role, $defaultRole);
    }

    public static function canAccess(string $role, string $action): bool
    {
        return can_role_access_action($role, $action);
    }
}
