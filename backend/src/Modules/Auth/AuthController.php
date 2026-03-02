<?php
/*
 * Finance App File: backend/src/Modules/Auth/AuthController.php
 * Purpose: Auth module API controller wrapper.
 */
class AuthController
{
    public static function handlePublicActions(string $action): bool
    {
        return handle_public_auth_actions($action);
    }

    public static function enforceAuthenticatedRequest(string $action): bool
    {
        return enforce_authenticated_request($action);
    }
}
