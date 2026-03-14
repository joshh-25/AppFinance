<?php
/*
 * Finance App File: backend/src/Modules/Bills/ReviewQueueStore.php
 * Purpose: Persist and summarize the Bills Review queue for the signed-in user.
 */

function normalize_review_queue_status($value)
{
    $normalized = strtolower(trim((string) $value));
    $allowed = ['ready', 'needs_review', 'scan_failed', 'save_failed', 'saving', 'saved'];
    return in_array($normalized, $allowed, true) ? $normalized : 'needs_review';
}

function sanitize_review_queue_text($value, $maxLength = 65535)
{
    $normalized = trim((string) $value);
    if ($normalized === '') {
        return '';
    }

    return substr($normalized, 0, max(1, (int) $maxLength));
}

function normalize_review_queue_data_payload($value)
{
    if (!is_array($value)) {
        return [];
    }

    return $value;
}

function normalize_review_queue_diagnostics_payload($value)
{
    $data = is_array($value) ? $value : [];

    return [
        'code' => sanitize_review_queue_text($data['code'] ?? '', 80),
        'title' => sanitize_review_queue_text($data['title'] ?? '', 160),
        'message' => sanitize_review_queue_text($data['message'] ?? '', 2000),
        'details' => sanitize_review_queue_text($data['details'] ?? '', 4000),
        'request_id' => sanitize_review_queue_text($data['request_id'] ?? '', 120),
        'status_code' => max(0, (int) ($data['status_code'] ?? 0)),
        'retry_count' => max(0, (int) ($data['retry_count'] ?? 0)),
    ];
}

function normalize_review_queue_row_payload($row, $sortOrder = 0)
{
    if (!is_array($row)) {
        return null;
    }

    $clientRowId = sanitize_review_queue_text($row['id'] ?? $row['client_row_id'] ?? '', 120);
    if ($clientRowId === '') {
        return null;
    }

    $billType = normalize_bill_type_filter($row['bill_type'] ?? '');
    $status = normalize_review_queue_status($row['status'] ?? '');
    $data = normalize_review_queue_data_payload($row['data'] ?? []);
    $diagnostics = normalize_review_queue_diagnostics_payload($row['diagnostics'] ?? []);

    return [
        'client_row_id' => $clientRowId,
        'sort_order' => max(0, (int) $sortOrder),
        'source_file_name' => sanitize_review_queue_text($row['source_file_name'] ?? '', 255),
        'bill_type' => $billType,
        'status' => $status,
        'scan_error' => sanitize_review_queue_text($row['scan_error'] ?? '', 4000),
        'save_error' => sanitize_review_queue_text($row['save_error'] ?? '', 4000),
        'row_data_json' => json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'diagnostics_json' => json_encode($diagnostics, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ];
}

function decode_review_queue_json_column($value)
{
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function map_review_queue_row($row)
{
    if (!is_array($row)) {
        return [];
    }

    return [
        'id' => (string) ($row['client_row_id'] ?? ''),
        'source_file_name' => (string) ($row['source_file_name'] ?? ''),
        'bill_type' => (string) ($row['bill_type'] ?? ''),
        'status' => normalize_review_queue_status($row['status'] ?? ''),
        'scan_error' => (string) ($row['scan_error'] ?? ''),
        'save_error' => (string) ($row['save_error'] ?? ''),
        'data' => decode_review_queue_json_column($row['row_data_json'] ?? ''),
        'diagnostics' => normalize_review_queue_diagnostics_payload(
            decode_review_queue_json_column($row['diagnostics_json'] ?? '')
        ),
    ];
}

function fetch_review_queue_rows_for_user(PDO $pdo, $userId)
{
    $stmt = $pdo->prepare(
        "SELECT
            `client_row_id`,
            `source_file_name`,
            `bill_type`,
            `status`,
            `scan_error`,
            `save_error`,
            `row_data_json`,
            `diagnostics_json`
         FROM `bill_review_queue`
         WHERE `user_id` = ?
         ORDER BY `sort_order` ASC, `id` ASC"
    );
    $stmt->execute([(int) $userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map('map_review_queue_row', $rows);
}

function replace_review_queue_rows_for_user(PDO $pdo, $userId, array $rows)
{
    $normalizedRows = [];
    foreach ($rows as $index => $row) {
        $normalizedRow = normalize_review_queue_row_payload($row, $index);
        if ($normalizedRow !== null) {
            $normalizedRows[] = $normalizedRow;
        }
    }

    $pdo->beginTransaction();
    try {
        $deleteStmt = $pdo->prepare('DELETE FROM `bill_review_queue` WHERE `user_id` = ?');
        $deleteStmt->execute([(int) $userId]);

        if ($normalizedRows) {
            $insertStmt = $pdo->prepare(
                "INSERT INTO `bill_review_queue` (
                    `user_id`,
                    `client_row_id`,
                    `sort_order`,
                    `source_file_name`,
                    `bill_type`,
                    `status`,
                    `scan_error`,
                    `save_error`,
                    `row_data_json`,
                    `diagnostics_json`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            foreach ($normalizedRows as $row) {
                $insertStmt->execute([
                    (int) $userId,
                    $row['client_row_id'],
                    $row['sort_order'],
                    $row['source_file_name'],
                    $row['bill_type'],
                    $row['status'],
                    $row['scan_error'],
                    $row['save_error'],
                    $row['row_data_json'] !== false ? $row['row_data_json'] : '{}',
                    $row['diagnostics_json'] !== false ? $row['diagnostics_json'] : '{}',
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    return fetch_review_queue_rows_for_user($pdo, $userId);
}

function fetch_review_queue_summary_for_user(PDO $pdo, $userId)
{
    $stmt = $pdo->prepare(
        "SELECT
            COUNT(*) AS `total`,
            SUM(CASE WHEN `status` = 'needs_review' THEN 1 ELSE 0 END) AS `needs_review`,
            SUM(CASE WHEN `status` = 'scan_failed' THEN 1 ELSE 0 END) AS `scan_failed`,
            SUM(CASE WHEN `status` = 'save_failed' THEN 1 ELSE 0 END) AS `save_failed`,
            SUM(CASE WHEN `status` = 'ready' THEN 1 ELSE 0 END) AS `ready`,
            SUM(CASE WHEN `status` = 'saved' THEN 1 ELSE 0 END) AS `saved`
         FROM `bill_review_queue`
         WHERE `user_id` = ?"
    );
    $stmt->execute([(int) $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    return [
        'total' => max(0, (int) ($row['total'] ?? 0)),
        'needs_review' => max(0, (int) ($row['needs_review'] ?? 0)),
        'scan_failed' => max(0, (int) ($row['scan_failed'] ?? 0)),
        'save_failed' => max(0, (int) ($row['save_failed'] ?? 0)),
        'ready' => max(0, (int) ($row['ready'] ?? 0)),
        'saved' => max(0, (int) ($row['saved'] ?? 0)),
    ];
}
