<?php
/*
 * Finance App File: backend/src/Core/SecurityRuntime.php
 * Purpose: Shared runtime helpers for security headers, base paths, and session bootstrapping.
 */

function finance_base_path(): string
{
    $scriptName = trim((string) ($_SERVER['SCRIPT_NAME'] ?? ''));
    $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
    return $basePath === '' || $basePath === '.' ? '/' : $basePath;
}

function finance_cookie_path(): string
{
    $basePath = finance_base_path();
    return $basePath === '/' ? '/' : $basePath . '/';
}

function finance_is_https_request(): bool
{
    $https = strtolower(trim((string) ($_SERVER['HTTPS'] ?? '')));
    if ($https !== '' && $https !== 'off') {
        return true;
    }

    $forwardedProto = strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')));
    if ($forwardedProto === 'https') {
        return true;
    }

    return strtolower(trim((string) ($_SERVER['HTTP_X_FORWARDED_SSL'] ?? ''))) === 'on';
}

function finance_app_url(string $path = ''): string
{
    $basePath = finance_base_path();
    $normalizedPath = ltrim(trim($path), '/');
    if ($normalizedPath === '') {
        return $basePath === '/' ? '/' : $basePath;
    }

    return ($basePath === '/' ? '' : $basePath) . '/' . $normalizedPath;
}

function finance_runtime_config(): array
{
    return [
        'basePath' => finance_base_path(),
        'apiBase' => finance_app_url('api.php'),
        'loginPath' => finance_app_url('login'),
        'logoutPath' => finance_app_url('logout.php'),
    ];
}

function apply_finance_security_headers(string $context = 'api'): void
{
    if ($context === 'api') {
        header('Content-Type: application/json');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('Pragma: no-cache');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
    } else {
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
    }

    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Cross-Origin-Resource-Policy: same-origin');
    header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');

    if (finance_is_https_request()) {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function start_finance_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');

    session_name('finance_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => finance_cookie_path(),
        'secure' => finance_is_https_request(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
