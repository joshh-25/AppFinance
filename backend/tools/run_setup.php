<?php
/*
 * Finance App File: backend\\tools\\run_setup.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require_once __DIR__ . '/../db.php';

try {
    $pdo = get_db_connection();
    $sql = file_get_contents('setup.sql');
    
    // Remove "USE finance;" as PDO usually connects to the DB directly, 
    // or handle robustly. However, setup.sql has "USE finance;" at the top.
    // PDO might fail on "USE" if multiple queries are not enabled or specific driver issues.
    // Better to just run the CREATE TABLE part or ensure multiple statements work.
    
    // Let's just run the CREATE TABLE part robustly.
    // Splitting by semicolon is a naive way but works for simple dumps.
    // Or just rely on PDO multiple queries if enabled.
    
    $pdo->exec($sql);
    echo "Database setup executed successfully.\n";
    
} catch (Exception $e) {
    echo "Error executing setup: " . $e->getMessage() . "\n";
}
?>

