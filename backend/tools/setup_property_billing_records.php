<?php
/*
 * Finance App File: backend\\tools\\setup_property_billing_records.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require_once __DIR__ . '/../db.php';

try {
    $pdo = get_db_connection();
    $propertyListSql = file_get_contents(__DIR__ . '/../database/schema/create_property_list.sql');
    if ($propertyListSql !== false) {
        $pdo->exec($propertyListSql);
    }

    $sql = file_get_contents(__DIR__ . '/../database/schema/create_property_billing_records.sql');
    $pdo->exec($sql);
    require_once __DIR__ . '/run_migrations.php';
    run_migrations($pdo);
    echo "Table 'property_billing_records' created/verified successfully.\n";
} catch (Exception $e) {
    echo "Setup failed: " . $e->getMessage() . "\n";
}
?>

