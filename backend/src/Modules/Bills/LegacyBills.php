<?php
/*
 * Finance App File: api/bills.php
 * Purpose: Bill upload, CRUD, and list handlers.
 */

function hydrate_bill_row_from_property_master($row)
{
    if (!is_array($row)) {
        return $row;
    }

    $propertyListId = normalize_positive_int($row['property_list_id'] ?? 0);
    if ($propertyListId > 0) {
        $row['dd'] = trim((string) ($row['pl_dd'] ?? '')) !== '' ? $row['pl_dd'] : ($row['dd'] ?? '');
        $row['property'] = trim((string) ($row['pl_property'] ?? '')) !== '' ? $row['pl_property'] : ($row['property'] ?? '');
        // Due Period must come from the bill row so the same property can have
        // separate monthly records (e.g., 2026-02 and 2026-03).
        $row['due_period'] = trim((string) ($row['due_period'] ?? '')) !== ''
            ? $row['due_period']
            : ($row['pl_due_period'] ?? '');
        $row['unit_owner'] = trim((string) ($row['pl_unit_owner'] ?? '')) !== '' ? $row['pl_unit_owner'] : ($row['unit_owner'] ?? '');
        $row['classification'] = trim((string) ($row['pl_classification'] ?? '')) !== '' ? $row['pl_classification'] : ($row['classification'] ?? '');
        $row['deposit'] = trim((string) ($row['pl_deposit'] ?? '')) !== '' ? $row['pl_deposit'] : ($row['deposit'] ?? '');
        $row['rent'] = trim((string) ($row['pl_rent'] ?? '')) !== '' ? $row['pl_rent'] : ($row['rent'] ?? '');
        $row['per_property_status'] = trim((string) ($row['pl_per_property_status'] ?? '')) !== ''
            ? $row['pl_per_property_status']
            : ($row['per_property_status'] ?? '');
        $row['real_property_tax'] = trim((string) ($row['pl_real_property_tax'] ?? '')) !== ''
            ? $row['pl_real_property_tax']
            : ($row['real_property_tax'] ?? '');
        $row['rpt_payment_status'] = trim((string) ($row['pl_rpt_payment_status'] ?? '')) !== ''
            ? $row['pl_rpt_payment_status']
            : ($row['rpt_payment_status'] ?? '');
        $row['penalty'] = trim((string) ($row['pl_penalty'] ?? '')) !== ''
            ? $row['pl_penalty']
            : ($row['penalty'] ?? '');
    }

    unset(
        $row['pl_dd'],
        $row['pl_property'],
        $row['pl_due_period'],
        $row['pl_unit_owner'],
        $row['pl_classification'],
        $row['pl_deposit'],
        $row['pl_rent'],
        $row['pl_per_property_status'],
        $row['pl_real_property_tax'],
        $row['pl_rpt_payment_status'],
        $row['pl_penalty']
    );

    return $row;
}

function normalize_bill_type_filter($value)
{
    $normalized = strtolower(trim((string) $value));
    if ($normalized === 'wifi') {
        $normalized = 'internet';
    } elseif ($normalized === 'association') {
        $normalized = 'association_dues';
    }

    return in_array($normalized, API_BILL_TYPES, true) ? $normalized : '';
}

function normalize_upload_account_for_lookup($value)
{
    $raw = strtolower(trim((string) $value));
    if ($raw === '') {
        return '';
    }
    return preg_replace('/[^a-z0-9]/', '', $raw);
}

function canonicalize_upload_property_from_master(array $payload, $requestedBillType = '')
{
    $next = $payload;

    try {
        $pdo = get_db_connection();
        ensure_property_master_columns($pdo);

        $propertyListId = normalize_positive_int($next['property_list_id'] ?? 0);
        $effectiveBillType = normalize_bill_type_filter($next['bill_type'] ?? $requestedBillType);

        if ($propertyListId <= 0 && function_exists('find_property_from_property_account_directory')) {
            $accountFieldByType = [
                'internet' => 'internet_account_no',
                'water' => 'water_account_no',
                'electricity' => 'electricity_account_no',
            ];

            $candidateTypes = [];
            if ($effectiveBillType !== '' && isset($accountFieldByType[$effectiveBillType])) {
                $candidateTypes[] = $effectiveBillType;
            }
            foreach (['electricity', 'water', 'internet'] as $candidateType) {
                if (!in_array($candidateType, $candidateTypes, true)) {
                    $candidateTypes[] = $candidateType;
                }
            }

            foreach ($candidateTypes as $candidateType) {
                $accountField = $accountFieldByType[$candidateType] ?? '';
                if ($accountField === '') {
                    continue;
                }
                $normalizedAccount = normalize_upload_account_for_lookup($next[$accountField] ?? '');
                if ($normalizedAccount === '') {
                    continue;
                }

                $matched = find_property_from_property_account_directory($pdo, $normalizedAccount, $candidateType);
                $matchedPropertyListId = normalize_positive_int($matched['property_list_id'] ?? 0);
                if ($matchedPropertyListId > 0) {
                    $propertyListId = $matchedPropertyListId;
                    break;
                }
            }
        }

        if ($propertyListId > 0) {
            $master = find_property_list_by_id($pdo, $propertyListId);
            if (is_array($master) && !empty($master)) {
                $next['property_list_id'] = (int) ($master['id'] ?? $propertyListId);
                $next['dd'] = (string) ($master['dd'] ?? ($next['dd'] ?? ''));
                $next['property'] = (string) ($master['property'] ?? ($next['property'] ?? ''));
                $next['unit_owner'] = (string) ($master['unit_owner'] ?? ($next['unit_owner'] ?? ''));
                $next['classification'] = (string) ($master['classification'] ?? ($next['classification'] ?? ''));
                $next['deposit'] = (string) ($master['deposit'] ?? ($next['deposit'] ?? ''));
                $next['rent'] = (string) ($master['rent'] ?? ($next['rent'] ?? ''));
                $next['per_property_status'] = (string) ($master['per_property_status'] ?? ($next['per_property_status'] ?? ''));
                $next['real_property_tax'] = (string) ($master['real_property_tax'] ?? ($next['real_property_tax'] ?? ''));
                $next['rpt_payment_status'] = (string) ($master['rpt_payment_status'] ?? ($next['rpt_payment_status'] ?? ''));
                $next['penalty'] = (string) ($master['penalty'] ?? ($next['penalty'] ?? ''));
            }
        }
    } catch (Throwable $error) {
        return $payload;
    }

    return $next;
}

function is_valid_bill_json_payload($data)
{
    return is_array($data);
}

function escape_like_pattern($value)
{
    return strtr((string) $value, [
        '\\' => '\\\\',
        '%' => '\%',
        '_' => '\_',
    ]);
}

function create_bill_upload_request_id()
{
    try {
        return bin2hex(random_bytes(8));
    } catch (Exception $error) {
        return str_replace('.', '', uniqid('upload', true));
    }
}

function sanitize_bill_upload_log_value($value, $maxLength = 200)
{
    $normalized = trim((string) $value);
    if ($normalized === '') {
        return '';
    }
    $normalized = strip_tags($normalized);
    $normalized = preg_replace('/\s+/', ' ', $normalized);
    if (!is_string($normalized) || $normalized === '') {
        return '';
    }
    return substr($normalized, 0, max(1, (int) $maxLength));
}

function extract_bill_upload_error_summary($responseBody)
{
    $decoded = json_decode((string) $responseBody, true);
    if (!is_array($decoded)) {
        return 'Upstream service returned a non-JSON error payload.';
    }

    $parts = [];
    if (!empty($decoded['errorDescription'])) {
        $parts[] = sanitize_bill_upload_log_value($decoded['errorDescription']);
    }
    if (!empty($decoded['errorMessage'])) {
        $parts[] = sanitize_bill_upload_log_value($decoded['errorMessage']);
    }
    if (isset($decoded['errorDetails']['rawErrorMessage'])) {
        $raw = $decoded['errorDetails']['rawErrorMessage'];
        if (is_array($raw)) {
            $parts[] = sanitize_bill_upload_log_value(implode(' | ', $raw));
        } elseif (is_string($raw)) {
            $parts[] = sanitize_bill_upload_log_value($raw);
        }
    }

    $parts = array_values(array_filter($parts, static function ($value) {
        return is_string($value) && trim($value) !== '';
    }));

    if (!$parts) {
        return 'Upstream service returned an unstructured JSON error payload.';
    }

    return substr(implode(' | ', $parts), 0, 220);
}

function log_bill_upload_error($requestId, $event, $context = [])
{
    $parts = [
        'Finance API n8n upload error',
        'request_id=' . sanitize_bill_upload_log_value($requestId, 40),
        'event=' . sanitize_bill_upload_log_value($event, 40),
    ];

    if (is_array($context)) {
        foreach ($context as $key => $value) {
            $cleanKey = preg_replace('/[^a-z0-9_]/i', '', (string) $key);
            if ($cleanKey === '') {
                continue;
            }
            $cleanValue = sanitize_bill_upload_log_value($value, 220);
            if ($cleanValue === '') {
                continue;
            }
            $parts[] = $cleanKey . '=' . $cleanValue;
        }
    }

    error_log(implode(' ', $parts));
}

function should_retry_upload_http_status($statusCode)
{
    $status = (int) $statusCode;
    return $status === 408 || $status === 429 || ($status >= 500 && $status <= 599);
}

function execute_n8n_upload_request_with_retry($n8nWebhookUrl, $postData, $maxAttempts = 2)
{
    $attempts = max(1, (int) $maxAttempts);
    $last = [
        'response' => false,
        'status' => 0,
        'error' => 'Unknown upload error.',
        'attempts' => 0,
    ];

    for ($attempt = 1; $attempt <= $attempts; $attempt++) {
        $ch = curl_init($n8nWebhookUrl);
        if ($ch === false) {
            $last = [
                'response' => false,
                'status' => 0,
                'error' => 'Failed to initialize cURL.',
                'attempts' => $attempt,
            ];
            continue;
        }

        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

        $response = curl_exec($ch);
        $httpStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = trim((string) curl_error($ch));
        curl_close($ch);

        $last = [
            'response' => $response,
            'status' => $httpStatus,
            'error' => $curlError,
            'attempts' => $attempt,
        ];

        if ($response !== false && ($httpStatus >= 200 && $httpStatus < 300)) {
            return $last;
        }

        $isNetworkFailure = ($response === false);
        $retryableHttp = should_retry_upload_http_status($httpStatus);
        if ($attempt < $attempts && ($isNetworkFailure || $retryableHttp)) {
            usleep(250000); // 250ms backoff
            continue;
        }

        break;
    }

    return $last;
}

function build_bill_list_filters()
{
    $whereParts = ['b.`is_hidden` = 0'];
    $params = [];

    $billTypeFilter = normalize_bill_type_filter(query_string_param('bill_type', ''));
    if ($billTypeFilter !== '') {
        $whereParts[] = "(
            LOWER(TRIM(COALESCE(b.`bill_type`, 'water'))) = LOWER(TRIM(?))
            OR " . build_bill_type_presence_sql('b', $billTypeFilter) . "
        )";
        $params[] = $billTypeFilter;
    }

    $searchQuery = trim((string) query_string_param('q', ''));
    if ($searchQuery !== '') {
        $likeValue = '%' . escape_like_pattern($searchQuery) . '%';
        $searchColumns = [
            "COALESCE(pl.`dd`, b.`dd`, '')",
            "COALESCE(pl.`property`, b.`property`, '')",
            "COALESCE(b.`due_period`, '')",
            "COALESCE(pl.`unit_owner`, b.`unit_owner`, '')",
            "COALESCE(pl.`classification`, b.`classification`, '')",
            "COALESCE(pl.`deposit`, b.`deposit`, '')",
            "COALESCE(pl.`rent`, b.`rent`, '')",
            "COALESCE(b.`internet_provider`, '')",
            "COALESCE(b.`internet_account_no`, '')",
            "COALESCE(b.`wifi_amount`, '')",
            "COALESCE(b.`wifi_due_date`, '')",
            "COALESCE(b.`wifi_payment_status`, '')",
            "COALESCE(b.`water_account_no`, '')",
            "COALESCE(b.`water_amount`, '')",
            "COALESCE(b.`water_due_date`, '')",
            "COALESCE(b.`water_payment_status`, '')",
            "COALESCE(b.`electricity_account_no`, '')",
            "COALESCE(b.`electricity_amount`, '')",
            "COALESCE(b.`electricity_due_date`, '')",
            "COALESCE(b.`electricity_payment_status`, '')",
            "COALESCE(b.`association_dues`, '')",
            "COALESCE(b.`association_due_date`, '')",
            "COALESCE(b.`association_payment_status`, '')",
            "COALESCE(pl.`real_property_tax`, b.`real_property_tax`, '')",
            "COALESCE(pl.`rpt_payment_status`, b.`rpt_payment_status`, '')",
            "COALESCE(pl.`penalty`, b.`penalty`, '')",
            "COALESCE(pl.`per_property_status`, b.`per_property_status`, '')",
        ];
        $searchParts = [];
        foreach ($searchColumns as $columnSql) {
            $searchParts[] = "{$columnSql} LIKE ? ESCAPE '\\\\'";
            $params[] = $likeValue;
        }
        $whereParts[] = '(' . implode(' OR ', $searchParts) . ')';
    }

    return [
        'where_sql' => implode(' AND ', $whereParts),
        'params' => $params,
    ];
}

function get_bill_type_module_fields($billType)
{
    $normalized = normalize_bill_type_filter($billType);
    if ($normalized === 'internet') {
        return ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'];
    }
    if ($normalized === 'electricity') {
        return ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'];
    }
    if ($normalized === 'association_dues') {
        return ['association_dues', 'association_due_date', 'association_payment_status'];
    }
    return ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'];
}

function build_bill_type_presence_sql($tableAlias, $billType)
{
    $fields = get_bill_type_module_fields($billType);
    $parts = [];
    foreach ($fields as $field) {
        $parts[] = "TRIM(COALESCE({$tableAlias}.`{$field}`, '')) <> ''";
    }
    if (!$parts) {
        return '1 = 0';
    }
    return '(' . implode(' OR ', $parts) . ')';
}

function find_active_bill_row_by_property_period($pdo, $propertyListId, $billingPeriod)
{
    $id = normalize_positive_int($propertyListId);
    $period = trim((string) $billingPeriod);
    if ($id <= 0 || $period === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT * FROM `property_billing_records`
         WHERE `property_list_id` = ?
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)
           AND `is_hidden` = 0
         ORDER BY `id` DESC
         LIMIT 1"
    );
    $stmt->execute([$id, $period]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function update_bill_row_shared_and_module_fields($pdo, $rowId, $normalized, $billType)
{
    $id = normalize_positive_int($rowId);
    if ($id <= 0) {
        return 0;
    }

    $safeType = normalize_bill_type_filter($billType);
    if ($safeType === '') {
        $safeType = 'water';
    }

    $moduleFields = get_bill_type_module_fields($safeType);
    $setParts = [
        "`property_list_id` = ?",
        "`dd` = ?",
        "`property` = ?",
        "`due_period` = ?",
        "`unit_owner` = ?",
        "`bill_type` = ?",
        "`is_hidden` = 0",
        "`classification` = ?",
        "`deposit` = ?",
        "`rent` = ?",
        "`real_property_tax` = ?",
        "`rpt_payment_status` = ?",
        "`penalty` = ?",
        "`per_property_status` = ?",
    ];
    $params = [
        (int) ($normalized['property_list_id'] ?? 0),
        (string) ($normalized['dd'] ?? ''),
        (string) ($normalized['property'] ?? ''),
        (string) ($normalized['due_period'] ?? ''),
        (string) ($normalized['unit_owner'] ?? ''),
        $safeType,
        (string) ($normalized['classification'] ?? ''),
        (string) ($normalized['deposit'] ?? ''),
        (string) ($normalized['rent'] ?? ''),
        (string) ($normalized['real_property_tax'] ?? ''),
        (string) ($normalized['rpt_payment_status'] ?? ''),
        (string) ($normalized['penalty'] ?? ''),
        (string) ($normalized['per_property_status'] ?? ''),
    ];

    foreach ($moduleFields as $field) {
        $setParts[] = "`{$field}` = ?";
        $params[] = (string) ($normalized[$field] ?? '');
    }

    $params[] = $id;

    $stmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET " . implode(', ', $setParts) . "
         WHERE `id` = ?
           AND `is_hidden` = 0"
    );
    $stmt->execute($params);

    return $stmt->rowCount();
}

function hide_duplicate_active_month_rows($pdo, $propertyListId, $billingPeriod, $keepId)
{
    $id = normalize_positive_int($propertyListId);
    $period = trim((string) $billingPeriod);
    $keep = normalize_positive_int($keepId);
    if ($id <= 0 || $period === '' || $keep <= 0) {
        return 0;
    }

    $stmt = $pdo->prepare(
        "UPDATE `property_billing_records`
         SET `is_hidden` = 1
         WHERE `is_hidden` = 0
           AND `id` <> ?
           AND `property_list_id` = ?
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)"
    );
    $stmt->execute([$keep, $id, $period]);
    return (int) $stmt->rowCount();
}

function handle_bill_actions($action)
{
    $billTypes = API_BILL_TYPES;

    if ($action === 'ocr_health') {
        $n8nWebhookUrl = trim((string) get_app_config('N8N_WEBHOOK_URL', ''));
        if ($n8nWebhookUrl === '') {
            echo json_encode([
                'success' => false,
                'healthy' => false,
                'message' => 'N8N_WEBHOOK_URL is not configured.',
            ]);
            return true;
        }

        $curl = curl_init($n8nWebhookUrl);
        if ($curl === false) {
            echo json_encode([
                'success' => false,
                'healthy' => false,
                'message' => 'Unable to initialize webhook health probe.',
            ]);
            return true;
        }
        curl_setopt($curl, CURLOPT_NOBODY, true);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($curl, CURLOPT_TIMEOUT, 5);
        curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $err = trim((string) curl_error($curl));
        curl_close($curl);

        $healthy = $status > 0 || $err === '';
        echo json_encode([
            'success' => true,
            'healthy' => $healthy,
            'status_code' => $status,
            'message' => $healthy ? 'OCR service is reachable.' : ('OCR health probe failed: ' . ($err !== '' ? $err : 'no response')),
        ]);
        return true;
    }

    if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_valid_bill_json_payload($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $normalized = normalize_csv_payload($data);

        if ((int) ($normalized['property_list_id'] ?? 0) <= 0) {
            echo json_encode(['success' => false, 'message' => 'Select a Property from Property List before saving.']);
            return true;
        }

        if (!in_array($normalized['bill_type'], $billTypes, true)) {
            $normalized['bill_type'] = 'water';
        }
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) ($normalized['due_period'] ?? ''))) {
            echo json_encode(['success' => false, 'message' => 'Due Period is required (YYYY-MM).']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_bill_type_column($pdo);
            ensure_billing_visibility_column($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_property_master_columns($pdo);
            ensure_billing_due_period_column($pdo);
            $pdo->beginTransaction();
            $normalized = resolve_bill_property_master($pdo, $normalized, true);

            if ((int) ($normalized['property_list_id'] ?? 0) <= 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Unable to resolve selected property from Property List.']);
                return true;
            }

            $existingRow = find_active_bill_row_by_property_period(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? '')
            );

            if ($existingRow && isset($existingRow['id'])) {
                $insertedId = (int) $existingRow['id'];
                update_bill_row_shared_and_module_fields(
                    $pdo,
                    $insertedId,
                    $normalized,
                    (string) ($normalized['bill_type'] ?? 'water')
                );
            } else {
                $stmt = $pdo->prepare(
                    "INSERT INTO `property_billing_records` (
                        `property_list_id`, `dd`, `property`, `due_period`, `unit_owner`, `bill_type`, `is_hidden`, `classification`, `deposit`, `rent`, `internet_provider`, `internet_account_no`,
                        `wifi_amount`, `wifi_due_date`, `wifi_payment_status`, `water_account_no`, `water_amount`, `water_due_date`,
                        `water_payment_status`, `electricity_account_no`, `electricity_amount`, `electricity_due_date`,
                        `electricity_payment_status`, `association_dues`, `association_due_date`, `association_payment_status`,
                        `real_property_tax`, `rpt_payment_status`, `penalty`, `per_property_status`
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )"
                );

                $stmt->execute([
                    $normalized['property_list_id'],
                    $normalized['dd'],
                    $normalized['property'],
                    $normalized['due_period'],
                    $normalized['unit_owner'],
                    $normalized['bill_type'],
                    0,
                    $normalized['classification'],
                    $normalized['deposit'],
                    $normalized['rent'],
                    $normalized['internet_provider'],
                    $normalized['internet_account_no'],
                    $normalized['wifi_amount'],
                    $normalized['wifi_due_date'],
                    $normalized['wifi_payment_status'],
                    $normalized['water_account_no'],
                    $normalized['water_amount'],
                    $normalized['water_due_date'],
                    $normalized['water_payment_status'],
                    $normalized['electricity_account_no'],
                    $normalized['electricity_amount'],
                    $normalized['electricity_due_date'],
                    $normalized['electricity_payment_status'],
                    $normalized['association_dues'],
                    $normalized['association_due_date'],
                    $normalized['association_payment_status'],
                    $normalized['real_property_tax'],
                    $normalized['rpt_payment_status'],
                    $normalized['penalty'],
                    $normalized['per_property_status'],
                ]);
                $insertedId = (int) $pdo->lastInsertId();
            }

            sync_property_master_to_billing_rows($pdo, $normalized);
            hide_duplicate_active_month_rows(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? ''),
                $insertedId
            );
            $pdo->commit();
            audit_log_event('bill_create', [
                'bill_id' => $insertedId,
                'property_list_id' => (int) ($normalized['property_list_id'] ?? 0),
                'bill_type' => (string) ($normalized['bill_type'] ?? ''),
            ]);

            echo json_encode(['success' => true, 'message' => 'Bill entry saved successfully.']);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'bill_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_valid_bill_json_payload($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'A valid bill id is required.']);
            return true;
        }

        $normalized = normalize_csv_payload($data);

        if ((int) ($normalized['property_list_id'] ?? 0) <= 0) {
            echo json_encode(['success' => false, 'message' => 'Select a Property from Property List before updating.']);
            return true;
        }

        if (!in_array($normalized['bill_type'], $billTypes, true)) {
            $normalized['bill_type'] = 'water';
        }
        if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) ($normalized['due_period'] ?? ''))) {
            echo json_encode(['success' => false, 'message' => 'Due Period is required (YYYY-MM).']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_bill_type_column($pdo);
            ensure_billing_visibility_column($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_property_master_columns($pdo);
            ensure_billing_due_period_column($pdo);
            $pdo->beginTransaction();

            $selectStmt = $pdo->prepare(
                "SELECT `id`
                 FROM `property_billing_records`
                 WHERE `id` = ?
                   AND `is_hidden` = 0
                 LIMIT 1"
            );
            $selectStmt->execute([$id]);
            $current = $selectStmt->fetch(PDO::FETCH_ASSOC);
            if (!$current) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Bill record not found for the selected property.']);
                return true;
            }

            $normalized = resolve_bill_property_master($pdo, $normalized, true);
            if ((int) ($normalized['property_list_id'] ?? 0) <= 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Unable to resolve selected property from Property List.']);
                return true;
            }

            update_bill_row_shared_and_module_fields(
                $pdo,
                $id,
                $normalized,
                (string) ($normalized['bill_type'] ?? 'water')
            );

            sync_property_master_to_billing_rows($pdo, $normalized);
            hide_duplicate_active_month_rows(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? ''),
                $id
            );

            $pdo->commit();
            audit_log_event('bill_update', [
                'bill_id' => $id,
                'property_list_id' => (int) ($normalized['property_list_id'] ?? 0),
                'bill_type' => (string) ($normalized['bill_type'] ?? ''),
            ]);
            echo json_encode(['success' => true, 'message' => 'Bill record updated successfully.']);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'upload_bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $uploadRequestId = create_bill_upload_request_id();

        if (!isset($_FILES['bill_file']) || $_FILES['bill_file']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error']);
            return true;
        }

        if (!is_uploaded_file($_FILES['bill_file']['tmp_name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid uploaded file.']);
            return true;
        }

        $file_tmp_path = $_FILES['bill_file']['tmp_name'];
        $file_name = $_FILES['bill_file']['name'];
        $file_type = (string) ($_FILES['bill_file']['type'] ?? '');
        $file_size = (int) ($_FILES['bill_file']['size'] ?? 0);

        if ($file_size <= 0 || $file_size > 10 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'File size must be between 1 byte and 10MB.']);
            return true;
        }

        $extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        $allowedExtensionMap = [
            'pdf' => 'application/pdf',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'heic' => 'image/heic',
            'heif' => 'image/heif',
            'webp' => 'image/webp',
        ];
        $hasKnownExtension = $extension !== '' && isset($allowedExtensionMap[$extension]);

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($file_tmp_path) ?: '';
        $browserMime = strtolower(trim($file_type));
        $effectiveMime = $detectedMime;
        if (($effectiveMime === '' || $effectiveMime === 'application/octet-stream') && $browserMime !== '') {
            $effectiveMime = $browserMime;
        }
        if (($effectiveMime === '' || $effectiveMime === 'application/octet-stream') && $hasKnownExtension) {
            $effectiveMime = $allowedExtensionMap[$extension];
        }

        $allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/heic', 'image/heif', 'image/webp'];
        $isMimeAllowed = in_array($effectiveMime, $allowedMimes, true);
        $isHeicFamily = in_array($extension, ['heic', 'heif'], true);

        // Some iOS uploads can arrive as application/octet-stream even when extension/type is HEIC/HEIF.
        if (
            !$isMimeAllowed
            && $isHeicFamily
            && in_array($browserMime, ['image/heic', 'image/heif'], true)
            && in_array($detectedMime, ['', 'application/octet-stream'], true)
        ) {
            $effectiveMime = $browserMime;
            $isMimeAllowed = true;
        }
        // Some mobile browsers send octet-stream for camera captures.
        // Only trust extension fallback when server-side MIME detection is unknown.
        if (
            !$isMimeAllowed
            && $hasKnownExtension
            && in_array($browserMime, ['application/octet-stream', 'binary/octet-stream'], true)
            && in_array($detectedMime, ['', 'application/octet-stream'], true)
        ) {
            $effectiveMime = $allowedExtensionMap[$extension];
            $isMimeAllowed = true;
        }

        if (!$isMimeAllowed) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid file content type. Please upload PDF, JPEG, PNG, WEBP, HEIC, or HEIF.']);
            return true;
        }

        $requestedBillType = trim((string) ($_POST['bill_type'] ?? ''));
        if ($requestedBillType === 'wifi') {
            $requestedBillType = 'internet';
        }
        if (!in_array($requestedBillType, $billTypes, true)) {
            $requestedBillType = '';
        }
        $requestedPropertyListId = normalize_positive_int($_POST['property_list_id'] ?? 0);
        $requestedDd = trim((string) ($_POST['dd'] ?? ''));
        $requestedProperty = trim((string) ($_POST['property'] ?? ''));
        $requestedBillingPeriod = trim((string) ($_POST['due_period'] ?? ''));

        $useMockUpload = parse_boolean_config((string) get_app_config('N8N_USE_MOCK', 'false'), false);
        if ($useMockUpload) {
            echo json_encode(build_mock_bill_upload_response(
                $requestedBillType,
                $requestedDd,
                $requestedProperty,
                $requestedBillingPeriod
            ));
            return true;
        }

        $n8n_webhook_url = trim((string) get_app_config('N8N_WEBHOOK_URL', ''));
        if ($n8n_webhook_url === '') {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'N8N_WEBHOOK_URL is not configured. Add it to .env or config.nmb.',
            ]);
            return true;
        }

        $cfile = new CURLFile($file_tmp_path, $effectiveMime !== '' ? $effectiveMime : $file_type, $file_name);
        $data = [
            // Keep backward compatibility with existing workflow mappings.
            'data' => $cfile,
            // Common n8n webhook file field names.
            'file' => $cfile,
            'bill_file' => $cfile,
            'filename' => $file_name,
            'mime_type' => $effectiveMime,
            'detected_mime_type' => $detectedMime,
            'source_mime_type' => $browserMime,
            'file_extension' => $extension,
            // Metadata to help workflow parse and route all bill modules.
            'bill_type' => $requestedBillType,
            'property_list_id' => $requestedPropertyListId,
            'dd' => $requestedDd,
            'property' => $requestedProperty,
            'due_period' => $requestedBillingPeriod,
        ];

        $uploadResult = execute_n8n_upload_request_with_retry($n8n_webhook_url, $data, 2);
        $response = $uploadResult['response'];
        $http_status = (int) ($uploadResult['status'] ?? 0);
        $curl_error = (string) ($uploadResult['error'] ?? '');
        $attempts = (int) ($uploadResult['attempts'] ?? 1);

        if ($response === false) {
            log_bill_upload_error($uploadRequestId, 'network_error', [
                'details' => $curl_error,
                'attempts' => (string) $attempts,
            ]);
            http_response_code(502);
            echo json_encode([
                'success' => false,
                'message' => 'Unable to reach document processing service.',
                'details' => 'No response from webhook.',
                'request_id' => $uploadRequestId,
            ]);
            return true;
        }

        if ($http_status < 200 || $http_status >= 300) {
            $responseDetail = extract_bill_upload_error_summary($response);
            log_bill_upload_error($uploadRequestId, 'non_2xx', [
                'status' => (string) $http_status,
                'summary' => $responseDetail,
                'attempts' => (string) $attempts,
            ]);
            http_response_code(502);
            echo json_encode([
                'success' => false,
                'message' => 'Document processing service returned an error.',
                'status_code' => $http_status,
                'details' => $responseDetail,
                'request_id' => $uploadRequestId,
            ]);
            return true;
        }

        $trimmedResponse = trim((string) $response);
        $n8n_data = json_decode($response, true);
        $jsonError = json_last_error();
        if ($n8n_data !== null || $jsonError === JSON_ERROR_NONE) {
            if (isset($n8n_data['json'])) {
                $n8n_data = $n8n_data['json'];
            }
            if (isset($n8n_data['success']) && isset($n8n_data['data']) && is_array($n8n_data['data'])) {
                if ($requestedBillType !== '' && (!isset($n8n_data['data']['bill_type']) || trim((string) $n8n_data['data']['bill_type']) === '')) {
                    $n8n_data['data']['bill_type'] = $requestedBillType;
                }
                if ($requestedDd !== '' && (!isset($n8n_data['data']['dd']) || trim((string) $n8n_data['data']['dd']) === '')) {
                    $n8n_data['data']['dd'] = $requestedDd;
                }
                if ($requestedProperty !== '' && (!isset($n8n_data['data']['property']) || trim((string) $n8n_data['data']['property']) === '')) {
                    $n8n_data['data']['property'] = $requestedProperty;
                }
                if ($requestedPropertyListId > 0 && (!isset($n8n_data['data']['property_list_id']) || (int) $n8n_data['data']['property_list_id'] <= 0)) {
                    $n8n_data['data']['property_list_id'] = $requestedPropertyListId;
                }
                if ($requestedBillingPeriod !== '' && (!isset($n8n_data['data']['due_period']) || trim((string) $n8n_data['data']['due_period']) === '')) {
                    $n8n_data['data']['due_period'] = $requestedBillingPeriod;
                }
                $n8n_data['data'] = canonicalize_upload_property_from_master($n8n_data['data'], $requestedBillType);
                echo json_encode($n8n_data);
                return true;
            }

            if (!is_array($n8n_data)) {
                $n8n_data = ['raw' => $n8n_data];
            }
            if ($requestedBillType !== '' && (!isset($n8n_data['bill_type']) || trim((string) $n8n_data['bill_type']) === '')) {
                $n8n_data['bill_type'] = $requestedBillType;
            }
            if ($requestedDd !== '' && (!isset($n8n_data['dd']) || trim((string) $n8n_data['dd']) === '')) {
                $n8n_data['dd'] = $requestedDd;
            }
            if ($requestedProperty !== '' && (!isset($n8n_data['property']) || trim((string) $n8n_data['property']) === '')) {
                $n8n_data['property'] = $requestedProperty;
            }
            if ($requestedPropertyListId > 0 && (!isset($n8n_data['property_list_id']) || (int) $n8n_data['property_list_id'] <= 0)) {
                $n8n_data['property_list_id'] = $requestedPropertyListId;
            }
            if ($requestedBillingPeriod !== '' && (!isset($n8n_data['due_period']) || trim((string) $n8n_data['due_period']) === '')) {
                $n8n_data['due_period'] = $requestedBillingPeriod;
            }
            $n8n_data = canonicalize_upload_property_from_master($n8n_data, $requestedBillType);
            echo json_encode(['success' => true, 'data' => $n8n_data]);
            return true;
        }

        // Some webhook setups return 200 with an empty/non-JSON body.
        // Default behavior is strict error to avoid silent "needs_review" confusion.
        if ($trimmedResponse === '') {
            $allowEmptyResponseFallback = parse_boolean_config((string) get_app_config('N8N_ALLOW_EMPTY_RESPONSE', 'false'), false);
            if (!$allowEmptyResponseFallback) {
                log_bill_upload_error($uploadRequestId, 'invalid_response_format', [
                    'status' => (string) $http_status,
                    'summary' => 'empty response body',
                ]);
                http_response_code(502);
                echo json_encode([
                    'success' => false,
                    'message' => 'Document processing service returned an empty response.',
                    'request_id' => $uploadRequestId,
                ]);
                return true;
            }

            log_bill_upload_error($uploadRequestId, 'empty_response_fallback', [
                'status' => (string) $http_status,
            ]);
            echo json_encode([
                'success' => true,
                'message' => 'Upload completed, but OCR response was empty. Fill in or review extracted fields manually.',
                'data' => [
                    'bill_type' => $requestedBillType !== '' ? $requestedBillType : 'water',
                    'property_list_id' => $requestedPropertyListId,
                    'dd' => $requestedDd,
                    'property' => $requestedProperty,
                    'due_period' => $requestedBillingPeriod,
                ],
                'request_id' => $uploadRequestId,
            ]);
            return true;
        }

        // HTML body usually indicates proxy/web server error page; keep this as an upstream error.
        if (preg_match('/^\s*(?:<!doctype\s+html|<html\b)/i', $trimmedResponse)) {
            log_bill_upload_error($uploadRequestId, 'invalid_response_format', [
                'status' => (string) $http_status,
                'summary' => 'html response body',
            ]);
            http_response_code(502);
            echo json_encode([
                'success' => false,
                'message' => 'Document processing service returned an invalid response format.',
                'request_id' => $uploadRequestId,
            ]);
            return true;
        }

        echo json_encode(['success' => true, 'data' => ['raw_response' => $trimmedResponse]]);
        return true;
    }

    if ($action === 'list') {
        try {
            $pdo = get_db_connection();
            ensure_bill_type_column($pdo);
            ensure_billing_visibility_column($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_billing_due_period_column($pdo);
            ensure_property_master_columns($pdo);
            $filters = build_bill_list_filters();
            $pagination = read_pagination_from_query(25, 200);

            $fromSql = "FROM `property_billing_records` b
                 LEFT JOIN `property_list` pl ON pl.`id` = b.`property_list_id`
                 WHERE {$filters['where_sql']}";

            $total = 0;
            if ($pagination['enabled']) {
                $countStmt = $pdo->prepare("SELECT COUNT(*) {$fromSql}");
                $countStmt->execute($filters['params']);
                $total = (int) $countStmt->fetchColumn();
            }

            $sql = "SELECT
                    b.*,
                    pl.`dd` AS `pl_dd`,
                    pl.`property` AS `pl_property`,
                    b.`due_period` AS `pl_due_period`,
                    pl.`unit_owner` AS `pl_unit_owner`,
                    pl.`classification` AS `pl_classification`,
                    pl.`deposit` AS `pl_deposit`,
                    pl.`rent` AS `pl_rent`,
                    pl.`per_property_status` AS `pl_per_property_status`,
                    pl.`real_property_tax` AS `pl_real_property_tax`,
                    pl.`rpt_payment_status` AS `pl_rpt_payment_status`,
                    pl.`penalty` AS `pl_penalty`
                 {$fromSql}
                 ORDER BY b.`created_at` DESC, b.`id` DESC";
            if ($pagination['enabled']) {
                $safeLimit = max(1, (int) $pagination['per_page']);
                $safeOffset = max(0, (int) $pagination['offset']);
                $sql .= " LIMIT {$safeLimit} OFFSET {$safeOffset}";
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($filters['params']);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $bills = array_map('hydrate_bill_row_from_property_master', $rows);

            if ($pagination['enabled']) {
                $meta = build_pagination_meta($pagination['page'], $pagination['per_page'], $total);
                echo json_encode(['success' => true, 'data' => $bills, 'meta' => $meta]);
            } else {
                echo json_encode(['success' => true, 'data' => $bills]);
            }
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'list_merged') {
        try {
            $pdo = get_db_connection();
            ensure_bill_type_column($pdo);
            ensure_billing_visibility_column($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_property_master_columns($pdo);
            ensure_billing_due_period_column($pdo);
            $stmt = $pdo->query(
                "SELECT
                    b.*,
                    pl.`dd` AS `pl_dd`,
                    pl.`property` AS `pl_property`,
                    b.`due_period` AS `pl_due_period`,
                    pl.`unit_owner` AS `pl_unit_owner`,
                    pl.`classification` AS `pl_classification`,
                    pl.`deposit` AS `pl_deposit`,
                    pl.`rent` AS `pl_rent`,
                    pl.`per_property_status` AS `pl_per_property_status`,
                    pl.`real_property_tax` AS `pl_real_property_tax`,
                    pl.`rpt_payment_status` AS `pl_rpt_payment_status`,
                    pl.`penalty` AS `pl_penalty`
                 FROM `property_billing_records` b
                 LEFT JOIN `property_list` pl ON pl.`id` = b.`property_list_id`
                 WHERE b.`is_hidden` = 0
                 ORDER BY b.`created_at` DESC, b.`id` DESC"
            );
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $groups = [];
            foreach ($rows as $rawRow) {
                $row = hydrate_bill_row_from_property_master($rawRow);
                $propertyListId = normalize_positive_int($row['property_list_id'] ?? 0);
                $dd = trim((string) ($row['dd'] ?? ''));
                $property = trim((string) ($row['property'] ?? ''));
                $billingPeriod = trim((string) ($row['due_period'] ?? ''));
                $baseKey = $propertyListId > 0
                    ? 'pl#' . $propertyListId
                    : strtolower($dd) . '|' . ($property !== '' ? strtolower($property) : '__no_property__');
                $periodKey = $billingPeriod !== '' ? strtolower($billingPeriod) : '__no_period__';
                $key = $baseKey . '|' . $periodKey;
                if (!isset($groups[$key])) {
                    $groups[$key] = [
                        'property_list_id' => $propertyListId,
                        'dd' => $row['dd'] ?? '',
                        'property' => $row['property'] ?? '',
                        'due_period' => $billingPeriod,
                        'water_bill_id' => null,
                        'electricity_bill_id' => null,
                        'internet_bill_id' => null,
                        'association_bill_id' => null,
                        'unit_owner' => $row['unit_owner'] ?? '',
                        'classification' => $row['classification'] ?? '',
                        'deposit' => $row['deposit'] ?? '',
                        'rent' => $row['rent'] ?? '',
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
                        'real_property_tax' => $row['real_property_tax'] ?? '',
                        'rpt_payment_status' => $row['rpt_payment_status'] ?? '',
                        'penalty' => $row['penalty'] ?? '',
                        'per_property_status' => $row['per_property_status'] ?? '',
                        'duplicate_count' => 0,
                        'duplicate_types' => '',
                    ];
                }

                if (($groups[$key]['unit_owner'] ?? '') === '' && ($row['unit_owner'] ?? '') !== '') {
                    $groups[$key]['unit_owner'] = $row['unit_owner'];
                }
                if (($groups[$key]['classification'] ?? '') === '' && ($row['classification'] ?? '') !== '') {
                    $groups[$key]['classification'] = $row['classification'];
                }
                if (($groups[$key]['deposit'] ?? '') === '' && ($row['deposit'] ?? '') !== '') {
                    $groups[$key]['deposit'] = $row['deposit'];
                }
                if (($groups[$key]['rent'] ?? '') === '' && ($row['rent'] ?? '') !== '') {
                    $groups[$key]['rent'] = $row['rent'];
                }
                if (($groups[$key]['real_property_tax'] ?? '') === '' && ($row['real_property_tax'] ?? '') !== '') {
                    $groups[$key]['real_property_tax'] = $row['real_property_tax'];
                }
                if (($groups[$key]['rpt_payment_status'] ?? '') === '' && ($row['rpt_payment_status'] ?? '') !== '') {
                    $groups[$key]['rpt_payment_status'] = $row['rpt_payment_status'];
                }
                if (($groups[$key]['penalty'] ?? '') === '' && ($row['penalty'] ?? '') !== '') {
                    $groups[$key]['penalty'] = $row['penalty'];
                }
                if (($groups[$key]['per_property_status'] ?? '') === '' && ($row['per_property_status'] ?? '') !== '') {
                    $groups[$key]['per_property_status'] = $row['per_property_status'];
                }
                if (($groups[$key]['due_period'] ?? '') === '' && $billingPeriod !== '') {
                    $groups[$key]['due_period'] = $billingPeriod;
                }

                $billType = strtolower(trim((string) ($row['bill_type'] ?? 'water')));
                $rowId = isset($row['id']) ? (int) ($row['id']) : null;

                // Always merge non-empty bill section values, regardless of row bill_type.
                // This supports single-row monthly saves where one row may carry multiple sections.
                $internetFields = ['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'];
                $waterFields = ['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'];
                $electricityFields = ['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'];
                $associationFields = ['association_dues', 'association_due_date', 'association_payment_status'];

                $hasInternetData = false;
                foreach ($internetFields as $field) {
                    $rowValue = $row[$field] ?? '';
                    if (($groups[$key][$field] ?? '') === '' && $rowValue !== '') {
                        $groups[$key][$field] = $rowValue;
                    }
                    if ($rowValue !== '') {
                        $hasInternetData = true;
                    }
                }

                $hasWaterData = false;
                foreach ($waterFields as $field) {
                    $rowValue = $row[$field] ?? '';
                    if (($groups[$key][$field] ?? '') === '' && $rowValue !== '') {
                        $groups[$key][$field] = $rowValue;
                    }
                    if ($rowValue !== '') {
                        $hasWaterData = true;
                    }
                }

                $hasElectricityData = false;
                foreach ($electricityFields as $field) {
                    $rowValue = $row[$field] ?? '';
                    if (($groups[$key][$field] ?? '') === '' && $rowValue !== '') {
                        $groups[$key][$field] = $rowValue;
                    }
                    if ($rowValue !== '') {
                        $hasElectricityData = true;
                    }
                }

                $hasAssociationData = false;
                foreach ($associationFields as $field) {
                    $rowValue = $row[$field] ?? '';
                    if (($groups[$key][$field] ?? '') === '' && $rowValue !== '') {
                        $groups[$key][$field] = $rowValue;
                    }
                    if ($rowValue !== '') {
                        $hasAssociationData = true;
                    }
                }

                if ($groups[$key]['internet_bill_id'] === null && $hasInternetData) {
                    $groups[$key]['internet_bill_id'] = $rowId;
                }
                if ($groups[$key]['water_bill_id'] === null && $hasWaterData) {
                    $groups[$key]['water_bill_id'] = $rowId;
                }
                if ($groups[$key]['electricity_bill_id'] === null && $hasElectricityData) {
                    $groups[$key]['electricity_bill_id'] = $rowId;
                }
                if ($groups[$key]['association_bill_id'] === null && $hasAssociationData) {
                    $groups[$key]['association_bill_id'] = $rowId;
                }

                if ($billType === 'internet') {
                    $groups[$key]['internet_bill_id'] = $rowId;
                } elseif ($billType === 'electricity') {
                    $groups[$key]['electricity_bill_id'] = $rowId;
                } elseif ($billType === 'association_dues') {
                    $groups[$key]['association_bill_id'] = $rowId;
                } else {
                    $groups[$key]['water_bill_id'] = $rowId;
                }
            }

            $merged = array_values($groups);
            echo json_encode(['success' => true, 'data' => $merged]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    return false;
}

