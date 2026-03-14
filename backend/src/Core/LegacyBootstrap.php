<?php
/*
 * Finance App File: api/bootstrap.php
 * Purpose: Shared API bootstrap, config, and helper functions.
 */
require_once __DIR__ . '/SecurityRuntime.php';
apply_finance_security_headers('api');
start_finance_session();
require_once __DIR__ . '/../../db.php';

if (!defined('API_BILL_TYPES')) {
    define('API_BILL_TYPES', ['water', 'internet', 'electricity', 'association_dues']);
}

function db_error_response($e)
{
    error_log('Finance API DB error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}

function get_request_ip_address()
{
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? '',
    ];

    foreach ($candidates as $candidate) {
        $raw = trim((string) $candidate);
        if ($raw === '') {
            continue;
        }

        if (strpos($raw, ',') !== false) {
            $parts = explode(',', $raw);
            $raw = trim((string) ($parts[0] ?? ''));
        }

        if (filter_var($raw, FILTER_VALIDATE_IP)) {
            return $raw;
        }
    }

    return '0.0.0.0';
}

function audit_log_event($eventName, $context = [])
{
    $normalizedEventName = trim((string) $eventName);
    $normalizedContext = is_array($context) ? $context : [];
    $payload = [
        'event' => $normalizedEventName,
        'time_utc' => gmdate('Y-m-d\TH:i:s\Z'),
        'ip' => get_request_ip_address(),
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? '',
        'user_id' => isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0,
        'username' => trim((string) ($_SESSION['username'] ?? '')),
        'role' => trim((string) ($_SESSION['role'] ?? '')),
        'context' => $normalizedContext,
    ];

    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($encoded !== false) {
        error_log('FINANCE_AUDIT ' . $encoded);
    } else {
        error_log('FINANCE_AUDIT ' . $eventName);
    }

    try {
        $pdo = try_get_db_connection();
        if (!($pdo instanceof PDO)) {
            return;
        }
        ensure_audit_log_table($pdo);
        write_audit_log_entry($pdo, $normalizedEventName, $normalizedContext);
    } catch (Throwable $error) {
        error_log('FINANCE_AUDIT_PERSIST_FAILED ' . $normalizedEventName . ' ' . $error->getMessage());
    }
}

function ensure_audit_log_table($pdo)
{
    if (!($pdo instanceof PDO)) {
        return;
    }

    if (function_exists('table_exists') && table_exists($pdo, 'audit_log')) {
        return;
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS `audit_log` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `event_name` VARCHAR(100) NOT NULL,
            `entity_type` VARCHAR(50) NOT NULL DEFAULT '',
            `entity_id` BIGINT NOT NULL DEFAULT 0,
            `user_id` INT NOT NULL DEFAULT 0,
            `username` VARCHAR(120) NOT NULL DEFAULT '',
            `user_role` VARCHAR(20) NOT NULL DEFAULT '',
            `ip_address` VARCHAR(45) NOT NULL DEFAULT '',
            `request_method` VARCHAR(10) NOT NULL DEFAULT '',
            `request_uri` VARCHAR(255) NOT NULL DEFAULT '',
            `summary` VARCHAR(255) NOT NULL DEFAULT '',
            `context_json` LONGTEXT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_audit_log_created_at` (`created_at`),
            KEY `idx_audit_log_event_name` (`event_name`),
            KEY `idx_audit_log_entity` (`entity_type`, `entity_id`),
            KEY `idx_audit_log_user` (`user_id`, `created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function resolve_audit_entity_type($eventName, array $context)
{
    $event = strtolower(trim((string) $eventName));
    if (strpos($event, 'bill') !== false) {
        return 'bill';
    }
    if (strpos($event, 'property') !== false) {
        return 'property';
    }
    if (strpos($event, 'expense') !== false) {
        return 'expense';
    }
    if (strpos($event, 'review') !== false || strpos($event, 'upload') !== false) {
        return 'review';
    }
    if (strpos($event, 'account_lookup') !== false) {
        return 'account_lookup';
    }
    if (strpos($event, 'login') !== false || strpos($event, 'auth') !== false || strpos($event, 'forbidden') !== false) {
        return 'auth';
    }
    return trim((string) ($context['entity_type'] ?? 'system'));
}

function resolve_audit_entity_id(array $context)
{
    $candidates = [
        'bill_id',
        'property_list_id',
        'expense_id',
        'record_id',
        'entity_id',
        'user_id',
    ];

    foreach ($candidates as $candidateKey) {
        if (!array_key_exists($candidateKey, $context)) {
            continue;
        }
        $value = (int) ($context[$candidateKey] ?? 0);
        if ($value > 0) {
            return $value;
        }
    }

    return 0;
}

function build_audit_summary($eventName, array $context)
{
    $event = trim((string) $eventName);
    $parts = [$event];

    foreach (['property', 'dd', 'bill_type', 'username'] as $key) {
        $value = trim((string) ($context[$key] ?? ''));
        if ($value !== '') {
            $parts[] = $value;
        }
    }

    if (!empty($context['due_period'])) {
        $parts[] = trim((string) $context['due_period']);
    }

    return substr(implode(' | ', $parts), 0, 255);
}

function write_audit_log_entry(PDO $pdo, $eventName, array $context)
{
    $contextJson = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare(
        "INSERT INTO `audit_log` (
            `event_name`,
            `entity_type`,
            `entity_id`,
            `user_id`,
            `username`,
            `user_role`,
            `ip_address`,
            `request_method`,
            `request_uri`,
            `summary`,
            `context_json`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        trim((string) $eventName),
        resolve_audit_entity_type($eventName, $context),
        resolve_audit_entity_id($context),
        isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : 0,
        trim((string) ($_SESSION['username'] ?? '')),
        trim((string) ($_SESSION['role'] ?? '')),
        get_request_ip_address(),
        trim((string) ($_SERVER['REQUEST_METHOD'] ?? '')),
        substr(trim((string) ($_SERVER['REQUEST_URI'] ?? '')), 0, 255),
        build_audit_summary($eventName, $context),
        $contextJson !== false ? $contextJson : null,
    ]);
}

function query_int_param($key, $default = 0, $min = 0, $max = 10000)
{
    $raw = $_GET[$key] ?? null;
    if ($raw === null || $raw === '') {
        return $default;
    }

    $value = (int) $raw;
    if ($value < $min) {
        return $min;
    }
    if ($value > $max) {
        return $max;
    }
    return $value;
}

function query_string_param($key, $default = '')
{
    $raw = $_GET[$key] ?? null;
    if ($raw === null) {
        return $default;
    }
    return trim((string) $raw);
}

function read_pagination_from_query($defaultPerPage = 25, $maxPerPage = 200)
{
    $page = query_int_param('page', 1, 1, 1000000);
    $perPage = query_int_param('per_page', $defaultPerPage, 0, $maxPerPage);
    $paginationRequested = isset($_GET['page']) || isset($_GET['per_page']);
    $enabled = $paginationRequested && $perPage > 0;

    return [
        'enabled' => $enabled,
        'page' => $page,
        'per_page' => $perPage,
        'offset' => ($page - 1) * max(1, $perPage),
    ];
}

function build_pagination_meta($page, $perPage, $total)
{
    $safePage = max(1, (int) $page);
    $safePerPage = max(1, (int) $perPage);
    $safeTotal = max(0, (int) $total);
    $totalPages = (int) max(1, ceil($safeTotal / $safePerPage));

    return [
        'page' => $safePage,
        'per_page' => $safePerPage,
        'total' => $safeTotal,
        'total_pages' => $totalPages,
    ];
}

function get_csrf_token()
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) || $_SESSION['csrf_token'] === '') {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token()
{
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (!is_string($sessionToken) || $sessionToken === '') {
        return false;
    }

    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (is_string($headerToken) && $headerToken !== '' && hash_equals($sessionToken, $headerToken)) {
        return true;
    }

    $postedToken = $_POST['csrf_token'] ?? '';
    if (is_string($postedToken) && $postedToken !== '' && hash_equals($sessionToken, $postedToken)) {
        return true;
    }

    return false;
}

function enforce_csrf_for_write_actions($action)
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $protectedActions = [
        'add',
        'bill_update',
        'upload_bill',
        'review_queue_replace',
        'property_record_create',
        'property_record_update',
        'property_record_delete',
        'expense_create',
        'expense_update',
        'expense_delete',
        'account_lookup_import',
    ];

    if (!in_array($action, $protectedActions, true)) {
        return;
    }

    if (!verify_csrf_token()) {
        audit_log_event('csrf_rejected', ['action' => (string) $action]);
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid or missing CSRF token.']);
        exit;
    }
}

function normalize_positive_int($value)
{
    $id = (int) $value;
    return $id > 0 ? $id : 0;
}

function normalize_billing_period_value($value)
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }

    if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $raw)) {
        return $raw;
    }

    if (preg_match('/^(\d{4})[\/-](0?[1-9]|1[0-2])$/', $raw, $match)) {
        return sprintf('%04d-%02d', (int) $match[1], (int) $match[2]);
    }

    if (preg_match('/^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})$/i', $raw, $match)) {
        $monthToken = strtolower($match[1]);
        $monthMap = [
            'jan' => '01', 'january' => '01',
            'feb' => '02', 'february' => '02',
            'mar' => '03', 'march' => '03',
            'apr' => '04', 'april' => '04',
            'may' => '05',
            'jun' => '06', 'june' => '06',
            'jul' => '07', 'july' => '07',
            'aug' => '08', 'august' => '08',
            'sep' => '09', 'sept' => '09', 'september' => '09',
            'oct' => '10', 'october' => '10',
            'nov' => '11', 'november' => '11',
            'dec' => '12', 'december' => '12',
        ];
        if (isset($monthMap[$monthToken])) {
            return $match[2] . '-' . $monthMap[$monthToken];
        }
    }

    return $raw;
}

function normalize_due_period_value($value)
{
    return normalize_billing_period_value($value);
}

function derive_due_period_from_due_date_fields($data, $billType = '')
{
    $normalizedType = strtolower(trim((string) $billType));
    if ($normalizedType === 'wifi') {
        $normalizedType = 'internet';
    } elseif ($normalizedType === 'association') {
        $normalizedType = 'association_dues';
    }

    $fieldByType = [
        'internet' => 'wifi_due_date',
        'water' => 'water_due_date',
        'electricity' => 'electricity_due_date',
        'association_dues' => 'association_due_date',
    ];

    $candidateFields = [];
    if (isset($fieldByType[$normalizedType])) {
        $candidateFields[] = $fieldByType[$normalizedType];
    }
    $candidateFields = array_merge($candidateFields, ['wifi_due_date', 'water_due_date', 'electricity_due_date', 'association_due_date']);

    foreach ($candidateFields as $field) {
        $raw = trim((string) ($data[$field] ?? ''));
        if ($raw === '') {
            continue;
        }
        if (preg_match('/^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/', $raw, $m)) {
            return $m[1] . '-' . $m[2];
        }
        $normalized = normalize_due_period_value($raw);
        if ($normalized !== '') {
            return $normalized;
        }
    }

    return '';
}

function normalize_csv_payload($data)
{
    $fields = [
        'bill_type',
        'property_list_id',
        'dd',
        'property',
        'due_period',
        'unit_owner',
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

    $normalized = [];
    foreach ($fields as $field) {
        $value = $data[$field] ?? '';
        $normalized[$field] = trim((string) $value);
    }

    $normalized['property_list_id'] = normalize_positive_int($data['property_list_id'] ?? 0);

    $rawDuePeriod = trim((string) ($data['due_period'] ?? $data['billing_period'] ?? ''));
    $normalized['due_period'] = normalize_due_period_value($rawDuePeriod);
    if ($normalized['due_period'] === '') {
        $normalized['due_period'] = derive_due_period_from_due_date_fields($data, $normalized['bill_type'] ?? '');
    }

    if ($normalized['bill_type'] === '') {
        $normalized['bill_type'] = 'water';
    }

    return $normalized;
}

function normalize_property_record_payload($data)
{
    $fields = [
        'dd',
        'property',
        'billing_period',
        'unit_owner',
        'classification',
        'deposit',
        'rent',
        'per_property_status',
        'real_property_tax',
        'rpt_payment_status',
        'penalty',
    ];

    $normalized = [];
    foreach ($fields as $field) {
        $normalized[$field] = trim((string) ($data[$field] ?? ''));
    }
    $normalized['property_list_id'] = normalize_positive_int($data['property_list_id'] ?? 0);
    $normalized['billing_period'] = normalize_billing_period_value($data['billing_period'] ?? '');

    return $normalized;
}

function respond_missing_migration_columns($missingColumns)
{
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database schema is not up to date. Run: php backend/tools/run_migrations.php',
        'missing_columns' => array_values($missingColumns),
    ]);
    exit;
}

function table_exists($pdo, $tableName)
{
    static $checkedTables = [];
    $key = trim((string) $tableName);
    if ($key === '') {
        return false;
    }
    if (array_key_exists($key, $checkedTables)) {
        return $checkedTables[$key];
    }

    $stmt = $pdo->prepare(
        "SELECT COUNT(*)
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?"
    );
    $stmt->execute([$key]);
    $exists = ((int) $stmt->fetchColumn()) > 0;
    $checkedTables[$key] = $exists;
    return $exists;
}

function table_column_exists($pdo, $tableName, $columnName)
{
    static $checkedColumns = [];
    $cacheKey = $tableName . '.' . $columnName;
    if (array_key_exists($cacheKey, $checkedColumns)) {
        return $checkedColumns[$cacheKey];
    }

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?"
    );
    $stmt->execute([$tableName, $columnName]);
    $exists = ((int) $stmt->fetchColumn()) > 0;
    $checkedColumns[$cacheKey] = $exists;
    return $exists;
}

function require_table_columns($pdo, $tableName, $requiredColumns)
{
    $missing = [];
    foreach ($requiredColumns as $column) {
        if (!table_column_exists($pdo, $tableName, $column)) {
            $missing[] = $tableName . '.' . $column;
        }
    }

    if ($missing) {
        respond_missing_migration_columns($missing);
    }
}

function login_rate_limit_available($pdo)
{
    return table_exists($pdo, 'login_attempts')
        && table_column_exists($pdo, 'login_attempts', 'id')
        && table_column_exists($pdo, 'login_attempts', 'username')
        && table_column_exists($pdo, 'login_attempts', 'ip_address')
        && table_column_exists($pdo, 'login_attempts', 'attempted_at')
        && table_column_exists($pdo, 'login_attempts', 'success');
}

function cleanup_old_login_attempts($pdo)
{
    static $cleaned = false;
    if ($cleaned) {
        return;
    }
    $cleaned = true;

    if (!login_rate_limit_available($pdo)) {
        return;
    }

    $pdo->exec("DELETE FROM `login_attempts` WHERE `attempted_at` < DATE_SUB(NOW(), INTERVAL 7 DAY)");
}

function assess_login_rate_limit($pdo, $username, $ipAddress, $windowMinutes = 15, $maxAttempts = 5)
{
    $safeWindow = max(1, min(120, (int) $windowMinutes));
    $safeMaxAttempts = max(1, min(100, (int) $maxAttempts));
    $safeUsername = trim((string) $username);
    $safeIp = trim((string) $ipAddress);

    if (!login_rate_limit_available($pdo)) {
        return [
            'blocked' => false,
            'attempt_count' => 0,
            'retry_after_seconds' => 0,
        ];
    }

    cleanup_old_login_attempts($pdo);

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) AS attempt_count, MIN(`attempted_at`) AS first_attempt
         FROM `login_attempts`
         WHERE `success` = 0
           AND `attempted_at` >= DATE_SUB(NOW(), INTERVAL {$safeWindow} MINUTE)
           AND (
                LOWER(TRIM(COALESCE(`username`, ''))) = LOWER(TRIM(?))
                OR `ip_address` = ?
           )"
    );
    $stmt->execute([$safeUsername, $safeIp]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $attemptCount = (int) ($row['attempt_count'] ?? 0);
    if ($attemptCount < $safeMaxAttempts) {
        return [
            'blocked' => false,
            'attempt_count' => $attemptCount,
            'retry_after_seconds' => 0,
        ];
    }

    $retryAfterSeconds = 60;
    $firstAttempt = trim((string) ($row['first_attempt'] ?? ''));
    if ($firstAttempt !== '') {
        $firstTs = strtotime($firstAttempt);
        if ($firstTs !== false) {
            $elapsed = max(0, time() - $firstTs);
            $windowSeconds = $safeWindow * 60;
            $retryAfterSeconds = max(1, $windowSeconds - $elapsed);
        }
    }

    return [
        'blocked' => true,
        'attempt_count' => $attemptCount,
        'retry_after_seconds' => $retryAfterSeconds,
    ];
}

function record_login_attempt($pdo, $username, $ipAddress, $success, $userAgent = '', $reason = '')
{
    if (!login_rate_limit_available($pdo)) {
        return;
    }

    $hasUserAgent = table_column_exists($pdo, 'login_attempts', 'user_agent');
    $hasReason = table_column_exists($pdo, 'login_attempts', 'reason');

    if ($hasUserAgent && $hasReason) {
        $stmt = $pdo->prepare(
            "INSERT INTO `login_attempts` (`username`, `ip_address`, `success`, `user_agent`, `reason`)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            trim((string) $username),
            trim((string) $ipAddress),
            $success ? 1 : 0,
            substr(trim((string) $userAgent), 0, 255),
            substr(trim((string) $reason), 0, 120),
        ]);
        return;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO `login_attempts` (`username`, `ip_address`, `success`)
         VALUES (?, ?, ?)"
    );
    $stmt->execute([
        trim((string) $username),
        trim((string) $ipAddress),
        $success ? 1 : 0,
    ]);
}

function billing_column_exists($pdo, $columnName)
{
    return table_column_exists($pdo, 'property_billing_records', $columnName);
}

function require_billing_columns($pdo, $requiredColumns)
{
    require_table_columns($pdo, 'property_billing_records', $requiredColumns);
}

function ensure_bill_type_column($pdo)
{
    require_billing_columns($pdo, ['bill_type']);
}

function ensure_billing_visibility_column($pdo)
{
    require_billing_columns($pdo, ['is_hidden']);
}

function ensure_property_master_columns($pdo)
{
    require_table_columns($pdo, 'property_list', [
        'id',
        'dd',
        'property',
        'billing_period',
        'unit_owner',
        'classification',
        'deposit',
        'rent',
        'per_property_status',
        'real_property_tax',
        'rpt_payment_status',
        'penalty',
    ]);
}

function ensure_billing_property_list_column($pdo)
{
    require_billing_columns($pdo, ['property_list_id']);
}

function ensure_billing_due_period_column($pdo)
{
    require_billing_columns($pdo, ['due_period']);
}

function get_monthly_identity_health($pdo)
{
    ensure_billing_property_list_column($pdo);
    ensure_billing_due_period_column($pdo);
    ensure_billing_visibility_column($pdo);

    $invalidPropertyStmt = $pdo->query(
        "SELECT COUNT(*)
         FROM `property_billing_records`
         WHERE `is_hidden` = 0
           AND COALESCE(`property_list_id`, 0) <= 0"
    );
    $invalidPropertyCount = (int) $invalidPropertyStmt->fetchColumn();

    $invalidDuePeriodStmt = $pdo->query(
        "SELECT COUNT(*)
         FROM `property_billing_records`
         WHERE `is_hidden` = 0
           AND TRIM(COALESCE(`due_period`, '')) = ''"
    );
    $invalidDuePeriodCount = (int) $invalidDuePeriodStmt->fetchColumn();

    $duplicateGroupsStmt = $pdo->query(
        "SELECT COUNT(*)
         FROM (
            SELECT `property_list_id`, TRIM(COALESCE(`due_period`, '')) AS `due_period_key`
            FROM `property_billing_records`
            WHERE `is_hidden` = 0
              AND COALESCE(`property_list_id`, 0) > 0
              AND TRIM(COALESCE(`due_period`, '')) <> ''
            GROUP BY `property_list_id`, TRIM(COALESCE(`due_period`, ''))
            HAVING COUNT(*) > 1
         ) duplicate_groups"
    );
    $duplicateGroupCount = (int) $duplicateGroupsStmt->fetchColumn();

    return [
        'ok' => $invalidPropertyCount === 0 && $invalidDuePeriodCount === 0 && $duplicateGroupCount === 0,
        'invalid_property_list_id_rows' => $invalidPropertyCount,
        'missing_due_period_rows' => $invalidDuePeriodCount,
        'duplicate_active_monthly_groups' => $duplicateGroupCount,
    ];
}

function get_monthly_identity_duplicate_groups($pdo, $limit = 10)
{
    ensure_billing_property_list_column($pdo);
    ensure_billing_due_period_column($pdo);
    ensure_billing_visibility_column($pdo);

    $safeLimit = max(1, (int) $limit);
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
         ORDER BY `property_list_id` ASC, `due_period` ASC
         LIMIT {$safeLimit}"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return array_map(
        static function ($row) {
            return [
                'property_list_id' => (int) ($row['property_list_id'] ?? 0),
                'due_period' => trim((string) ($row['due_period'] ?? '')),
                'active_rows' => (int) ($row['active_rows'] ?? 0),
                'row_ids' => trim((string) ($row['row_ids'] ?? '')),
                'latest_created_at' => trim((string) ($row['latest_created_at'] ?? '')),
            ];
        },
        $rows ?: []
    );
}

function get_monthly_identity_schema_status($pdo)
{
    ensure_billing_property_list_column($pdo);
    ensure_billing_due_period_column($pdo);

    $columnStmt = $pdo->prepare(
        "SELECT `COLUMN_NAME`, `IS_NULLABLE`
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'property_billing_records'
           AND `COLUMN_NAME` IN ('property_list_id', 'due_period', 'active_property_list_id', 'active_due_period')"
    );
    $columnStmt->execute();
    $columnRows = $columnStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $columns = [];
    foreach ($columnRows as $row) {
        $columns[(string) ($row['COLUMN_NAME'] ?? '')] = [
            'is_nullable' => strtoupper((string) ($row['IS_NULLABLE'] ?? 'YES')),
        ];
    }

    $indexStmt = $pdo->prepare(
        "SELECT COUNT(*)
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'property_billing_records'
           AND INDEX_NAME = 'uq_pbr_active_property_due_period'"
    );
    $indexStmt->execute();
    $hasUniqueIndex = ((int) $indexStmt->fetchColumn()) >= 2;

    $constraintStmt = $pdo->prepare(
        "SELECT rc.`DELETE_RULE`
         FROM information_schema.REFERENTIAL_CONSTRAINTS rc
         WHERE rc.`CONSTRAINT_SCHEMA` = DATABASE()
           AND rc.`TABLE_NAME` = 'property_billing_records'
           AND rc.`CONSTRAINT_NAME` = 'fk_property_billing_property_list'
         LIMIT 1"
    );
    $constraintStmt->execute();
    $deleteRule = strtoupper((string) ($constraintStmt->fetchColumn() ?: ''));

    $appliedVersions = [];
    if (table_exists($pdo, 'schema_migrations')) {
        $migrationStmt = $pdo->prepare(
            "SELECT `version`
             FROM `schema_migrations`
             WHERE `version` IN ('20260310_001_enforce_one_monthly_row_per_property', '20260310_002_harden_monthly_identity_for_upgraded_databases')"
        );
        $migrationStmt->execute();
        foreach ($migrationStmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $version = trim((string) ($row['version'] ?? ''));
            if ($version !== '') {
                $appliedVersions[] = $version;
            }
        }
    }

    $propertyListNotNull = (($columns['property_list_id']['is_nullable'] ?? 'YES') === 'NO');
    $duePeriodNotNull = (($columns['due_period']['is_nullable'] ?? 'YES') === 'NO');
    $hasGeneratedColumns = isset($columns['active_property_list_id'], $columns['active_due_period']);
    $hasPropertyListFk = $deleteRule !== '';
    $migrationsApplied =
        in_array('20260310_001_enforce_one_monthly_row_per_property', $appliedVersions, true)
        && in_array('20260310_002_harden_monthly_identity_for_upgraded_databases', $appliedVersions, true);

    return [
        'property_list_id_not_null' => $propertyListNotNull,
        'due_period_not_null' => $duePeriodNotNull,
        'active_generated_columns_present' => $hasGeneratedColumns,
        'active_monthly_unique_index_present' => $hasUniqueIndex,
        'property_list_fk_present' => $hasPropertyListFk,
        'property_list_fk_delete_rule' => $deleteRule,
        'monthly_enforcement_migrations_applied' => $migrationsApplied,
        'schema_parity_ok' => $propertyListNotNull
            && $duePeriodNotNull
            && $hasGeneratedColumns
            && $hasUniqueIndex
            && $hasPropertyListFk
            && in_array($deleteRule, ['RESTRICT', 'NO ACTION'], true),
    ];
}

function get_monthly_rollout_safety_report($pdo, $duplicateLimit = 10)
{
    $health = get_monthly_identity_health($pdo);
    $schema = get_monthly_identity_schema_status($pdo);
    $duplicates = get_monthly_identity_duplicate_groups($pdo, $duplicateLimit);

    return [
        'ok' => (($health['ok'] ?? false) === true) && (($schema['schema_parity_ok'] ?? false) === true),
        'health' => $health,
        'schema' => $schema,
        'duplicate_groups' => $duplicates,
    ];
}

function enforce_monthly_identity_health($pdo)
{
    $health = get_monthly_identity_health($pdo);
    if (($health['ok'] ?? false) === true) {
        return $health;
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Monthly billing identity is not fully enforced. Run database migrations and audit tools before continuing.',
        'details' => $health,
    ]);
    exit;
}

function find_property_list_by_id($pdo, $propertyListId)
{
    $id = normalize_positive_int($propertyListId);
    if ($id <= 0) {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT `id`, `dd`, `property`, `billing_period`, `unit_owner`, `classification`, `deposit`, `rent`,
                `per_property_status`, `real_property_tax`, `rpt_payment_status`, `penalty`
         FROM `property_list`
         WHERE `id` = ?
         LIMIT 1"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function find_property_list_by_identity($pdo, $dd, $property, $billingPeriod = '')
{
    $safeDd = trim((string) $dd);
    $safeProperty = trim((string) $property);
    $safeBillingPeriod = trim((string) $billingPeriod);
    if ($safeDd === '' && $safeProperty === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT `id`, `dd`, `property`, `billing_period`, `unit_owner`, `classification`, `deposit`, `rent`,
                `per_property_status`, `real_property_tax`, `rpt_payment_status`, `penalty`
         FROM `property_list`
         WHERE LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
           AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
           AND TRIM(COALESCE(`billing_period`, '')) = TRIM(?)
         LIMIT 1"
    );
    $stmt->execute([$safeDd, $safeProperty, $safeBillingPeriod]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function upsert_property_master_from_payload($pdo, $normalized, $createWhenMissing = true)
{
    ensure_property_master_columns($pdo);

    $propertyListId = normalize_positive_int($normalized['property_list_id'] ?? 0);
    $dd = trim((string) ($normalized['dd'] ?? ''));
    $property = trim((string) ($normalized['property'] ?? ''));
    $billingPeriod = trim((string) ($normalized['billing_period'] ?? ''));
    $unitOwner = trim((string) ($normalized['unit_owner'] ?? ''));
    $classification = trim((string) ($normalized['classification'] ?? ''));
    $deposit = trim((string) ($normalized['deposit'] ?? ''));
    $rent = trim((string) ($normalized['rent'] ?? ''));
    $perPropertyStatus = trim((string) ($normalized['per_property_status'] ?? ''));
    $realPropertyTax = trim((string) ($normalized['real_property_tax'] ?? ''));
    $rptPaymentStatus = trim((string) ($normalized['rpt_payment_status'] ?? ''));
    $penalty = trim((string) ($normalized['penalty'] ?? ''));

    $row = null;
    if ($propertyListId > 0) {
        $row = find_property_list_by_id($pdo, $propertyListId);
        if (!$row) {
            throw new RuntimeException('Selected property was not found in Property List.');
        }
    } else {
        $row = find_property_list_by_identity($pdo, $dd, $property, $billingPeriod);
    }

    if (!$row && !$createWhenMissing) {
        return null;
    }

    if (!$row) {
        if ($dd === '' && $property === '') {
            return null;
        }

        $insertStmt = $pdo->prepare(
            "INSERT INTO `property_list` (
                `dd`, `property`, `billing_period`, `unit_owner`, `classification`, `deposit`, `rent`,
                `per_property_status`, `real_property_tax`, `rpt_payment_status`, `penalty`
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $insertStmt->execute([
            $dd,
            $property,
            $billingPeriod,
            $unitOwner,
            $classification,
            $deposit,
            $rent,
            $perPropertyStatus,
            $realPropertyTax,
            $rptPaymentStatus,
            $penalty,
        ]);
        $newId = (int) $pdo->lastInsertId();
        return find_property_list_by_id($pdo, $newId);
    }

    $nextDd = $dd !== '' ? $dd : (string) ($row['dd'] ?? '');
    $nextProperty = $property !== '' ? $property : (string) ($row['property'] ?? '');
    $nextBillingPeriod = $billingPeriod !== '' ? $billingPeriod : (string) ($row['billing_period'] ?? '');
    $nextUnitOwner = $unitOwner !== '' ? $unitOwner : (string) ($row['unit_owner'] ?? '');
    $nextClassification = $classification !== '' ? $classification : (string) ($row['classification'] ?? '');
    $nextDeposit = $deposit !== '' ? $deposit : (string) ($row['deposit'] ?? '');
    $nextRent = $rent !== '' ? $rent : (string) ($row['rent'] ?? '');
    $nextPerPropertyStatus = $perPropertyStatus !== '' ? $perPropertyStatus : (string) ($row['per_property_status'] ?? '');
    $nextRealPropertyTax = $realPropertyTax !== '' ? $realPropertyTax : (string) ($row['real_property_tax'] ?? '');
    $nextRptPaymentStatus = $rptPaymentStatus !== '' ? $rptPaymentStatus : (string) ($row['rpt_payment_status'] ?? '');
    $nextPenalty = $penalty !== '' ? $penalty : (string) ($row['penalty'] ?? '');

    $hasChanges = $nextDd !== (string) ($row['dd'] ?? '')
        || $nextProperty !== (string) ($row['property'] ?? '')
        || $nextBillingPeriod !== (string) ($row['billing_period'] ?? '')
        || $nextUnitOwner !== (string) ($row['unit_owner'] ?? '')
        || $nextClassification !== (string) ($row['classification'] ?? '')
        || $nextDeposit !== (string) ($row['deposit'] ?? '')
        || $nextRent !== (string) ($row['rent'] ?? '')
        || $nextPerPropertyStatus !== (string) ($row['per_property_status'] ?? '')
        || $nextRealPropertyTax !== (string) ($row['real_property_tax'] ?? '')
        || $nextRptPaymentStatus !== (string) ($row['rpt_payment_status'] ?? '')
        || $nextPenalty !== (string) ($row['penalty'] ?? '');

    if ($hasChanges) {
        $updateStmt = $pdo->prepare(
            "UPDATE `property_list`
             SET `dd` = ?, `property` = ?, `billing_period` = ?, `unit_owner` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
                 `per_property_status` = ?, `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?
             WHERE `id` = ?"
        );
        $updateStmt->execute([
            $nextDd,
            $nextProperty,
            $nextBillingPeriod,
            $nextUnitOwner,
            $nextClassification,
            $nextDeposit,
            $nextRent,
            $nextPerPropertyStatus,
            $nextRealPropertyTax,
            $nextRptPaymentStatus,
            $nextPenalty,
            (int) $row['id'],
        ]);
    }

    return find_property_list_by_id($pdo, (int) $row['id']);
}

function apply_property_master_to_payload($normalized, $propertyRow)
{
    if (!$propertyRow || !is_array($propertyRow)) {
        return $normalized;
    }

    $next = $normalized;
    $next['property_list_id'] = (int) ($propertyRow['id'] ?? 0);
    $next['dd'] = trim((string) ($propertyRow['dd'] ?? ''));
    $next['property'] = trim((string) ($propertyRow['property'] ?? ''));
    $next['billing_period'] = trim((string) ($propertyRow['billing_period'] ?? ''));
    $next['unit_owner'] = trim((string) ($propertyRow['unit_owner'] ?? ''));
    $next['classification'] = trim((string) ($propertyRow['classification'] ?? ''));
    $next['deposit'] = trim((string) ($propertyRow['deposit'] ?? ''));
    $next['rent'] = trim((string) ($propertyRow['rent'] ?? ''));
    $next['per_property_status'] = trim((string) ($propertyRow['per_property_status'] ?? ''));
    $next['real_property_tax'] = trim((string) ($propertyRow['real_property_tax'] ?? ''));
    $next['rpt_payment_status'] = trim((string) ($propertyRow['rpt_payment_status'] ?? ''));
    $next['penalty'] = trim((string) ($propertyRow['penalty'] ?? ''));

    return $next;
}

function resolve_bill_property_master($pdo, $normalized, $createWhenMissing = true)
{
    ensure_property_master_columns($pdo);
    ensure_billing_property_list_column($pdo);

    $propertyRow = upsert_property_master_from_payload($pdo, $normalized, $createWhenMissing);
    if (!$propertyRow) {
        return $normalized;
    }

    return apply_property_master_to_payload($normalized, $propertyRow);
}

function billing_identity_exists($pdo, $normalized, $excludeId = 0)
{
    ensure_bill_type_column($pdo);
    ensure_billing_visibility_column($pdo);
    ensure_billing_property_list_column($pdo);
    ensure_billing_due_period_column($pdo);

    $propertyListId = normalize_positive_int($normalized['property_list_id'] ?? 0);
    $duePeriod = trim((string) ($normalized['due_period'] ?? $normalized['billing_period'] ?? ''));

    if ($propertyListId > 0) {
        $sql = "SELECT `id` FROM `property_billing_records`
                WHERE `property_list_id` = ?
                  AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)
                  AND `is_hidden` = 0";
        $params = [$propertyListId, $duePeriod];
    } else {
        $sql = "SELECT `id` FROM `property_billing_records`
                WHERE LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
                  AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
                  AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)
                  AND `is_hidden` = 0";
        $params = [
            trim((string) ($normalized['dd'] ?? '')),
            trim((string) ($normalized['property'] ?? '')),
            $duePeriod,
        ];
    }

    if ($excludeId > 0) {
        $sql .= " AND `id` <> ?";
        $params[] = $excludeId;
    }

    $sql .= ' LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
}

function hide_duplicate_active_bills($pdo)
{
    ensure_billing_property_list_column($pdo);
    ensure_bill_type_column($pdo);
    ensure_billing_visibility_column($pdo);
    ensure_billing_due_period_column($pdo);

    $sql = "UPDATE `property_billing_records` AS t
            INNER JOIN (
                SELECT
                    CASE
                        WHEN COALESCE(`property_list_id`, 0) > 0 THEN CAST(`property_list_id` AS CHAR)
                        ELSE CONCAT('legacy:', LOWER(TRIM(`dd`)), '|', LOWER(TRIM(COALESCE(`property`, ''))))
                    END AS identity_key,
                    TRIM(COALESCE(`due_period`, '')) AS due_period_key,
                    MAX(`id`) AS keep_id
                FROM `property_billing_records`
                WHERE `is_hidden` = 0
                GROUP BY
                    CASE
                        WHEN COALESCE(`property_list_id`, 0) > 0 THEN CAST(`property_list_id` AS CHAR)
                        ELSE CONCAT('legacy:', LOWER(TRIM(`dd`)), '|', LOWER(TRIM(COALESCE(`property`, ''))))
                    END,
                    TRIM(COALESCE(`due_period`, ''))
                HAVING COUNT(*) > 1
            ) AS d
              ON (
                    CASE
                        WHEN COALESCE(t.`property_list_id`, 0) > 0 THEN CAST(t.`property_list_id` AS CHAR)
                        ELSE CONCAT('legacy:', LOWER(TRIM(t.`dd`)), '|', LOWER(TRIM(COALESCE(t.`property`, ''))))
                    END
                 ) = d.identity_key
             AND TRIM(COALESCE(t.`due_period`, '')) = d.due_period_key
             AND t.`id` <> d.keep_id
            SET t.`is_hidden` = 1
            WHERE t.`is_hidden` = 0";

    return $pdo->exec($sql);
}

function hide_duplicate_active_bills_for_identity($pdo, $propertyListId, $dd, $property, $billType, $duePeriod, $keepId)
{
    ensure_billing_property_list_column($pdo);
    ensure_bill_type_column($pdo);
    ensure_billing_visibility_column($pdo);
    ensure_billing_due_period_column($pdo);

    $identityId = normalize_positive_int($propertyListId);
    if ($identityId > 0) {
        $stmt = $pdo->prepare(
            "UPDATE `property_billing_records`
             SET `is_hidden` = 1
             WHERE `is_hidden` = 0
               AND `id` <> ?
               AND `property_list_id` = ?
               AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)"
        );
        $stmt->execute([$keepId, $identityId, $duePeriod]);
        return $stmt->rowCount();
    }

    $stmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET `is_hidden` = 1
         WHERE `is_hidden` = 0
           AND `id` <> ?
           AND LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
           AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)"
    );
    $stmt->execute([$keepId, $dd, $property, $duePeriod]);
    return $stmt->rowCount();
}

function sync_property_master_to_billing_rows($pdo, $normalized)
{
    ensure_billing_property_list_column($pdo);
    ensure_billing_visibility_column($pdo);

    $resolved = resolve_bill_property_master($pdo, $normalized, true);
    $propertyListId = normalize_positive_int($resolved['property_list_id'] ?? 0);
    if ($propertyListId <= 0) {
        return null;
    }

    $syncStmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET `dd` = ?, `property` = ?, `unit_owner` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
             `per_property_status` = ?, `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?
         WHERE `property_list_id` = ?
           AND `is_hidden` = 0"
    );
    $syncStmt->execute([
        $resolved['dd'],
        $resolved['property'],
        $resolved['unit_owner'],
        $resolved['classification'],
        $resolved['deposit'],
        $resolved['rent'],
        $resolved['per_property_status'],
        $resolved['real_property_tax'],
        $resolved['rpt_payment_status'],
        $resolved['penalty'],
        $propertyListId,
    ]);

    return $resolved;
}

function parse_boolean_config($value, $default = false)
{
    if (!is_string($value)) {
        return $default;
    }
    $normalized = strtolower(trim($value));
    if ($normalized === '1' || $normalized === 'true' || $normalized === 'yes' || $normalized === 'on') {
        return true;
    }
    if ($normalized === '0' || $normalized === 'false' || $normalized === 'no' || $normalized === 'off') {
        return false;
    }
    return $default;
}

function normalize_uploaded_bill_filename($fileName)
{
    $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', trim((string) $fileName));
    $safe = trim((string) $safe, '._-');
    if ($safe === '') {
        return 'bill-upload';
    }
    return substr($safe, 0, 120);
}

function is_valid_uploaded_bill_payload($fileTmpPath, $effectiveMime)
{
    $normalizedMime = strtolower(trim((string) $effectiveMime));
    if ($normalizedMime === 'application/pdf') {
        $handle = @fopen($fileTmpPath, 'rb');
        if ($handle === false) {
            return false;
        }
        $header = fread($handle, 5);
        fclose($handle);
        return $header === '%PDF-';
    }

    if (in_array($normalizedMime, ['image/png', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/webp'], true)) {
        return @getimagesize($fileTmpPath) !== false;
    }

    if (in_array($normalizedMime, ['image/heic', 'image/heif'], true)) {
        return is_readable($fileTmpPath) && (int) @filesize($fileTmpPath) > 0;
    }

    return false;
}

function build_mock_bill_upload_response($billType, $dd, $property, $duePeriod = '')
{
    $type = trim((string) $billType);
    if ($type === 'wifi') {
        $type = 'internet';
    }
    if (!in_array($type, API_BILL_TYPES, true)) {
        $type = 'water';
    }

    $safeDd = trim((string) $dd);
    $safeProperty = trim((string) $property);
    $safeDuePeriod = trim((string) $duePeriod);

    $base = [
        'bill_type' => $type,
        'property_list_id' => 0,
        'dd' => $safeDd,
        'property' => $safeProperty,
        'due_period' => $safeDuePeriod,
        'unit_owner' => '',
        'classification' => '',
        'deposit' => '',
        'rent' => '',
        'internet_provider' => '',
        'internet_account_no' => '',
        'wifi_amount' => '',
        'wifi_due_date' => '',
        'wifi_payment_status' => '',
        'water_account_no' => '',
        'water_amount' => '',
        'water_due_date' => '',
        'water_payment_status' => '',
        'electricity_account_no' => '',
        'electricity_amount' => '',
        'electricity_due_date' => '',
        'electricity_payment_status' => '',
        'association_dues' => '',
        'association_due_date' => '',
        'association_payment_status' => '',
        'real_property_tax' => '',
        'rpt_payment_status' => '',
        'penalty' => '',
        'per_property_status' => '',
    ];

    if ($type === 'internet') {
        $base['internet_provider'] = 'Mock ISP';
        $base['internet_account_no'] = 'INT-MOCK-001';
        $base['wifi_amount'] = '1899.00';
        $base['wifi_due_date'] = date('Y-m-d', strtotime('+10 days'));
        $base['wifi_payment_status'] = 'Unpaid';
    } elseif ($type === 'electricity') {
        $base['electricity_account_no'] = 'ELEC-MOCK-001';
        $base['electricity_amount'] = '3250.75';
        $base['electricity_due_date'] = date('Y-m-d', strtotime('+12 days'));
        $base['electricity_payment_status'] = 'Unpaid';
    } elseif ($type === 'association_dues') {
        $base['association_dues'] = '2500.00';
        $base['association_due_date'] = date('Y-m-d', strtotime('+15 days'));
        $base['association_payment_status'] = 'Unpaid';
    } else {
        $base['water_account_no'] = 'WTR-MOCK-001';
        $base['water_amount'] = '780.25';
        $base['water_due_date'] = date('Y-m-d', strtotime('+9 days'));
        $base['water_payment_status'] = 'Unpaid';
    }

    return [
        'success' => true,
        'message' => 'Mock upload mode enabled. Sample data returned.',
        'data' => $base,
    ];
}

