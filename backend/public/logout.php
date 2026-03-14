<?php
/*
 * Finance App File: logout.php
 * Purpose: Legacy logout redirect preserved for compatibility; modern logout uses api.php?action=logout.
 */
require_once __DIR__ . '/../src/Core/SecurityRuntime.php';

apply_finance_security_headers('html');
start_finance_session();

$target = finance_app_url('login');
header('Location: ' . $target, true, 302);
exit;
