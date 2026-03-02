USE finance;

CREATE TABLE IF NOT EXISTS electricity_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_name VARCHAR(100) NOT NULL,
    electric_account_no VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) DEFAULT 0.00,
    penalty DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) DEFAULT 0.00,
    date_paid DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
