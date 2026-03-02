<?php
/*
 * Finance App File: backend/tools/merge_duplicate_monthly_bills.php
 * Purpose: One-time cleanup utility to merge duplicate active monthly bill rows.
 */

declare(strict_types=1);

require_once __DIR__ . '/../db.php';

function text_or_empty($value): string
{
    return trim((string) $value);
}

function bill_group_key(array $row): string
{
    $propertyListId = (int) ($row['property_list_id'] ?? 0);
    $period = text_or_empty($row['billing_period'] ?? '');

    if ($propertyListId > 0) {
        return 'pl:' . $propertyListId . '|period:' . strtolower($period);
    }

    $dd = strtolower(text_or_empty($row['dd'] ?? ''));
    $property = strtolower(text_or_empty($row['property'] ?? ''));
    return 'legacy:' . $dd . '|' . $property . '|period:' . strtolower($period);
}

function merge_rows_for_keep(array $rowsDescById): array
{
    $mergeFields = [
        'property_list_id',
        'dd',
        'property',
        'billing_period',
        'unit_owner',
        'bill_type',
        'classification',
        'deposit',
        'rent',
        'internet_provider',
        'internet_account_no',
        'wifi_amount',
        'wifi_due_date',
        'wifi_payment_status',
        'water_account_no',
        'water_amount',
        'water_due_date',
        'water_payment_status',
        'electricity_account_no',
        'electricity_amount',
        'electricity_due_date',
        'electricity_payment_status',
        'association_dues',
        'association_due_date',
        'association_payment_status',
        'real_property_tax',
        'rpt_payment_status',
        'penalty',
        'per_property_status',
    ];

    $merged = [];
    foreach ($mergeFields as $field) {
        $merged[$field] = '';
    }

    foreach ($rowsDescById as $row) {
        foreach ($mergeFields as $field) {
            if ($field === 'property_list_id') {
                $existing = (int) ($merged[$field] ?? 0);
                $candidate = (int) ($row[$field] ?? 0);
                if ($existing <= 0 && $candidate > 0) {
                    $merged[$field] = $candidate;
                }
                continue;
            }

            if (text_or_empty($merged[$field]) !== '') {
                continue;
            }

            $candidate = text_or_empty($row[$field] ?? '');
            if ($candidate !== '') {
                $merged[$field] = $candidate;
            }
        }
    }

    $merged['property_list_id'] = (int) ($merged['property_list_id'] ?? 0);
    return $merged;
}

function run_cleanup(bool $apply): void
{
    $pdo = get_db_connection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $rows = $pdo->query(
        "SELECT *
         FROM `property_billing_records`
         WHERE `is_hidden` = 0
         ORDER BY `id` DESC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $groups = [];
    foreach ($rows as $row) {
        $key = bill_group_key($row);
        if (!isset($groups[$key])) {
            $groups[$key] = [];
        }
        $groups[$key][] = $row;
    }

    $duplicateGroups = array_filter($groups, static function ($groupRows) {
        return is_array($groupRows) && count($groupRows) > 1;
    });

    if (!$duplicateGroups) {
        echo "No duplicate active monthly rows found.\n";
        return;
    }

    $updatedGroups = 0;
    $hiddenRowsTotal = 0;

    $updateStmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET `property_list_id` = ?, `dd` = ?, `property` = ?, `billing_period` = ?, `unit_owner` = ?,
             `bill_type` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
             `internet_provider` = ?, `internet_account_no` = ?, `wifi_amount` = ?, `wifi_due_date` = ?, `wifi_payment_status` = ?,
             `water_account_no` = ?, `water_amount` = ?, `water_due_date` = ?, `water_payment_status` = ?,
             `electricity_account_no` = ?, `electricity_amount` = ?, `electricity_due_date` = ?, `electricity_payment_status` = ?,
             `association_dues` = ?, `association_due_date` = ?, `association_payment_status` = ?,
             `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?, `per_property_status` = ?,
             `is_hidden` = 0
         WHERE `id` = ?"
    );

    $hideStmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET `is_hidden` = 1
         WHERE `id` = ?"
    );

    foreach ($duplicateGroups as $groupKey => $groupRows) {
        usort($groupRows, static function ($a, $b) {
            return ((int) ($b['id'] ?? 0)) <=> ((int) ($a['id'] ?? 0));
        });

        $keepRow = $groupRows[0];
        $keepId = (int) ($keepRow['id'] ?? 0);
        if ($keepId <= 0) {
            continue;
        }

        $merged = merge_rows_for_keep($groupRows);
        $toHide = array_slice($groupRows, 1);
        $hideIds = array_values(array_filter(array_map(static function ($row) {
            return (int) ($row['id'] ?? 0);
        }, $toHide), static function ($id) {
            return $id > 0;
        }));

        echo "[group] {$groupKey} keep_id={$keepId} hide_ids=" . implode(',', $hideIds) . "\n";

        if (!$apply) {
            continue;
        }

        $pdo->beginTransaction();
        try {
            $updateStmt->execute([
                (int) ($merged['property_list_id'] ?? 0),
                (string) ($merged['dd'] ?? ''),
                (string) ($merged['property'] ?? ''),
                (string) ($merged['billing_period'] ?? ''),
                (string) ($merged['unit_owner'] ?? ''),
                (string) ($merged['bill_type'] ?? ''),
                (string) ($merged['classification'] ?? ''),
                (string) ($merged['deposit'] ?? ''),
                (string) ($merged['rent'] ?? ''),
                (string) ($merged['internet_provider'] ?? ''),
                (string) ($merged['internet_account_no'] ?? ''),
                (string) ($merged['wifi_amount'] ?? ''),
                (string) ($merged['wifi_due_date'] ?? ''),
                (string) ($merged['wifi_payment_status'] ?? ''),
                (string) ($merged['water_account_no'] ?? ''),
                (string) ($merged['water_amount'] ?? ''),
                (string) ($merged['water_due_date'] ?? ''),
                (string) ($merged['water_payment_status'] ?? ''),
                (string) ($merged['electricity_account_no'] ?? ''),
                (string) ($merged['electricity_amount'] ?? ''),
                (string) ($merged['electricity_due_date'] ?? ''),
                (string) ($merged['electricity_payment_status'] ?? ''),
                (string) ($merged['association_dues'] ?? ''),
                (string) ($merged['association_due_date'] ?? ''),
                (string) ($merged['association_payment_status'] ?? ''),
                (string) ($merged['real_property_tax'] ?? ''),
                (string) ($merged['rpt_payment_status'] ?? ''),
                (string) ($merged['penalty'] ?? ''),
                (string) ($merged['per_property_status'] ?? ''),
                $keepId,
            ]);

            foreach ($hideIds as $hideId) {
                $hideStmt->execute([$hideId]);
            }

            $pdo->commit();
            $updatedGroups += 1;
            $hiddenRowsTotal += count($hideIds);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    if (!$apply) {
        echo "\nDry run complete. No changes written.\n";
        echo "Run with --apply to execute updates.\n";
        return;
    }

    echo "\nCleanup complete.\n";
    echo "Groups merged: {$updatedGroups}\n";
    echo "Rows hidden: {$hiddenRowsTotal}\n";
}

$argvList = $_SERVER['argv'] ?? [];
$apply = in_array('--apply', $argvList, true);

try {
    run_cleanup($apply);
} catch (Throwable $e) {
    fwrite(STDERR, 'Cleanup failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

