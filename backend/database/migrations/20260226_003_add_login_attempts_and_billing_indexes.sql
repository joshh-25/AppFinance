-- Finance migration: add login attempts table and performance indexes

CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(120) NOT NULL DEFAULT '',
    `ip_address` VARCHAR(64) NOT NULL DEFAULT '',
    `success` TINYINT(1) NOT NULL DEFAULT 0,
    `user_agent` VARCHAR(255) NOT NULL DEFAULT '',
    `reason` VARCHAR(120) NOT NULL DEFAULT '',
    `attempted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'login_attempts'
      AND INDEX_NAME = 'idx_login_attempts_username_attempted'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `login_attempts` ADD INDEX `idx_login_attempts_username_attempted` (`username`, `attempted_at`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'login_attempts'
      AND INDEX_NAME = 'idx_login_attempts_ip_attempted'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `login_attempts` ADD INDEX `idx_login_attempts_ip_attempted` (`ip_address`, `attempted_at`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'login_attempts'
      AND INDEX_NAME = 'idx_login_attempts_success_attempted'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `login_attempts` ADD INDEX `idx_login_attempts_success_attempted` (`success`, `attempted_at`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_hidden_created'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_hidden_created` (`is_hidden`, `created_at`, `id`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_hidden_bill_type'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_hidden_bill_type` (`is_hidden`, `bill_type`, `id`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_dd_property_hidden'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_dd_property_hidden` (`dd`, `property`, `is_hidden`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_property_list_hidden'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_property_list_hidden` (`property_list_id`, `is_hidden`, `id`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
