<?php
/*
 * Finance App File: backend/public/api.php
 * Purpose: Backend API entrypoint using module-based routing.
 */
require_once __DIR__ . '/../src/Core/Bootstrap.php';
Bootstrap::init();

require_once __DIR__ . '/../src/Modules/Auth/LegacyAuth.php';
require_once __DIR__ . '/../src/Modules/Bills/LegacyBills.php';
require_once __DIR__ . '/../src/Modules/Property/LegacyProperty.php';

require_once __DIR__ . '/../src/Modules/Auth/AuthController.php';
require_once __DIR__ . '/../src/Modules/Bills/BillsController.php';
require_once __DIR__ . '/../src/Modules/Property/PropertyController.php';
require_once __DIR__ . '/../src/Core/ApiRouter.php';

$action = trim((string)($_GET['action'] ?? ''));
ApiRouter::dispatch($action);
