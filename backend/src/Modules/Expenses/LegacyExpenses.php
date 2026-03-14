<?php
/*
 * Finance App File: backend/src/Modules/Expenses/LegacyExpenses.php
 * Purpose: Expenses CRUD API handlers.
 */

function ensure_expenses_table($pdo)
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS `expenses` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `expense_date` DATE NOT NULL,
            `payee` VARCHAR(180) NOT NULL DEFAULT '',
            `description` TEXT NOT NULL,
            `category` VARCHAR(120) NOT NULL DEFAULT '',
            `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            `remarks` TEXT NULL,
            `payment` VARCHAR(120) NOT NULL DEFAULT '',
            `tin_number` VARCHAR(64) NOT NULL DEFAULT '',
            `non_vat` TINYINT(1) NOT NULL DEFAULT 0,
            `ocr_raw_text` MEDIUMTEXT NULL,
            `created_by` INT NULL,
            `updated_by` INT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_expenses_date` (`expense_date`),
            INDEX `idx_expenses_category` (`category`),
            INDEX `idx_expenses_payee` (`payee`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function normalize_expense_date_value($value)
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }

    if (preg_match('/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/', $raw)) {
        return $raw;
    }

    if (preg_match('/^\d{4}\/(0[1-9]|1[0-2])\/\d{2}$/', $raw)) {
        return str_replace('/', '-', $raw);
    }

    $timestamp = strtotime($raw);
    if ($timestamp === false) {
        return '';
    }
    return gmdate('Y-m-d', $timestamp);
}

function normalize_expense_amount_value($value)
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }

    $normalized = str_replace([',', ' '], '', $raw);
    if (!is_numeric($normalized)) {
        return null;
    }

    return number_format((float) $normalized, 2, '.', '');
}

function normalize_expense_non_vat_value($value)
{
    if (is_bool($value)) {
        return $value ? 1 : 0;
    }

    if (is_numeric($value)) {
        return ((int) $value) > 0 ? 1 : 0;
    }

    $raw = strtolower(trim((string) $value));
    return in_array($raw, ['1', 'true', 'yes', 'y', 'on'], true) ? 1 : 0;
}

function normalize_expense_payload($source)
{
    $data = is_array($source) ? $source : [];
    return [
        'expense_date' => normalize_expense_date_value($data['expense_date'] ?? $data['date'] ?? ''),
        'payee' => trim((string) ($data['payee'] ?? '')),
        'description' => trim((string) ($data['description'] ?? '')),
        'category' => trim((string) ($data['category'] ?? '')),
        'amount' => normalize_expense_amount_value($data['amount'] ?? ''),
        'remarks' => trim((string) ($data['remarks'] ?? '')),
        'payment' => trim((string) ($data['payment'] ?? $data['payment_method'] ?? '')),
        'tin_number' => trim((string) ($data['tin_number'] ?? $data['tin'] ?? '')),
        'non_vat' => normalize_expense_non_vat_value($data['non_vat'] ?? $data['nonVat'] ?? 0),
        'ocr_raw_text' => trim((string) ($data['ocr_raw_text'] ?? $data['ocrRawText'] ?? '')),
    ];
}

function validate_expense_payload($payload)
{
    $amount = $payload['amount'] ?? null;

    if (($payload['expense_date'] ?? '') === '') {
        return 'Date is required (YYYY-MM-DD).';
    }
    if (($payload['payee'] ?? '') === '') {
        return 'Payee is required.';
    }
    if (($payload['description'] ?? '') === '') {
        return 'Description is required.';
    }
    if ($amount === '') {
        return 'Amount is required.';
    }
    if ($amount === null) {
        return 'Amount must be a valid number.';
    }
    if ((float) $amount < 0) {
        return 'Amount cannot be negative.';
    }
    return '';
}

function map_expense_row($row)
{
    if (!is_array($row)) {
        return [];
    }

    $row['id'] = (int) ($row['id'] ?? 0);
    $row['amount'] = number_format((float) ($row['amount'] ?? 0), 2, '.', '');
    $row['non_vat'] = ((int) ($row['non_vat'] ?? 0)) === 1 ? 1 : 0;
    $row['created_by'] = isset($row['created_by']) ? (int) $row['created_by'] : null;
    $row['updated_by'] = isset($row['updated_by']) ? (int) $row['updated_by'] : null;
    return $row;
}

function find_expense_by_id($pdo, $id)
{
    $stmt = $pdo->prepare(
        "SELECT
            `id`,
            `expense_date`,
            `payee`,
            `description`,
            `category`,
            `amount`,
            `remarks`,
            `payment`,
            `tin_number`,
            `non_vat`,
            `ocr_raw_text`,
            `created_by`,
            `updated_by`,
            `created_at`,
            `updated_at`
         FROM `expenses`
         WHERE `id` = ?
         LIMIT 1"
    );
    $stmt->execute([(int) $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? map_expense_row($row) : null;
}

function escape_expense_like_pattern($value)
{
    return strtr((string) $value, [
        '\\' => '\\\\',
        '%' => '\%',
        '_' => '\_',
    ]);
}

function handle_expense_actions($action)
{
    if ($action === 'expense_list') {
        try {
            $pdo = get_db_connection();
            ensure_expenses_table($pdo);
            $pagination = read_pagination_from_query(25, 200);
            $search = trim((string) query_string_param('q', ''));
            $whereParts = ['1=1'];
            $params = [];

            if ($search !== '') {
                $likeValue = '%' . escape_expense_like_pattern($search) . '%';
                $whereParts[] = "(
                    COALESCE(`payee`, '') LIKE ? ESCAPE '\\\\'
                    OR COALESCE(`description`, '') LIKE ? ESCAPE '\\\\'
                    OR COALESCE(`category`, '') LIKE ? ESCAPE '\\\\'
                    OR COALESCE(`remarks`, '') LIKE ? ESCAPE '\\\\'
                    OR COALESCE(`payment`, '') LIKE ? ESCAPE '\\\\'
                    OR COALESCE(`tin_number`, '') LIKE ? ESCAPE '\\\\'
                )";
                $params = [$likeValue, $likeValue, $likeValue, $likeValue, $likeValue, $likeValue];
            }

            $whereSql = implode(' AND ', $whereParts);
            $fromSql = "FROM `expenses` WHERE {$whereSql}";

            if ($pagination['enabled']) {
                $countStmt = $pdo->prepare("SELECT COUNT(*) {$fromSql}");
                $countStmt->execute($params);
                $total = (int) $countStmt->fetchColumn();
            } else {
                $total = 0;
            }

            $sql = "SELECT
                        `id`,
                        `expense_date`,
                        `payee`,
                        `description`,
                        `category`,
                        `amount`,
                        `remarks`,
                        `payment`,
                        `tin_number`,
                        `non_vat`,
                        `ocr_raw_text`,
                        `created_by`,
                        `updated_by`,
                        `created_at`,
                        `updated_at`
                    {$fromSql}
                    ORDER BY `expense_date` DESC, `id` DESC";
            if ($pagination['enabled']) {
                $safeLimit = max(1, (int) $pagination['per_page']);
                $safeOffset = max(0, (int) $pagination['offset']);
                $sql .= " LIMIT {$safeLimit} OFFSET {$safeOffset}";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = array_map('map_expense_row', $rows);

            if ($pagination['enabled']) {
                $meta = build_pagination_meta($pagination['page'], $pagination['per_page'], $total);
                echo json_encode(['success' => true, 'data' => $data, 'meta' => $meta]);
            } else {
                echo json_encode(['success' => true, 'data' => $data]);
            }
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'expense_create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $payload = normalize_expense_payload($data);
        $validationError = validate_expense_payload($payload);
        if ($validationError !== '') {
            echo json_encode(['success' => false, 'message' => $validationError]);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_expenses_table($pdo);
            $pdo->beginTransaction();

            $actorUserId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
            $actorUserId = $actorUserId > 0 ? $actorUserId : null;

            $stmt = $pdo->prepare(
                "INSERT INTO `expenses` (
                    `expense_date`,
                    `payee`,
                    `description`,
                    `category`,
                    `amount`,
                    `remarks`,
                    `payment`,
                    `tin_number`,
                    `non_vat`,
                    `ocr_raw_text`,
                    `created_by`,
                    `updated_by`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $payload['expense_date'],
                $payload['payee'],
                $payload['description'],
                $payload['category'],
                $payload['amount'],
                $payload['remarks'],
                $payload['payment'],
                $payload['tin_number'],
                $payload['non_vat'],
                $payload['ocr_raw_text'],
                $actorUserId,
                $actorUserId,
            ]);

            $newId = (int) $pdo->lastInsertId();
            $row = find_expense_by_id($pdo, $newId);
            $pdo->commit();

            audit_log_event('expense_create', [
                'expense_id' => $newId,
                'amount' => (string) ($payload['amount'] ?? '0.00'),
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Expense saved successfully.',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'expense_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'A valid expense id is required.']);
            return true;
        }

        $payload = normalize_expense_payload($data);
        $validationError = validate_expense_payload($payload);
        if ($validationError !== '') {
            echo json_encode(['success' => false, 'message' => $validationError]);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_expenses_table($pdo);
            $existing = find_expense_by_id($pdo, $id);
            if (!$existing) {
                echo json_encode(['success' => false, 'message' => 'Expense record not found.']);
                return true;
            }

            $actorUserId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0;
            $actorUserId = $actorUserId > 0 ? $actorUserId : null;

            $stmt = $pdo->prepare(
                "UPDATE `expenses`
                 SET
                    `expense_date` = ?,
                    `payee` = ?,
                    `description` = ?,
                    `category` = ?,
                    `amount` = ?,
                    `remarks` = ?,
                    `payment` = ?,
                    `tin_number` = ?,
                    `non_vat` = ?,
                    `ocr_raw_text` = ?,
                    `updated_by` = ?
                 WHERE `id` = ?
                 LIMIT 1"
            );
            $stmt->execute([
                $payload['expense_date'],
                $payload['payee'],
                $payload['description'],
                $payload['category'],
                $payload['amount'],
                $payload['remarks'],
                $payload['payment'],
                $payload['tin_number'],
                $payload['non_vat'],
                $payload['ocr_raw_text'],
                $actorUserId,
                $id,
            ]);

            $row = find_expense_by_id($pdo, $id);
            audit_log_event('expense_update', [
                'expense_id' => $id,
                'amount' => (string) ($payload['amount'] ?? '0.00'),
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Expense updated successfully.',
                'data' => $row,
            ]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'expense_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'A valid expense id is required.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_expenses_table($pdo);
            $existing = find_expense_by_id($pdo, $id);
            if (!$existing) {
                echo json_encode(['success' => false, 'message' => 'Expense record not found.']);
                return true;
            }

            $stmt = $pdo->prepare("DELETE FROM `expenses` WHERE `id` = ? LIMIT 1");
            $stmt->execute([$id]);

            audit_log_event('expense_delete', [
                'expense_id' => $id,
                'amount' => (string) ($existing['amount'] ?? '0.00'),
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Expense deleted successfully.',
            ]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    return false;
}
