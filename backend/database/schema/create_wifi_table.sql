CREATE TABLE IF NOT EXISTS wifi_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_name VARCHAR(100) NOT NULL,
    property_name VARCHAR(100),
    wifi_account_no VARCHAR(50),
    or_number VARCHAR(50),
    amount DECIMAL(15, 2) DEFAULT 0.00,
    penalty DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) DEFAULT 0.00,
    date_paid DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
