<?php
/*
 * Finance App File: api/auth.php
 * Purpose: Public auth endpoints and authenticated-request guard.
 */

function normalize_user_role($role, $defaultRole = 'admin')
{
    $normalizedDefault = strtolower(trim((string) $defaultRole));
    if ($normalizedDefault !== 'admin' && $normalizedDefault !== 'editor' && $normalizedDefault !== 'viewer') {
        $normalizedDefault = 'admin';
    }

    $normalized = strtolower(trim((string) $role));
    if ($normalized === 'admin' || $normalized === 'editor' || $normalized === 'viewer') {
        return $normalized;
    }

    return $normalizedDefault;
}

function get_role_priority($role)
{
    $normalized = normalize_user_role($role, 'viewer');
    if ($normalized === 'admin') {
        return 3;
    }
    if ($normalized === 'editor') {
        return 2;
    }
    return 1;
}

function get_required_role_for_action($action)
{
    $normalizedAction = trim((string) $action);
    $map = [
        'list' => 'viewer',
        'list_merged' => 'viewer',
        'property_record_list' => 'viewer',
        'expense_list' => 'viewer',
        'account_lookup_search' => 'viewer',
        'add' => 'editor',
        'bill_update' => 'editor',
        'upload_bill' => 'editor',
        'expense_create' => 'admin',
        'expense_update' => 'admin',
        'expense_delete' => 'admin',
        'account_lookup_import' => 'admin',
        'property_record_create' => 'admin',
        'property_record_update' => 'admin',
        'property_record_delete' => 'admin',
    ];

    return $map[$normalizedAction] ?? 'viewer';
}

function can_role_access_action($role, $action)
{
    $currentPriority = get_role_priority($role);
    $requiredPriority = get_role_priority(get_required_role_for_action($action));
    return $currentPriority >= $requiredPriority;
}

function get_session_user_role()
{
    return normalize_user_role($_SESSION['role'] ?? 'admin', 'admin');
}

function enforce_action_permission_for_role($action)
{
    $role = get_session_user_role();
    if (can_role_access_action($role, $action)) {
        return true;
    }

    $requiredRole = get_required_role_for_action($action);
    audit_log_event('forbidden_request', [
        'action' => (string) $action,
        'role' => $role,
        'required_role' => $requiredRole,
    ]);
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    return false;
}

function resolve_login_user_role($pdo, $user)
{
    if (!is_array($user)) {
        return 'admin';
    }

    if (array_key_exists('role', $user)) {
        return normalize_user_role($user['role'] ?? 'admin', 'admin');
    }

    if (!table_exists($pdo, 'users') || !table_column_exists($pdo, 'users', 'role')) {
        return 'admin';
    }

    $userId = isset($user['id']) ? (int) $user['id'] : 0;
    if ($userId <= 0) {
        return 'admin';
    }

    $stmt = $pdo->prepare('SELECT `role` FROM `users` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$userId]);
    $role = $stmt->fetchColumn();
    return normalize_user_role($role ?? 'admin', 'admin');
}

function handle_public_auth_actions($action)
{
    if ($action === 'health') {
        $dbConnected = false;
        $dbMessage = 'ok';

        try {
            $host = get_app_config('DB_HOST', 'localhost');
            $dbname = get_app_config('DB_NAME', 'finance');
            $user = get_app_config('DB_USER', 'root');
            $pass = get_app_config('DB_PASS', '');
            $probe = new PDO("mysql:host={$host};dbname={$dbname};charset=utf8", $user, $pass);
            $probe->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $stmt = $probe->query('SELECT 1');
            $dbConnected = ((int) $stmt->fetchColumn()) === 1;
        } catch (Throwable $e) {
            $dbConnected = false;
            $dbMessage = 'database_unreachable';
        }

        echo json_encode([
            'success' => true,
            'status' => $dbConnected ? 'ok' : 'degraded',
            'service' => 'finance-api',
            'time_utc' => gmdate('Y-m-d\TH:i:s\Z'),
            'version' => (string) get_app_config('APP_VERSION', 'dev'),
            'checks' => [
                'database' => [
                    'connected' => $dbConnected,
                    'message' => $dbMessage,
                ],
            ],
        ]);
        return true;
    }

    if ($action === 'csrf') {
        echo json_encode([
            'success' => true,
            'csrf_token' => get_csrf_token(),
        ]);
        return true;
    }

    if ($action === 'session') {
        $isAuthenticated = isset($_SESSION['user_id']);
        echo json_encode([
            'success' => true,
            'authenticated' => $isAuthenticated,
            'username' => $_SESSION['username'] ?? null,
            'role' => $isAuthenticated ? get_session_user_role() : null,
            'csrf_token' => get_csrf_token(),
        ]);
        return true;
    }

    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $data = [];

        if (stripos($contentType, 'application/json') !== false) {
            $input = file_get_contents('php://input');
            $decoded = json_decode($input, true);
            if (is_array($decoded)) {
                $data = $decoded;
            }
        } else {
            $data = $_POST;
        }

        $username = trim((string) ($data['username'] ?? ''));
        $password = trim((string) ($data['password'] ?? ''));

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Please enter both username and password.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            $clientIp = get_request_ip_address();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $rateLimit = assess_login_rate_limit($pdo, $username, $clientIp, 15, 5);
            if (($rateLimit['blocked'] ?? false) === true) {
                record_login_attempt($pdo, $username, $clientIp, false, $userAgent, 'rate_limited');
                audit_log_event('login_rate_limited', [
                    'username' => $username,
                    'attempt_count' => (int) ($rateLimit['attempt_count'] ?? 0),
                    'retry_after_seconds' => (int) ($rateLimit['retry_after_seconds'] ?? 0),
                ]);
                http_response_code(429);
                header('Retry-After: ' . (int) ($rateLimit['retry_after_seconds'] ?? 60));
                echo json_encode([
                    'success' => false,
                    'message' => 'Too many failed login attempts. Please try again later.',
                ]);
                return true;
            }

            $roleColumnExists = table_exists($pdo, 'users') && table_column_exists($pdo, 'users', 'role');
            $sql = $roleColumnExists
                ? 'SELECT id, username, password_hash, role FROM users WHERE username = ?'
                : 'SELECT id, username, password_hash FROM users WHERE username = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                $resolvedRole = resolve_login_user_role($pdo, is_array($user) ? $user : []);
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $resolvedRole;
                record_login_attempt($pdo, $username, $clientIp, true, $userAgent, 'success');
                audit_log_event('login_success', [
                    'username' => $user['username'],
                    'role' => $resolvedRole,
                ]);
                echo json_encode([
                    'success' => true,
                    'message' => 'Login successful.',
                    'role' => $resolvedRole,
                ]);
                return true;
            }

            record_login_attempt($pdo, $username, $clientIp, false, $userAgent, 'invalid_credentials');
            audit_log_event('login_failed', ['username' => $username]);
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
            return true;
        } catch (PDOException $e) {
            audit_log_event('login_error', ['message' => $e->getMessage()]);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error.']);
            return true;
        }
    }

    return false;
}

function enforce_authenticated_request($action)
{
    if (!isset($_SESSION['user_id'])) {
        audit_log_event('unauthorized_request', ['action' => (string) $action]);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return false;
    }

    if (!enforce_action_permission_for_role($action)) {
        return false;
    }

    enforce_csrf_for_write_actions($action);

    // Release the session lock for authenticated API work.
    // This keeps "session" guard checks responsive while long requests are in-flight.
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }

    return true;
}
