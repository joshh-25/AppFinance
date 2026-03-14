<?php
/*
 * Finance App File: backend\\tools\\fix_db.php
 * Purpose: Backend/setup source file for the Finance app.
 */
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'finance';

try {
    // Connect to MySQL server
    $pdo = new PDO("mysql:host=$host", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname`");
    echo "Database '$dbname' checked/created successfully.\n";

    // Connect to specific database
    $pdo->exec("USE `$dbname`");

    // SQL to create table
    $sql = "CREATE TABLE IF NOT EXISTS electricity_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_name VARCHAR(100) NOT NULL,
        electric_account_no VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) DEFAULT 0.00,
        penalty DECIMAL(15, 2) DEFAULT 0.00,
        total DECIMAL(15, 2) DEFAULT 0.00,
        due_date DATE,
        date_paid DATE,
        status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    $pdo->exec($sql);
    echo "Table 'electricity_bills' created successfully.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
