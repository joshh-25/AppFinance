<?php
/*
 * Finance App File: backend/src/Modules/AccountLookup/LegacyAccountLookup.php
 * Purpose: Account-number directory import and lookup API handlers.
 */

if (!defined('ACCOUNT_LOOKUP_UTILITY_TYPES')) {
    define('ACCOUNT_LOOKUP_UTILITY_TYPES', ['water', 'electricity', 'internet']);
}

function ensure_account_lookup_directory_table($pdo)
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS `account_lookup_directory` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `account_number_raw` VARCHAR(180) NOT NULL DEFAULT '',
            `account_number_normalized` VARCHAR(180) NOT NULL DEFAULT '',
            `utility_type` VARCHAR(40) NOT NULL DEFAULT '',
            `property_name` VARCHAR(255) NOT NULL DEFAULT '',
            `property_name_normalized` VARCHAR(255) NOT NULL DEFAULT '',
            `property_list_id` INT NULL,
            `billing_month` VARCHAR(7) NOT NULL DEFAULT '',
            `source_file` VARCHAR(255) NOT NULL DEFAULT '',
            `sheet_name` VARCHAR(120) NOT NULL DEFAULT '',
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT `fk_account_lookup_property_list`
                FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`)
                ON DELETE SET NULL ON UPDATE CASCADE,
            UNIQUE KEY `uniq_account_lookup_entry` (
                `account_number_normalized`,
                `utility_type`,
                `property_name_normalized`,
                `billing_month`
            ),
            INDEX `idx_account_lookup_account` (`account_number_normalized`),
            INDEX `idx_account_lookup_account_utility` (`account_number_normalized`, `utility_type`),
            INDEX `idx_account_lookup_property_name` (`property_name_normalized`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function normalize_account_lookup_text($value)
{
    return trim((string) preg_replace('/\s+/', ' ', (string) $value));
}

function normalize_account_lookup_account_number($value)
{
    $raw = strtolower(normalize_account_lookup_text($value));
    return preg_replace('/[^a-z0-9]/', '', $raw);
}

function normalize_account_lookup_property_name($value)
{
    return normalize_account_lookup_text($value);
}

function normalize_account_lookup_utility_type($value)
{
    $raw = strtolower(normalize_account_lookup_text($value));
    if ($raw === 'wifi') {
        return 'internet';
    }
    if ($raw === 'association') {
        return '';
    }
    if (in_array($raw, ACCOUNT_LOOKUP_UTILITY_TYPES, true)) {
        return $raw;
    }
    return '';
}

function normalize_account_lookup_billing_month($value)
{
    $raw = normalize_billing_period_value($value);
    if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $raw)) {
        return $raw;
    }
    return '';
}

function find_property_record_for_account_lookup($pdo, $propertyName, $billingMonth = '')
{
    $safeProperty = normalize_account_lookup_property_name($propertyName);
    $safeMonth = normalize_account_lookup_billing_month($billingMonth);
    if ($safeProperty === '') {
        return null;
    }

    if ($safeMonth !== '') {
        $stmt = $pdo->prepare(
            "SELECT
                `id`,
                `dd`,
                `property`,
                `billing_period`,
                `unit_owner`,
                `classification`,
                `deposit`,
                `rent`,
                `per_property_status`,
                `real_property_tax`,
                `rpt_payment_status`,
                `penalty`
             FROM `property_list`
             WHERE LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
               AND TRIM(COALESCE(`billing_period`, '')) = TRIM(?)
             ORDER BY `updated_at` DESC, `id` DESC
             LIMIT 1"
        );
        $stmt->execute([$safeProperty, $safeMonth]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $row;
        }
    }

    $fallback = $pdo->prepare(
        "SELECT
            `id`,
            `dd`,
            `property`,
            `billing_period`,
            `unit_owner`,
            `classification`,
            `deposit`,
            `rent`,
            `per_property_status`,
            `real_property_tax`,
            `rpt_payment_status`,
            `penalty`
         FROM `property_list`
         WHERE LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
         ORDER BY
           CASE WHEN TRIM(COALESCE(`billing_period`, '')) = '' THEN 0 ELSE 1 END,
           `updated_at` DESC,
           `id` DESC
         LIMIT 1"
    );
    $fallback->execute([$safeProperty]);
    $row = $fallback->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function map_account_lookup_row_for_response($row)
{
    if (!is_array($row)) {
        return null;
    }

    $mapped = [
        'id' => (int) ($row['id'] ?? 0),
        'account_number_raw' => (string) ($row['account_number_raw'] ?? ''),
        'account_number_normalized' => (string) ($row['account_number_normalized'] ?? ''),
        'utility_type' => (string) ($row['utility_type'] ?? ''),
        'property_name' => (string) ($row['property_name'] ?? ''),
        'billing_month' => (string) ($row['billing_month'] ?? ''),
        'source_file' => (string) ($row['source_file'] ?? ''),
        'sheet_name' => (string) ($row['sheet_name'] ?? ''),
    ];

    if (isset($row['pl_id'])) {
        $mapped['property_list_id'] = (int) ($row['pl_id'] ?? 0);
        $mapped['dd'] = (string) ($row['pl_dd'] ?? '');
        $mapped['property'] = (string) ($row['pl_property'] ?? '');
        $mapped['billing_period'] = (string) ($row['pl_billing_period'] ?? '');
        $mapped['unit_owner'] = (string) ($row['pl_unit_owner'] ?? '');
        $mapped['classification'] = (string) ($row['pl_classification'] ?? '');
        $mapped['deposit'] = (string) ($row['pl_deposit'] ?? '');
        $mapped['rent'] = (string) ($row['pl_rent'] ?? '');
        $mapped['per_property_status'] = (string) ($row['pl_per_property_status'] ?? '');
        $mapped['real_property_tax'] = (string) ($row['pl_real_property_tax'] ?? '');
        $mapped['rpt_payment_status'] = (string) ($row['pl_rpt_payment_status'] ?? '');
        $mapped['penalty'] = (string) ($row['pl_penalty'] ?? '');
    } else {
        $mapped['property_list_id'] = isset($row['property_list_id']) ? (int) ($row['property_list_id'] ?? 0) : 0;
        $mapped['dd'] = (string) ($row['dd'] ?? '');
        $mapped['property'] = (string) ($row['property'] ?? $mapped['property_name']);
        $mapped['billing_period'] = (string) ($row['billing_period'] ?? '');
        $mapped['unit_owner'] = (string) ($row['unit_owner'] ?? '');
        $mapped['classification'] = (string) ($row['classification'] ?? '');
        $mapped['deposit'] = (string) ($row['deposit'] ?? '');
        $mapped['rent'] = (string) ($row['rent'] ?? '');
        $mapped['per_property_status'] = (string) ($row['per_property_status'] ?? '');
        $mapped['real_property_tax'] = (string) ($row['real_property_tax'] ?? '');
        $mapped['rpt_payment_status'] = (string) ($row['rpt_payment_status'] ?? '');
        $mapped['penalty'] = (string) ($row['penalty'] ?? '');
    }

    return $mapped;
}

function handle_account_lookup_actions($action)
{
    if ($action === 'account_lookup_import' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $decoded = json_decode($input, true);
        if (!is_array($decoded)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $entries = $decoded['entries'] ?? [];
        if (!is_array($entries) || count($entries) === 0) {
            echo json_encode(['success' => false, 'message' => 'No account-directory entries were provided.']);
            return true;
        }

        if (count($entries) > 50000) {
            echo json_encode(['success' => false, 'message' => 'Too many entries in one import. Limit is 50,000 rows.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            ensure_account_lookup_directory_table($pdo);
            $pdo->beginTransaction();

            $stmt = $pdo->prepare(
                "INSERT INTO `account_lookup_directory` (
                    `account_number_raw`,
                    `account_number_normalized`,
                    `utility_type`,
                    `property_name`,
                    `property_name_normalized`,
                    `property_list_id`,
                    `billing_month`,
                    `source_file`,
                    `sheet_name`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    `account_number_raw` = VALUES(`account_number_raw`),
                    `property_name` = VALUES(`property_name`),
                    `property_list_id` = VALUES(`property_list_id`),
                    `source_file` = VALUES(`source_file`),
                    `sheet_name` = VALUES(`sheet_name`),
                    `updated_at` = CURRENT_TIMESTAMP"
            );

            $inserted = 0;
            $updated = 0;
            $skipped = 0;

            foreach ($entries as $entry) {
                if (!is_array($entry)) {
                    $skipped++;
                    continue;
                }

                $rawAccount = normalize_account_lookup_text($entry['account_number'] ?? '');
                $normalizedAccount = normalize_account_lookup_account_number($rawAccount);
                $utilityType = normalize_account_lookup_utility_type($entry['utility_type'] ?? '');
                $propertyName = normalize_account_lookup_property_name($entry['property_name'] ?? $entry['property'] ?? '');
                $propertyNameNormalized = strtolower($propertyName);
                $billingMonth = normalize_account_lookup_billing_month($entry['billing_month'] ?? $entry['billing_period'] ?? '');
                $sourceFile = normalize_account_lookup_text($entry['source_file'] ?? '');
                $sheetName = normalize_account_lookup_text($entry['sheet_name'] ?? '');

                if ($normalizedAccount === '' || $utilityType === '' || $propertyName === '') {
                    $skipped++;
                    continue;
                }

                $resolvedProperty = find_property_record_for_account_lookup($pdo, $propertyName, $billingMonth);
                $propertyListId = $resolvedProperty ? (int) ($resolvedProperty['id'] ?? 0) : 0;
                $propertyListId = $propertyListId > 0 ? $propertyListId : null;

                $stmt->execute([
                    $rawAccount,
                    $normalizedAccount,
                    $utilityType,
                    $propertyName,
                    $propertyNameNormalized,
                    $propertyListId,
                    $billingMonth,
                    $sourceFile,
                    $sheetName,
                ]);

                $affected = (int) $stmt->rowCount();
                if ($affected === 1) {
                    $inserted++;
                } elseif ($affected >= 2) {
                    $updated++;
                } else {
                    $updated++;
                }
            }

            $pdo->commit();
            audit_log_event('account_lookup_import', [
                'total_entries' => count($entries),
                'inserted' => $inserted,
                'updated' => $updated,
                'skipped' => $skipped,
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Account directory import completed.',
                'data' => [
                    'total' => count($entries),
                    'inserted' => $inserted,
                    'updated' => $updated,
                    'skipped' => $skipped,
                ],
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'account_lookup_search') {
        $accountNumber = query_string_param('account_number', '');
        $utilityType = normalize_account_lookup_utility_type(query_string_param('utility_type', ''));
        $billingMonth = normalize_account_lookup_billing_month(query_string_param('billing_period', ''));
        $normalizedAccount = normalize_account_lookup_account_number($accountNumber);

        if ($normalizedAccount === '') {
            echo json_encode(['success' => false, 'message' => 'Account number is required.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            ensure_account_lookup_directory_table($pdo);

            $where = ["d.`account_number_normalized` = ?"];
            $params = [$normalizedAccount];
            if ($utilityType !== '') {
                $where[] = "d.`utility_type` = ?";
                $params[] = $utilityType;
            }

            $orderParts = [];
            if ($billingMonth !== '') {
                $orderParts[] = "CASE WHEN d.`billing_month` = ? THEN 0 WHEN d.`billing_month` = '' THEN 1 ELSE 2 END";
                $params[] = $billingMonth;
            }
            $orderParts[] = "d.`updated_at` DESC";
            $orderParts[] = "d.`id` DESC";
            $orderSql = implode(', ', $orderParts);

            $sql = "SELECT
                        d.`id`,
                        d.`account_number_raw`,
                        d.`account_number_normalized`,
                        d.`utility_type`,
                        d.`property_name`,
                        d.`billing_month`,
                        d.`source_file`,
                        d.`sheet_name`,
                        d.`property_list_id`,
                        pl.`id` AS `pl_id`,
                        pl.`dd` AS `pl_dd`,
                        pl.`property` AS `pl_property`,
                        pl.`billing_period` AS `pl_billing_period`,
                        pl.`unit_owner` AS `pl_unit_owner`,
                        pl.`classification` AS `pl_classification`,
                        pl.`deposit` AS `pl_deposit`,
                        pl.`rent` AS `pl_rent`,
                        pl.`per_property_status` AS `pl_per_property_status`,
                        pl.`real_property_tax` AS `pl_real_property_tax`,
                        pl.`rpt_payment_status` AS `pl_rpt_payment_status`,
                        pl.`penalty` AS `pl_penalty`
                    FROM `account_lookup_directory` d
                    LEFT JOIN `property_list` pl ON pl.`id` = d.`property_list_id`
                    WHERE " . implode(' AND ', $where) . "
                    ORDER BY {$orderSql}
                    LIMIT 30";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 0) {
                echo json_encode(['success' => false, 'message' => 'No matching property found for this account number.']);
                return true;
            }

            $best = $rows[0];
            if ((int) ($best['pl_id'] ?? 0) <= 0) {
                $resolved = find_property_record_for_account_lookup($pdo, $best['property_name'] ?? '', $billingMonth);
                if ($resolved) {
                    $best['pl_id'] = $resolved['id'] ?? null;
                    $best['pl_dd'] = $resolved['dd'] ?? '';
                    $best['pl_property'] = $resolved['property'] ?? '';
                    $best['pl_billing_period'] = $resolved['billing_period'] ?? '';
                    $best['pl_unit_owner'] = $resolved['unit_owner'] ?? '';
                    $best['pl_classification'] = $resolved['classification'] ?? '';
                    $best['pl_deposit'] = $resolved['deposit'] ?? '';
                    $best['pl_rent'] = $resolved['rent'] ?? '';
                    $best['pl_per_property_status'] = $resolved['per_property_status'] ?? '';
                    $best['pl_real_property_tax'] = $resolved['real_property_tax'] ?? '';
                    $best['pl_rpt_payment_status'] = $resolved['rpt_payment_status'] ?? '';
                    $best['pl_penalty'] = $resolved['penalty'] ?? '';
                }
            }

            $mapped = map_account_lookup_row_for_response($best);
            echo json_encode([
                'success' => true,
                'message' => 'Matching property found.',
                'data' => $mapped,
            ]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    return false;
}

