<?php
/*
 * Finance App File: login.php
 * Purpose: Legacy login redirect preserved for compatibility; the SPA owns the login screen.
 */
require_once __DIR__ . '/../src/Core/SecurityRuntime.php';

apply_finance_security_headers('html');
start_finance_session();

$target = finance_app_url('login');
header('Location: ' . $target, true, 302);
exit;
