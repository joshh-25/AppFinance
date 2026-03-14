<?php
/*
 * Finance App File: backend\\tools\\update_schema.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require_once __DIR__ . '/../db.php';

try {
    $pdo = get_db_connection();
    
    // Commands to drop unused columns
    $sql_commands = [
        "ALTER TABLE electricity_bills DROP COLUMN status",
        "ALTER TABLE electricity_bills DROP COLUMN due_date",
        "ALTER TABLE water_bills DROP COLUMN status",
        "ALTER TABLE water_bills DROP COLUMN due_date",
        "ALTER TABLE wifi_bills DROP COLUMN status",
        "ALTER TABLE wifi_bills DROP COLUMN due_date"
    ];

    foreach ($sql_commands as $sql) {
        try {
            $pdo->exec($sql);
            echo "Successfully executed: $sql\n";
        } catch (PDOException $e) {
            // Ignore error if column doesn't exist (e.g., already dropped)
            if (strpos($e->getMessage(), "check that column/key exists") !== false) {
                 echo "Skipped (Column likely doesn't exist): $sql\n";
            } else {
                 echo "Error executing: $sql - " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "Database schema update completed.\n";

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>

