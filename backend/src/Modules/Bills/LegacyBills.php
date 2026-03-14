<?php
/*
 * Finance App File: api/bills.php
 * Purpose: Bill upload, CRUD, and list handlers.
 */

require_once __DIR__ . '/ReviewQueueStore.php';

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

function normalize_due_period_filter($value)
{
    $normalized = trim((string) $value);
    if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $normalized) === 1) {
        return $normalized;
    }

    return '';
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

    write_bill_ocr_monitor_event('upload_error', $requestId, array_merge(
        ['event' => $event],
        is_array($context) ? $context : []
    ));
}

function resolve_bill_ocr_monitor_log_path()
{
    $configured = trim((string) get_app_config('OCR_MONITOR_LOG_PATH', ''));
    if ($configured !== '') {
        return $configured;
    }

    return dirname(__DIR__, 4)
        . DIRECTORY_SEPARATOR . 'backend'
        . DIRECTORY_SEPARATOR . 'storage'
        . DIRECTORY_SEPARATOR . 'logs'
        . DIRECTORY_SEPARATOR . 'ocr_failures.jsonl';
}

function write_bill_ocr_monitor_event($kind, $requestId, $context = [])
{
    $payload = [
        'kind' => sanitize_bill_upload_log_value($kind, 60),
        'time_utc' => gmdate('Y-m-d\TH:i:s\Z'),
        'request_id' => sanitize_bill_upload_log_value($requestId, 60),
        'request_method' => sanitize_bill_upload_log_value($_SERVER['REQUEST_METHOD'] ?? '', 16),
        'request_uri' => sanitize_bill_upload_log_value($_SERVER['REQUEST_URI'] ?? '', 255),
        'ip' => function_exists('get_request_ip_address') ? get_request_ip_address() : '',
        'username' => sanitize_bill_upload_log_value($_SESSION['username'] ?? '', 120),
        'context' => [],
    ];

    if (is_array($context)) {
        foreach ($context as $key => $value) {
            $cleanKey = preg_replace('/[^a-z0-9_]/i', '', (string) $key);
            if ($cleanKey === '') {
                continue;
            }

            if (is_array($value) || is_object($value)) {
                $encoded = json_encode($value, JSON_UNESCAPED_SLASHES);
                $payload['context'][$cleanKey] = $encoded === false
                    ? sanitize_bill_upload_log_value('[unencodable]', 120)
                    : sanitize_bill_upload_log_value($encoded, 400);
                continue;
            }

            $payload['context'][$cleanKey] = sanitize_bill_upload_log_value($value, 400);
        }
    }

    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded) || $encoded === '') {
        return;
    }

    $path = resolve_bill_ocr_monitor_log_path();
    $directory = dirname($path);
    if (!is_dir($directory)) {
        @mkdir($directory, 0777, true);
    }

    @file_put_contents($path, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX);

    if (function_exists('audit_log_event')) {
        audit_log_event('bill_ocr_monitor_event', [
            'request_id' => $payload['request_id'],
            'kind' => $payload['kind'],
            'summary' => $payload['context']['event'] ?? ($payload['context']['message'] ?? ''),
        ]);
    }
}

function should_retry_upload_http_status($statusCode)
{
    $status = (int) $statusCode;
    return $status === 408 || $status === 429 || ($status >= 500 && $status <= 599);
}

function probe_bill_http_endpoint($url, $method = 'GET', $body = null, $headers = [], $connectTimeout = 3, $timeout = 5)
{
    $endpoint = trim((string) $url);
    if ($endpoint === '') {
        return [
            'status' => 0,
            'error' => 'missing_url',
            'body' => '',
        ];
    }

    $curl = curl_init($endpoint);
    if ($curl === false) {
        return [
            'status' => 0,
            'error' => 'Unable to initialize cURL.',
            'body' => '',
        ];
    }

    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, max(1, (int) $connectTimeout));
    curl_setopt($curl, CURLOPT_TIMEOUT, max(1, (int) $timeout));
    curl_setopt($curl, CURLOPT_CUSTOMREQUEST, strtoupper((string) $method));
    curl_setopt($curl, CURLOPT_HTTPHEADER, !empty($headers) ? $headers : ['Accept: application/json']);
    if ($body !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    } else {
        curl_setopt($curl, CURLOPT_POSTFIELDS, null);
    }

    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = trim((string) curl_error($curl));
    curl_close($curl);

    return [
        'status' => $status,
        'error' => $error,
        'body' => $response === false ? '' : (string) $response,
    ];
}

function resolve_bill_ocr_health_sample_file()
{
    $configured = trim((string) get_app_config('OCR_HEALTH_SAMPLE_FILE', ''));
    if ($configured !== '') {
        return $configured;
    }

    return dirname(__DIR__, 4) . DIRECTORY_SEPARATOR . 'Examples' . DIRECTORY_SEPARATOR . 'Samples' . DIRECTORY_SEPARATOR . 'wifi-bill-sample.pdf';
}

function validate_bill_ocr_health_payload($payload)
{
    if (!is_array($payload)) {
        return [
            'healthy' => false,
            'message' => 'Workflow probe returned a non-JSON payload.',
            'data' => [],
        ];
    }

    if (isset($payload['json']) && is_array($payload['json'])) {
        $payload = $payload['json'];
    }

    $data = $payload;
    if (isset($payload['success']) && isset($payload['data']) && is_array($payload['data'])) {
        $data = $payload['data'];
    }

    if (!is_array($data)) {
        return [
            'healthy' => false,
            'message' => 'Workflow probe returned JSON without a structured data object.',
            'data' => [],
        ];
    }

    $required = ['bill_type', 'due_period', 'internet_account_no', 'wifi_amount', 'wifi_due_date'];
    $missing = [];
    foreach ($required as $field) {
        if (trim((string) ($data[$field] ?? '')) === '') {
            $missing[] = $field;
        }
    }

    if (!empty($missing)) {
        return [
            'healthy' => false,
            'message' => 'Workflow probe response was missing fields: ' . implode(', ', $missing),
            'data' => $data,
        ];
    }

    return [
        'healthy' => true,
        'message' => 'OCR workflow probe returned valid bill data.',
        'data' => $data,
    ];
}

function run_bill_ocr_workflow_health_probe($n8nWebhookUrl)
{
    $sampleFile = resolve_bill_ocr_health_sample_file();
    if (!is_file($sampleFile)) {
        return [
            'healthy' => false,
            'status' => 0,
            'error' => 'Health sample file was not found: ' . $sampleFile,
            'message' => 'Workflow health sample file is missing.',
            'sample_file' => $sampleFile,
            'response' => '',
            'data' => [],
        ];
    }

    $mime = 'application/pdf';
    $cfile = new CURLFile($sampleFile, $mime, basename($sampleFile));
    $postData = [
        'data' => $cfile,
        'file' => $cfile,
        'bill_file' => $cfile,
        'filename' => basename($sampleFile),
        'mime_type' => $mime,
        'detected_mime_type' => $mime,
        'source_mime_type' => $mime,
        'file_extension' => 'pdf',
        'bill_type' => 'internet',
        'property_list_id' => 0,
        'dd' => '',
        'property' => '',
        'due_period' => '2026-03',
    ];

    $uploadResult = execute_n8n_upload_request_with_retry($n8nWebhookUrl, $postData, 1);
    $response = $uploadResult['response'];
    $status = (int) ($uploadResult['status'] ?? 0);
    $error = trim((string) ($uploadResult['error'] ?? ''));

    if ($response === false) {
        return [
            'healthy' => false,
            'status' => $status,
            'error' => $error !== '' ? $error : 'No response from workflow probe.',
            'message' => 'Workflow probe could not reach the n8n upload endpoint.',
            'sample_file' => $sampleFile,
            'response' => '',
            'data' => [],
        ];
    }

    if ($status < 200 || $status >= 300) {
        return [
            'healthy' => false,
            'status' => $status,
            'error' => extract_bill_upload_error_summary($response),
            'message' => 'Workflow probe received a non-2xx response.',
            'sample_file' => $sampleFile,
            'response' => (string) $response,
            'data' => [],
        ];
    }

    $trimmed = trim((string) $response);
    if ($trimmed === '') {
        return [
            'healthy' => false,
            'status' => $status,
            'error' => 'empty response body',
            'message' => 'Workflow probe returned an empty response body.',
            'sample_file' => $sampleFile,
            'response' => '',
            'data' => [],
        ];
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded) && json_last_error() !== JSON_ERROR_NONE) {
        return [
            'healthy' => false,
            'status' => $status,
            'error' => 'invalid json',
            'message' => 'Workflow probe returned invalid JSON.',
            'sample_file' => $sampleFile,
            'response' => $trimmed,
            'data' => [],
        ];
    }

    $validation = validate_bill_ocr_health_payload($decoded);
    return [
        'healthy' => (bool) ($validation['healthy'] ?? false),
        'status' => $status,
        'error' => (string) ($validation['healthy'] ?? false ? '' : ($validation['message'] ?? 'Workflow probe failed.')),
        'message' => (string) ($validation['message'] ?? ''),
        'sample_file' => $sampleFile,
        'response' => $trimmed,
        'data' => $validation['data'] ?? [],
    ];
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

    $duePeriodFilter = normalize_due_period_filter(query_string_param('due_period', ''));
    if ($duePeriodFilter !== '') {
        $whereParts[] = "b.`due_period` = ?";
        $params[] = $duePeriodFilter;
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

function get_bill_merge_fields()
{
    return [
        'property_list_id',
        'dd',
        'property',
        'due_period',
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
}

function merge_bill_rows_keep_latest_values(array $rowsDescById)
{
    $merged = [];
    foreach (get_bill_merge_fields() as $field) {
        $merged[$field] = $field === 'property_list_id' ? 0 : '';
    }

    foreach ($rowsDescById as $row) {
        foreach (get_bill_merge_fields() as $field) {
            if ($field === 'property_list_id') {
                $candidate = normalize_positive_int($row[$field] ?? 0);
                if ((int) ($merged[$field] ?? 0) <= 0 && $candidate > 0) {
                    $merged[$field] = $candidate;
                }
                continue;
            }

            if (trim((string) ($merged[$field] ?? '')) !== '') {
                continue;
            }

            $candidate = trim((string) ($row[$field] ?? ''));
            if ($candidate !== '') {
                $merged[$field] = $candidate;
            }
        }
    }

    $merged['property_list_id'] = normalize_positive_int($merged['property_list_id'] ?? 0);
    $merged['bill_type'] = normalize_bill_type_filter($merged['bill_type'] ?? '') ?: 'water';

    return $merged;
}

function build_monthly_record_payload(array $row)
{
    $hydrated = hydrate_bill_row_from_property_master($row);
    $rowId = normalize_positive_int($hydrated['id'] ?? 0);
    $hasInternetData = false;
    foreach (['internet_provider', 'internet_account_no', 'wifi_amount', 'wifi_due_date', 'wifi_payment_status'] as $field) {
        if (trim((string) ($hydrated[$field] ?? '')) !== '') {
            $hasInternetData = true;
            break;
        }
    }
    $hasWaterData = false;
    foreach (['water_account_no', 'water_amount', 'water_due_date', 'water_payment_status'] as $field) {
        if (trim((string) ($hydrated[$field] ?? '')) !== '') {
            $hasWaterData = true;
            break;
        }
    }
    $hasElectricityData = false;
    foreach (['electricity_account_no', 'electricity_amount', 'electricity_due_date', 'electricity_payment_status'] as $field) {
        if (trim((string) ($hydrated[$field] ?? '')) !== '') {
            $hasElectricityData = true;
            break;
        }
    }
    $hasAssociationData = false;
    foreach (['association_dues', 'association_due_date', 'association_payment_status'] as $field) {
        if (trim((string) ($hydrated[$field] ?? '')) !== '') {
            $hasAssociationData = true;
            break;
        }
    }

    return [
        'id' => $rowId,
        'property_list_id' => normalize_positive_int($hydrated['property_list_id'] ?? 0),
        'dd' => $hydrated['dd'] ?? '',
        'property' => $hydrated['property'] ?? '',
        'due_period' => trim((string) ($hydrated['due_period'] ?? '')),
        'bill_type' => normalize_bill_type_filter($hydrated['bill_type'] ?? '') ?: 'water',
        'water_bill_id' => $hasWaterData ? $rowId : 0,
        'electricity_bill_id' => $hasElectricityData ? $rowId : 0,
        'internet_bill_id' => $hasInternetData ? $rowId : 0,
        'association_bill_id' => $hasAssociationData ? $rowId : 0,
        'unit_owner' => $hydrated['unit_owner'] ?? '',
        'classification' => $hydrated['classification'] ?? '',
        'deposit' => $hydrated['deposit'] ?? '',
        'rent' => $hydrated['rent'] ?? '',
        'internet_provider' => $hydrated['internet_provider'] ?? '',
        'internet_account_no' => $hydrated['internet_account_no'] ?? '',
        'wifi_amount' => $hydrated['wifi_amount'] ?? '',
        'wifi_due_date' => $hydrated['wifi_due_date'] ?? '',
        'wifi_payment_status' => $hydrated['wifi_payment_status'] ?? '',
        'water_account_no' => $hydrated['water_account_no'] ?? '',
        'water_amount' => $hydrated['water_amount'] ?? '',
        'water_due_date' => $hydrated['water_due_date'] ?? '',
        'water_payment_status' => $hydrated['water_payment_status'] ?? '',
        'electricity_account_no' => $hydrated['electricity_account_no'] ?? '',
        'electricity_amount' => $hydrated['electricity_amount'] ?? '',
        'electricity_due_date' => $hydrated['electricity_due_date'] ?? '',
        'electricity_payment_status' => $hydrated['electricity_payment_status'] ?? '',
        'association_dues' => $hydrated['association_dues'] ?? '',
        'association_due_date' => $hydrated['association_due_date'] ?? '',
        'association_payment_status' => $hydrated['association_payment_status'] ?? '',
        'real_property_tax' => $hydrated['real_property_tax'] ?? '',
        'rpt_payment_status' => $hydrated['rpt_payment_status'] ?? '',
        'penalty' => $hydrated['penalty'] ?? '',
        'per_property_status' => $hydrated['per_property_status'] ?? '',
        'duplicate_count' => 0,
        'duplicate_types' => '',
    ];
}

function fetch_monthly_record_rows($pdo, array $filters, $pagination = null, $limitOverride = 0)
{
    $fromSql = "FROM `property_billing_records` b
         LEFT JOIN `property_list` pl ON pl.`id` = b.`property_list_id`
         WHERE {$filters['where_sql']}";

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

    if ($limitOverride > 0) {
        $sql .= ' LIMIT ' . max(1, (int) $limitOverride);
    } elseif (is_array($pagination) && !empty($pagination['enabled'])) {
        $safeLimit = max(1, (int) $pagination['per_page']);
        $safeOffset = max(0, (int) $pagination['offset']);
        $sql .= " LIMIT {$safeLimit} OFFSET {$safeOffset}";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($filters['params']);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map('build_monthly_record_payload', $rows);
}

function count_monthly_record_rows($pdo, array $filters)
{
    $countStmt = $pdo->prepare(
        "SELECT COUNT(*)
         FROM `property_billing_records` b
         LEFT JOIN `property_list` pl ON pl.`id` = b.`property_list_id`
         WHERE {$filters['where_sql']}"
    );
    $countStmt->execute($filters['params']);
    return (int) $countStmt->fetchColumn();
}

function normalize_bill_amount_value($value)
{
    $text = trim((string) $value);
    if ($text === '') {
        return 0.0;
    }

    $cleaned = preg_replace('/[^\d\.\-]/', '', str_replace(',', '', $text));
    if (!is_string($cleaned) || $cleaned === '') {
        return 0.0;
    }

    $parsed = (float) $cleaned;
    return is_finite($parsed) ? $parsed : 0.0;
}

function is_paid_bill_status($status)
{
    $normalized = strtolower(trim((string) $status));
    if ($normalized === '') {
        return false;
    }

    return $normalized === 'paid'
        || $normalized === 'settled'
        || $normalized === 'completed';
}

function compute_monthly_record_total(array $row)
{
    return normalize_bill_amount_value($row['wifi_amount'] ?? '')
        + normalize_bill_amount_value($row['water_amount'] ?? '')
        + normalize_bill_amount_value($row['electricity_amount'] ?? '')
        + normalize_bill_amount_value($row['association_dues'] ?? '');
}

function compute_monthly_record_pending(array $row)
{
    $pending = 0.0;
    $modules = [
        ['wifi_amount', 'wifi_payment_status'],
        ['water_amount', 'water_payment_status'],
        ['electricity_amount', 'electricity_payment_status'],
        ['association_dues', 'association_payment_status'],
    ];

    foreach ($modules as [$amountField, $statusField]) {
        $amount = normalize_bill_amount_value($row[$amountField] ?? '');
        if ($amount <= 0) {
            continue;
        }
        if (!is_paid_bill_status($row[$statusField] ?? '')) {
            $pending += $amount;
        }
    }

    return $pending;
}

function build_dashboard_amount_sql($columnName)
{
    $safeColumn = preg_replace('/[^a-z0-9_]/i', '', (string) $columnName);
    if (!is_string($safeColumn) || $safeColumn === '') {
        return '0';
    }

    return "CAST(REPLACE(REPLACE(TRIM(COALESCE(b.`{$safeColumn}`, '')), ',', ''), '₱', '') AS DECIMAL(14,2))";
}

function build_dashboard_pending_sql($amountColumn, $statusColumn)
{
    $amountSql = build_dashboard_amount_sql($amountColumn);
    $safeStatusColumn = preg_replace('/[^a-z0-9_]/i', '', (string) $statusColumn);
    if (!is_string($safeStatusColumn) || $safeStatusColumn === '') {
        return '0';
    }

    return "(CASE
        WHEN {$amountSql} > 0
         AND LOWER(TRIM(COALESCE(b.`{$safeStatusColumn}`, ''))) NOT IN ('paid', 'settled', 'completed')
        THEN {$amountSql}
        ELSE 0
    END)";
}

function fetch_dashboard_period_aggregates($pdo, $currentDuePeriod)
{
    $wifiAmountSql = build_dashboard_amount_sql('wifi_amount');
    $waterAmountSql = build_dashboard_amount_sql('water_amount');
    $electricityAmountSql = build_dashboard_amount_sql('electricity_amount');
    $associationAmountSql = build_dashboard_amount_sql('association_dues');
    $wifiPendingSql = build_dashboard_pending_sql('wifi_amount', 'wifi_payment_status');
    $waterPendingSql = build_dashboard_pending_sql('water_amount', 'water_payment_status');
    $electricityPendingSql = build_dashboard_pending_sql('electricity_amount', 'electricity_payment_status');
    $associationPendingSql = build_dashboard_pending_sql('association_dues', 'association_payment_status');
    $rowTotalSql = "({$wifiAmountSql} + {$waterAmountSql} + {$electricityAmountSql} + {$associationAmountSql})";
    $rowPendingSql = "({$wifiPendingSql} + {$waterPendingSql} + {$electricityPendingSql} + {$associationPendingSql})";

    $stmt = $pdo->prepare(
        "SELECT
            COUNT(*) AS `current_period_count`,
            COALESCE(SUM({$rowTotalSql}), 0) AS `total_billed`,
            COALESCE(SUM({$rowPendingSql}), 0) AS `pending_collections`,
            COALESCE(SUM(CASE WHEN {$rowPendingSql} > 0 THEN 1 ELSE 0 END), 0) AS `unpaid_count`
         FROM `property_billing_records` b
         WHERE b.`is_hidden` = 0
           AND b.`due_period` = ?"
    );
    $stmt->execute([trim((string) $currentDuePeriod)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    return [
        'current_period_count' => (int) ($row['current_period_count'] ?? 0),
        'total_billed' => round((float) ($row['total_billed'] ?? 0), 2),
        'pending_collections' => round((float) ($row['pending_collections'] ?? 0), 2),
        'unpaid_count' => (int) ($row['unpaid_count'] ?? 0),
    ];
}

function build_dashboard_summary_payload($pdo)
{
    $currentDuePeriod = date('Y-m');
    $recentRows = fetch_monthly_record_rows($pdo, [
        'where_sql' => 'b.`is_hidden` = 0',
        'params' => [],
    ], null, 8);
    $aggregates = fetch_dashboard_period_aggregates($pdo, $currentDuePeriod);

    return [
        'current_due_period' => $currentDuePeriod,
        'current_period_count' => (int) ($aggregates['current_period_count'] ?? 0),
        'total_billed' => (float) ($aggregates['total_billed'] ?? 0),
        'pending_collections' => (float) ($aggregates['pending_collections'] ?? 0),
        'unpaid_count' => (int) ($aggregates['unpaid_count'] ?? 0),
        'recent_rows' => $recentRows,
    ];
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

function find_active_bill_row_by_property_period($pdo, $propertyListId, $billingPeriod, $billType = '')
{
    $id = normalize_positive_int($propertyListId);
    $period = trim((string) $billingPeriod);
    if ($id <= 0 || $period === '') {
        return null;
    }

    $params = [$id, $period];
    $sql = "SELECT * FROM `property_billing_records`
         WHERE `property_list_id` = ?
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)
           AND `is_hidden` = 0";
    $sql .= "
         ORDER BY `id` DESC
         LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
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

function hide_duplicate_active_month_rows($pdo, $propertyListId, $billingPeriod, $keepId, $billType = '')
{
    $id = normalize_positive_int($propertyListId);
    $period = trim((string) $billingPeriod);
    $keep = normalize_positive_int($keepId);
    if ($id <= 0 || $period === '' || $keep <= 0) {
        return 0;
    }

    $params = [$keep, $id, $period];
    $sql = "UPDATE `property_billing_records`
         SET `is_hidden` = 1
         WHERE `is_hidden` = 0
           AND `id` <> ?
           AND `property_list_id` = ?
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->rowCount();
}

function find_active_bill_row_by_id($pdo, $rowId)
{
    $id = normalize_positive_int($rowId);
    if ($id <= 0) {
        return null;
    }

    $stmt = $pdo->prepare(
        "SELECT *
         FROM `property_billing_records`
         WHERE `id` = ?
           AND `is_hidden` = 0
         LIMIT 1"
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function consolidate_active_month_rows($pdo, $propertyListId, $billingPeriod)
{
    $id = normalize_positive_int($propertyListId);
    $period = trim((string) $billingPeriod);
    if ($id <= 0 || $period === '') {
        return 0;
    }

    $stmt = $pdo->prepare(
        "SELECT *
         FROM `property_billing_records`
         WHERE `property_list_id` = ?
           AND TRIM(COALESCE(`due_period`, '')) = TRIM(?)
           AND `is_hidden` = 0
         ORDER BY `id` DESC"
    );
    $stmt->execute([$id, $period]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        return 0;
    }

    $keepId = normalize_positive_int($rows[0]['id'] ?? 0);
    if ($keepId <= 0) {
        return 0;
    }

    if (count($rows) === 1) {
        return $keepId;
    }

    $merged = merge_bill_rows_keep_latest_values($rows);
    update_bill_row_shared_and_module_fields(
        $pdo,
        $keepId,
        $merged,
        (string) ($merged['bill_type'] ?? 'water')
    );
    hide_duplicate_active_month_rows($pdo, $id, $period, $keepId, (string) ($merged['bill_type'] ?? 'water'));

    return $keepId;
}

function handle_bill_actions($action)
{
    $billTypes = API_BILL_TYPES;

    if ($action === 'review_queue_list') {
        try {
            $pdo = get_db_connection();
            $rows = fetch_review_queue_rows_for_user($pdo, (int) ($_SESSION['user_id'] ?? 0));
            echo json_encode(['success' => true, 'data' => $rows]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'review_queue_summary') {
        try {
            $pdo = get_db_connection();
            $summary = fetch_review_queue_summary_for_user($pdo, (int) ($_SESSION['user_id'] ?? 0));
            echo json_encode(['success' => true, 'data' => $summary]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'dashboard_summary') {
        try {
            $pdo = get_db_connection();
            ensure_bill_type_column($pdo);
            ensure_billing_visibility_column($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_property_master_columns($pdo);
            ensure_billing_due_period_column($pdo);
            enforce_monthly_identity_health($pdo);
            $summary = build_dashboard_summary_payload($pdo);
            echo json_encode(['success' => true, 'data' => $summary]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'review_queue_replace' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $rows = [];

        if (is_array($data) && array_key_exists('rows', $data) && is_array($data['rows'])) {
            $rows = $data['rows'];
        } elseif (is_array($data) && (count($data) === 0 || array_keys($data) === range(0, count($data) - 1))) {
            $rows = $data;
        } elseif (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
            return true;
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Review queue payload must contain a rows array.']);
            return true;
        }

        if (count($rows) > 500) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Review queue payload is too large.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            $persistedRows = replace_review_queue_rows_for_user($pdo, (int) ($_SESSION['user_id'] ?? 0), $rows);
            echo json_encode([
                'success' => true,
                'message' => 'Review queue saved.',
                'data' => $persistedRows,
            ]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

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

        $webhookScheme = strtolower((string) parse_url($n8nWebhookUrl, PHP_URL_SCHEME));
        if (!in_array($webhookScheme, ['http', 'https'], true)) {
            echo json_encode([
                'success' => false,
                'healthy' => false,
                'message' => 'N8N_WEBHOOK_URL must use http or https.',
            ]);
            return true;
        }

        $ocrHealthUrl = trim((string) get_app_config('OCR_HEALTH_URL', 'http://localhost:8001/health'));
        $ocrHealthScheme = strtolower((string) parse_url($ocrHealthUrl, PHP_URL_SCHEME));
        if ($ocrHealthUrl === '' || !in_array($ocrHealthScheme, ['http', 'https'], true)) {
            echo json_encode([
                'success' => false,
                'healthy' => false,
                'message' => 'OCR_HEALTH_URL must use http or https.',
            ]);
            return true;
        }

        $ocrProbe = probe_bill_http_endpoint($ocrHealthUrl, 'GET');
        $ocrHealthy = ((int) ($ocrProbe['status'] ?? 0) >= 200 && (int) ($ocrProbe['status'] ?? 0) < 300)
            && trim((string) ($ocrProbe['error'] ?? '')) === '';

        $workflowProbe = $ocrHealthy
            ? run_bill_ocr_workflow_health_probe($n8nWebhookUrl)
            : [
                'healthy' => false,
                'status' => 0,
                'error' => 'OCR API must be healthy before running the workflow probe.',
                'message' => 'Workflow probe skipped because OCR API is unhealthy.',
                'sample_file' => resolve_bill_ocr_health_sample_file(),
                'response' => '',
                'data' => [],
            ];

        $healthy = $ocrHealthy && !empty($workflowProbe['healthy']);
        $message = 'OCR workflow probe passed.';
        if (!$ocrHealthy) {
            $message = 'OCR API health check failed: ' . (($ocrProbe['error'] ?? '') !== '' ? $ocrProbe['error'] : ('HTTP ' . (int) ($ocrProbe['status'] ?? 0)));
        } elseif (empty($workflowProbe['healthy'])) {
            $message = (string) ($workflowProbe['message'] ?? 'Workflow probe failed.');
        }

        if (!$healthy) {
            write_bill_ocr_monitor_event('health_probe_failure', 'ocr_health_probe', [
                'message' => $message,
                'ocr_api_status' => (string) ((int) ($ocrProbe['status'] ?? 0)),
                'ocr_api_error' => (string) ($ocrProbe['error'] ?? ''),
                'workflow_status' => (string) ((int) ($workflowProbe['status'] ?? 0)),
                'workflow_error' => (string) ($workflowProbe['error'] ?? ''),
                'sample_file' => (string) ($workflowProbe['sample_file'] ?? ''),
            ]);
        }

        echo json_encode([
            'success' => true,
            'healthy' => $healthy,
            'message' => $message,
            'checks' => [
                'workflow_probe' => [
                    'url' => $n8nWebhookUrl,
                    'healthy' => !empty($workflowProbe['healthy']),
                    'status_code' => (int) ($workflowProbe['status'] ?? 0),
                    'error' => (string) ($workflowProbe['error'] ?? ''),
                    'message' => (string) ($workflowProbe['message'] ?? ''),
                    'sample_file' => (string) ($workflowProbe['sample_file'] ?? ''),
                    'data' => is_array($workflowProbe['data'] ?? null) ? $workflowProbe['data'] : [],
                ],
                'ocr_api' => [
                    'url' => $ocrHealthUrl,
                    'healthy' => $ocrHealthy,
                    'status_code' => (int) ($ocrProbe['status'] ?? 0),
                    'error' => (string) ($ocrProbe['error'] ?? ''),
                ],
            ],
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
            enforce_monthly_identity_health($pdo);
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
                (string) ($normalized['due_period'] ?? ''),
                (string) ($normalized['bill_type'] ?? 'water')
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
            $insertedId = consolidate_active_month_rows(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? '')
            );
            $pdo->commit();
            audit_log_event('bill_create', [
                'bill_id' => $insertedId,
                'property_list_id' => (int) ($normalized['property_list_id'] ?? 0),
                'bill_type' => (string) ($normalized['bill_type'] ?? ''),
            ]);

            $message = $existingRow && isset($existingRow['id'])
                ? 'An existing monthly record was updated for this property and due period.'
                : 'Bill entry saved successfully.';
            echo json_encode([
                'success' => true,
                'message' => $message,
                'data' => ['id' => $insertedId],
            ]);
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
            enforce_monthly_identity_health($pdo);
            $pdo->beginTransaction();

            $current = find_active_bill_row_by_id($pdo, $id);
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

            $canonicalRow = find_active_bill_row_by_property_period(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? ''),
                (string) ($normalized['bill_type'] ?? 'water')
            );
            $targetId = $id;
            if ($canonicalRow && normalize_positive_int($canonicalRow['id'] ?? 0) > 0) {
                $canonicalId = normalize_positive_int($canonicalRow['id'] ?? 0);
                if ($canonicalId !== $id) {
                    $merged = merge_bill_rows_keep_latest_values([$normalized, $current, $canonicalRow]);
                    update_bill_row_shared_and_module_fields(
                        $pdo,
                        $canonicalId,
                        $merged,
                        (string) ($normalized['bill_type'] ?? 'water')
                    );
                    $hideStmt = $pdo->prepare(
                        "UPDATE `property_billing_records`
                         SET `is_hidden` = 1
                         WHERE `id` = ?"
                    );
                    $hideStmt->execute([$id]);
                    $targetId = $canonicalId;
                }
            }

            if ($targetId === $id) {
                update_bill_row_shared_and_module_fields(
                    $pdo,
                    $id,
                    $normalized,
                    (string) ($normalized['bill_type'] ?? 'water')
                );
            }

            sync_property_master_to_billing_rows($pdo, $normalized);
            $targetId = consolidate_active_month_rows(
                $pdo,
                (int) ($normalized['property_list_id'] ?? 0),
                (string) ($normalized['due_period'] ?? '')
            );

            $pdo->commit();
            audit_log_event('bill_update', [
                'bill_id' => $targetId,
                'property_list_id' => (int) ($normalized['property_list_id'] ?? 0),
                'bill_type' => (string) ($normalized['bill_type'] ?? ''),
            ]);
            echo json_encode([
                'success' => true,
                'message' => 'Bill record updated successfully.',
                'data' => ['id' => $targetId],
            ]);
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
        $file_name = normalize_uploaded_bill_filename($_FILES['bill_file']['name'] ?? '');
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

        if (!is_valid_uploaded_bill_payload($file_tmp_path, $effectiveMime)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Uploaded file content did not match a supported bill document.']);
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

        $webhookScheme = strtolower((string) parse_url($n8n_webhook_url, PHP_URL_SCHEME));
        if (!in_array($webhookScheme, ['http', 'https'], true)) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'N8N_WEBHOOK_URL must use http or https.',
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
                'bill_type' => $requestedBillType,
                'file_name' => $file_name,
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
                'bill_type' => $requestedBillType,
                'file_name' => $file_name,
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
                    'bill_type' => $requestedBillType,
                    'file_name' => $file_name,
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
                'bill_type' => $requestedBillType,
                'file_name' => $file_name,
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
                'bill_type' => $requestedBillType,
                'file_name' => $file_name,
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
            enforce_monthly_identity_health($pdo);
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
            enforce_monthly_identity_health($pdo);
            $filters = build_bill_list_filters();
            $pagination = read_pagination_from_query(10, 200);
            $merged = fetch_monthly_record_rows($pdo, $filters, $pagination);

            if (!empty($pagination['enabled'])) {
                $total = count_monthly_record_rows($pdo, $filters);
                $meta = build_pagination_meta($pagination['page'], $pagination['per_page'], $total);
                echo json_encode(['success' => true, 'data' => $merged, 'meta' => $meta]);
            } else {
                echo json_encode(['success' => true, 'data' => $merged]);
            }
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    return false;
}

