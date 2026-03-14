<?php
/*
 * Finance App File: backend/tools/report_duplicate_monthly_bills.php
 * Purpose: Report duplicate active monthly bill rows by property_list_id + due_period.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

$pdo = get_db_connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$stmt = $pdo->query(
    "SELECT
        `property_list_id`,
        TRIM(COALESCE(`due_period`, '')) AS `due_period`,
        COUNT(*) AS `active_rows`,
        GROUP_CONCAT(`id` ORDER BY `id` DESC SEPARATOR ',') AS `row_ids`,
        MAX(`created_at`) AS `latest_created_at`
     FROM `property_billing_records`
     WHERE `is_hidden` = 0
     GROUP BY `property_list_id`, TRIM(COALESCE(`due_period`, ''))
     HAVING `property_list_id` > 0
        AND `due_period` <> ''
        AND COUNT(*) > 1
     ORDER BY `property_list_id` ASC, `due_period` ASC"
);

$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (!$rows) {
    echo "No duplicate active monthly rows found.\n";
    exit(0);
}

echo "Duplicate active monthly rows:\n";
foreach ($rows as $row) {
    echo sprintf(
        "- property_list_id=%d due_period=%s active_rows=%d row_ids=%s latest_created_at=%s\n",
        (int) ($row['property_list_id'] ?? 0),
        (string) ($row['due_period'] ?? ''),
        (int) ($row['active_rows'] ?? 0),
        (string) ($row['row_ids'] ?? ''),
        (string) ($row['latest_created_at'] ?? '')
    );
}
