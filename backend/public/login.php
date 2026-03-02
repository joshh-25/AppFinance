<?php
/*
 * Finance App File: login.php
 * Purpose: Backend/setup source file for the Finance app.
 */
session_start();

$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
if ($basePath === '') {
    $basePath = '/';
}

$target = ($basePath === '/' ? '' : $basePath) . '/login';
header('Location: ' . $target, true, 302);
exit;
?>
