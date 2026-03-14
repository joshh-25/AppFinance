<?php
/*
 * Finance App File: backend\\tools\\setup_water.php
 * Purpose: Backend/setup source file for the Finance app.
 */
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'finance';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents('create_water_table.sql');
    $pdo->exec($sql);
    
    echo "Table 'water_bills' created successfully.\n";

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
?>
