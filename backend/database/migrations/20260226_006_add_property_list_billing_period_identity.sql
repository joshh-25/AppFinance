-- Finance migration: add property_list.billing_period and switch unique identity to dd+property+billing_period

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'billing_period'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_list` ADD COLUMN `billing_period` VARCHAR(7) NOT NULL DEFAULT '' AFTER `property`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @legacy_uq_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND INDEX_NAME = 'uq_property_list_dd_property'
);
SET @ddl := IF(
    @legacy_uq_exists > 0,
    "ALTER TABLE `property_list` DROP INDEX `uq_property_list_dd_property`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @new_uq_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND INDEX_NAME = 'uq_property_list_dd_property_period'
);
SET @ddl := IF(
    @new_uq_exists = 0,
    "ALTER TABLE `property_list` ADD UNIQUE INDEX `uq_property_list_dd_property_period` (`dd`, `property`, `billing_period`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @period_idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND INDEX_NAME = 'idx_property_list_billing_period'
);
SET @ddl := IF(
    @period_idx_exists = 0,
    "ALTER TABLE `property_list` ADD INDEX `idx_property_list_billing_period` (`billing_period`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
