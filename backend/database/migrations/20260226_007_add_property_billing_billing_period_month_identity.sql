-- Finance migration: add property_billing_records.billing_period for month-aware billing identity

SET @has_column := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'billing_period'
);
SET @sql := IF(
    @has_column = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `billing_period` VARCHAR(7) NOT NULL DEFAULT '' AFTER `property`",
    "SELECT 'skip: property_billing_records.billing_period already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_identity_bill_period_hidden'
);
SET @sql := IF(
    @has_idx = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_identity_bill_period_hidden` (`property_list_id`, `bill_type`, `billing_period`, `is_hidden`, `id`)",
    "SELECT 'skip: idx_pbr_identity_bill_period_hidden already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

