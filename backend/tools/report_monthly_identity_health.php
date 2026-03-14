<?php
/*
 * Finance App File: backend/tools/report_monthly_identity_health.php
 * Purpose: Report monthly identity health for property_billing_records.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Core/LegacyBootstrap.php';

$pdo = get_db_connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$health = get_monthly_identity_health($pdo);
$duplicateGroups = get_monthly_identity_duplicate_groups($pdo, 10);

echo "Monthly identity health\n";
echo "ok: " . (($health['ok'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "invalid_property_list_id_rows: " . (int) ($health['invalid_property_list_id_rows'] ?? 0) . PHP_EOL;
echo "missing_due_period_rows: " . (int) ($health['missing_due_period_rows'] ?? 0) . PHP_EOL;
echo "duplicate_active_monthly_groups: " . (int) ($health['duplicate_active_monthly_groups'] ?? 0) . PHP_EOL;

if ($duplicateGroups) {
    echo "duplicate_group_samples:\n";
    foreach ($duplicateGroups as $group) {
        echo sprintf(
            "- property_list_id=%d due_period=%s active_rows=%d row_ids=%s latest_created_at=%s\n",
            (int) ($group['property_list_id'] ?? 0),
            (string) ($group['due_period'] ?? ''),
            (int) ($group['active_rows'] ?? 0),
            (string) ($group['row_ids'] ?? ''),
            (string) ($group['latest_created_at'] ?? '')
        );
    }
}

if (($health['ok'] ?? false) !== true) {
    exit(1);
}
