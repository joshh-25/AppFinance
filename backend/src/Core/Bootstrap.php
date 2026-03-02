<?php
/*
 * Finance App File: backend/src/Core/Bootstrap.php
 * Purpose: Initialize shared API bootstrap dependencies.
 */
class Bootstrap
{
    public static function init(): void
    {
        require_once __DIR__ . '/LegacyBootstrap.php';
    }
}
