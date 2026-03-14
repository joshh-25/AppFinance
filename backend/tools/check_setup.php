<?php
/*
 * Finance App File: backend\\tools\\check_setup.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require_once __DIR__ . '/../db.php';

try {
    $pdo = get_db_connection();
    echo "Database connection successful.\n";

    $stmt = $pdo->query("SHOW TABLES LIKE 'journal_entries'");
    if ($stmt->rowCount() > 0) {
        echo "Table 'journal_entries' exists.\n";
        
        $stmt = $pdo->query("SELECT COUNT(*) FROM journal_entries");
        $count = $stmt->fetchColumn();
        echo "Current entry count: $count\n";
    } else {
        echo "Table 'journal_entries' does NOT exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

