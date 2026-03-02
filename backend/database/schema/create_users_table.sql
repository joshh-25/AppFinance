CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Admin User (password: admin123)
-- We'll use PHP to insert this to ensure correct hashing, or use a known hash.
-- BCrypt hash for 'admin123': $2y$10$YourHashHere... 
-- actually, let's do the insert in a PHP script to be safe and portable.
