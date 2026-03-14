<?php
/*
 * Finance App File: db.php
 * Purpose: Backend/setup source file for the Finance app.
 */
function get_app_config_values() {
    static $loaded = false;
    static $config = [];

    if ($loaded) {
        return $config;
    }

    $projectRoot = realpath(__DIR__ . '/../../../') ?: (__DIR__ . '/../../../');
    $backendRoot = realpath(__DIR__ . '/../../') ?: (__DIR__ . '/../../');
    $candidates = [
        $projectRoot . '/.env',
        $projectRoot . '/config.nmb',
        $backendRoot . '/.env',
        $backendRoot . '/config.nmb',
    ];
    $config_file = '';
    foreach ($candidates as $candidate) {
        if (file_exists($candidate)) {
            $config_file = $candidate;
            break;
        }
    }

    if ($config_file !== '' && file_exists($config_file)) {
        $parsed = parse_ini_file($config_file, false, INI_SCANNER_RAW);
        if ($parsed === false) {
            $parsed = [];
        }

        if (!$parsed) {
            $lines = file($config_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim((string)$line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, ';') === 0) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $parsed[trim($key)] = trim($value);
                }
            }
        }

        foreach ($parsed as $key => $value) {
            $normalizedKey = trim((string)$key);
            $normalizedValue = trim((string)$value);
            $config[$normalizedKey] = $normalizedValue;
            putenv($normalizedKey . '=' . $normalizedValue);
            $_ENV[$normalizedKey] = $normalizedValue;
            $_SERVER[$normalizedKey] = $normalizedValue;
        }
    }

    $loaded = true;
    return $config;
}

function get_app_config($key, $default = '') {
    $config = get_app_config_values();
    $normalizedKey = trim((string)$key);

    if (array_key_exists($normalizedKey, $config) && $config[$normalizedKey] !== '') {
        return $config[$normalizedKey];
    }

    $envValue = getenv($normalizedKey);
    if ($envValue !== false && trim((string)$envValue) !== '') {
        return trim((string)$envValue);
    }

    if (isset($_ENV[$normalizedKey]) && trim((string)$_ENV[$normalizedKey]) !== '') {
        return trim((string)$_ENV[$normalizedKey]);
    }

    if (isset($_SERVER[$normalizedKey]) && trim((string)$_SERVER[$normalizedKey]) !== '') {
        return trim((string)$_SERVER[$normalizedKey]);
    }

    return $default;
}

function build_db_connection_from_loaded_config(array $config) {
    if (!$config) {
        throw new RuntimeException('Configuration file not found. Please create a .env or config.nmb file.');
    }

    $host = get_app_config('DB_HOST', 'localhost');
    $dbname = get_app_config('DB_NAME', 'finance');
    $user = get_app_config('DB_USER', 'root');
    $pass = get_app_config('DB_PASS', '');

    $placeholderUsers = ['databaseuser', 'your_db_user', 'changeme'];
    $placeholderPasswords = ['password', 'your_db_password', 'changeme'];
    if (in_array(strtolower(trim((string)$user)), $placeholderUsers, true) || in_array(strtolower(trim((string)$pass)), $placeholderPasswords, true)) {
        throw new RuntimeException('Configuration error: Replace placeholder DB credentials in .env before running the app.');
    }

    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

function get_db_connection() {
    $config = get_app_config_values();
    try {
        return build_db_connection_from_loaded_config($config);
    } catch (PDOException $e) {
        die("Connection failed: " . $e->getMessage());
    } catch (RuntimeException $e) {
        die($e->getMessage());
    }
}

function try_get_db_connection()
{
    try {
        return build_db_connection_from_loaded_config(get_app_config_values());
    } catch (Throwable $e) {
        return null;
    }
}
?>
