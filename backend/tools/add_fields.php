<?php
/*
 * Finance App File: backend\\tools\\add_fields.php
 * Purpose: Backend/setup source file for the Finance app.
 */
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'finance';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Add or_number column
    try {
        $pdo->exec("ALTER TABLE electricity_bills ADD COLUMN or_number VARCHAR(50) AFTER id");
        echo "Column 'or_number' added successfully.\n";
    } catch (PDOException $e) {
        echo "Column 'or_number' might already exist or error: " . $e->getMessage() . "\n";
    }

    // Add property_name column
    try {
        $pdo->exec("ALTER TABLE electricity_bills ADD COLUMN property_name VARCHAR(100) AFTER tenant_name");
        echo "Column 'property_name' added successfully.\n";
    } catch (PDOException $e) {
        echo "Column 'property_name' might already exist or error: " . $e->getMessage() . "\n";
    }

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
?>
