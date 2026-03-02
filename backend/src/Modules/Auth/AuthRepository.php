<?php
/*
 * Finance App File: backend/src/Modules/Auth/AuthRepository.php
 * Purpose: Auth data-access helpers.
 */
class AuthRepository
{
    public static function resolveLoginRole(PDO $pdo, array $user): string
    {
        return resolve_login_user_role($pdo, $user);
    }
}
