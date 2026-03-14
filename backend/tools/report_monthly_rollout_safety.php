<?php
/*
 * Finance App File: backend/tools/report_monthly_rollout_safety.php
 * Purpose: Audit monthly billing rollout safety for upgraded and fresh databases.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Core/LegacyBootstrap.php';

$pdo = get_db_connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$report = get_monthly_rollout_safety_report($pdo, 10);
$health = $report['health'] ?? [];
$schema = $report['schema'] ?? [];
$duplicates = $report['duplicate_groups'] ?? [];

echo "Monthly rollout safety\n";
echo "ok: " . (($report['ok'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "health_ok: " . (($health['ok'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "schema_parity_ok: " . (($schema['schema_parity_ok'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "invalid_property_list_id_rows: " . (int) ($health['invalid_property_list_id_rows'] ?? 0) . PHP_EOL;
echo "missing_due_period_rows: " . (int) ($health['missing_due_period_rows'] ?? 0) . PHP_EOL;
echo "duplicate_active_monthly_groups: " . (int) ($health['duplicate_active_monthly_groups'] ?? 0) . PHP_EOL;
echo "property_list_id_not_null: " . (($schema['property_list_id_not_null'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "due_period_not_null: " . (($schema['due_period_not_null'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "active_generated_columns_present: " . (($schema['active_generated_columns_present'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "active_monthly_unique_index_present: " . (($schema['active_monthly_unique_index_present'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "property_list_fk_present: " . (($schema['property_list_fk_present'] ?? false) ? 'true' : 'false') . PHP_EOL;
echo "property_list_fk_delete_rule: " . (string) ($schema['property_list_fk_delete_rule'] ?? '') . PHP_EOL;
echo "monthly_enforcement_migrations_applied: " . (($schema['monthly_enforcement_migrations_applied'] ?? false) ? 'true' : 'false') . PHP_EOL;

if ($duplicates) {
    echo "duplicate_group_samples:\n";
    foreach ($duplicates as $group) {
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

if (($report['ok'] ?? false) !== true) {
    exit(1);
}
