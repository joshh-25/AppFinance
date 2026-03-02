<?php
/*
 * Finance App File: backend\\tools\\setup_users.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require __DIR__ . '/../db.php';

try {
    $pdo = get_db_connection();

    // Create Table
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    echo "Table 'users' created.\n";

    // Check if admin exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        $username = 'admin';
        $password = 'admin123';
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $insert = $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
        $insert->execute([$username, $hash, 'admin']);
        echo "Default admin user created (admin / admin123).\n";
    } else {
        echo "Admin user already exists.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

