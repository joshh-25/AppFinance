<?php
/*
 * Finance App File: backend\\tools\\run_migrations.php
 * Purpose: Apply versioned SQL migrations and track applied versions.
 */
require_once __DIR__ . '/../db.php';

function configure_migration_connection($pdo)
{
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // MySQL migration scripts can include statements that return result sets
    // (for example EXECUTE of a SELECT branch). Buffering avoids "unbuffered
    // query active" errors when running sequential statements in one transaction.
    if (defined('PDO::MYSQL_ATTR_USE_BUFFERED_QUERY')) {
        $pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, true);
    }
}

function split_sql_statements($sql)
{
    $withoutBlockComments = preg_replace('/\/\*.*?\*\//s', '', (string)$sql);
    $withoutLineComments = preg_replace('/^\s*(--|#).*(\r?\n|$)/m', '', $withoutBlockComments);
    $parts = preg_split('/;\s*(\r?\n|$)/', (string)$withoutLineComments);

    $statements = [];
    foreach ($parts as $part) {
        $statement = trim((string)$part);
        if ($statement !== '') {
            $statements[] = $statement;
        }
    }

    return $statements;
}

function ensure_schema_migrations_table($pdo)
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS `schema_migrations` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `version` VARCHAR(120) NOT NULL UNIQUE,
            `filename` VARCHAR(255) NOT NULL,
            `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function get_applied_migration_versions($pdo)
{
    $stmt = $pdo->query('SELECT `version` FROM `schema_migrations`');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    $versions = [];
    foreach ($rows as $row) {
        $version = trim((string)($row['version'] ?? ''));
        if ($version !== '') {
            $versions[] = $version;
        }
    }

    return $versions;
}

function create_migration_connection()
{
    $config = get_app_config_values();
    if (!$config) {
        throw new RuntimeException('Configuration file not found. Please create a .env or config.nmb file.');
    }

    $host = get_app_config('DB_HOST', 'localhost');
    $dbname = get_app_config('DB_NAME', 'finance');
    $user = get_app_config('DB_USER', 'root');
    $pass = get_app_config('DB_PASS', '');

    try {
        $pdo = new PDO("mysql:host={$host};dbname={$dbname};charset=utf8", $user, $pass);
        configure_migration_connection($pdo);
        return $pdo;
    } catch (PDOException $e) {
        throw new RuntimeException('Database connection failed: ' . $e->getMessage(), 0, $e);
    }
}

function execute_migration_statement($connection, $statement)
{
    // Some migration statements can return rowsets (e.g. SELECT or EXECUTE branches).
    // Consume and close them so subsequent statements can run safely.
    if (preg_match('/^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN|EXECUTE)\b/i', (string)$statement) === 1) {
        $stmt = $connection->query($statement);
        if ($stmt instanceof PDOStatement) {
            $stmt->fetchAll(PDO::FETCH_ASSOC);
            while ($stmt->nextRowset()) {
                $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            $stmt->closeCursor();
        }
        return;
    }

    $connection->exec($statement);
}

function run_migrations($pdo = null)
{
    $connection = $pdo instanceof PDO ? $pdo : create_migration_connection();
    configure_migration_connection($connection);
    ensure_schema_migrations_table($connection);

    $migrationDir = realpath(__DIR__ . '/../database/migrations');
    if ($migrationDir === false) {
        throw new RuntimeException('Migration directory not found: backend/database/migrations');
    }

    $migrationFiles = glob($migrationDir . '/*.sql');
    if ($migrationFiles === false) {
        $migrationFiles = [];
    }
    sort($migrationFiles, SORT_NATURAL | SORT_FLAG_CASE);

    $appliedVersions = array_flip(get_applied_migration_versions($connection));

    foreach ($migrationFiles as $filePath) {
        $fileName = basename((string)$filePath);
        $version = pathinfo($fileName, PATHINFO_FILENAME);

        if (isset($appliedVersions[$version])) {
            echo "[skip] {$fileName}\n";
            continue;
        }

        $sql = file_get_contents((string)$filePath);
        if ($sql === false) {
            throw new RuntimeException('Unable to read migration file: ' . $fileName);
        }

        $statements = split_sql_statements($sql);

        $connection->beginTransaction();
        try {
            foreach ($statements as $statement) {
                execute_migration_statement($connection, $statement);
            }

            $insertStmt = $connection->prepare(
                'INSERT INTO `schema_migrations` (`version`, `filename`) VALUES (?, ?)'
            );
            $insertStmt->execute([$version, $fileName]);
            if ($connection->inTransaction()) {
                $connection->commit();
            }
            echo "[applied] {$fileName}\n";
        } catch (Throwable $e) {
            if ($connection->inTransaction()) {
                $connection->rollBack();
            }
            throw $e;
        }
    }

    echo "Migrations complete.\n";
}

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    try {
        run_migrations();
    } catch (Throwable $e) {
        fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . PHP_EOL);
        exit(1);
    }
}
?>

