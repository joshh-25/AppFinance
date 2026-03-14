-- Finance migration: create expenses table for expenses module CRUD

CREATE TABLE IF NOT EXISTS `expenses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `expense_date` DATE NOT NULL,
    `payee` VARCHAR(180) NOT NULL DEFAULT '',
    `description` TEXT NOT NULL,
    `category` VARCHAR(120) NOT NULL DEFAULT '',
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `remarks` TEXT NULL,
    `payment` VARCHAR(120) NOT NULL DEFAULT '',
    `tin_number` VARCHAR(64) NOT NULL DEFAULT '',
    `non_vat` TINYINT(1) NOT NULL DEFAULT 0,
    `ocr_raw_text` MEDIUMTEXT NULL,
    `created_by` INT NULL,
    `updated_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_expenses_date` (`expense_date`),
    INDEX `idx_expenses_category` (`category`),
    INDEX `idx_expenses_payee` (`payee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

