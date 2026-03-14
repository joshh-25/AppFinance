-- Finance migration: add a month-oriented performance index for merged records and dashboard summary

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_hidden_due_period_created'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_hidden_due_period_created` (`is_hidden`, `due_period`, `created_at`, `id`)",
    "SELECT 'skip: idx_pbr_hidden_due_period_created already exists'"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

