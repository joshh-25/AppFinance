-- Finance migration: move monthly identity from billing_period to due_period

SET @has_due_period := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'due_period'
);
SET @sql := IF(
    @has_due_period = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `due_period` VARCHAR(7) NOT NULL DEFAULT '' AFTER `property`",
    "SELECT 'skip: property_billing_records.due_period already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_period := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'billing_period'
);
SET @sql := IF(
    @has_billing_period > 0,
    "UPDATE `property_billing_records`
     SET `due_period` = TRIM(COALESCE(`billing_period`, ''))
     WHERE TRIM(COALESCE(`due_period`, '')) = ''
       AND TRIM(COALESCE(`billing_period`, '')) <> ''",
    "SELECT 'skip: backfill from billing_period not needed'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `property_billing_records`
SET `due_period` = LEFT(`water_due_date`, 7)
WHERE TRIM(COALESCE(`due_period`, '')) = ''
  AND `water_due_date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

UPDATE `property_billing_records`
SET `due_period` = LEFT(`electricity_due_date`, 7)
WHERE TRIM(COALESCE(`due_period`, '')) = ''
  AND `electricity_due_date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

UPDATE `property_billing_records`
SET `due_period` = LEFT(`wifi_due_date`, 7)
WHERE TRIM(COALESCE(`due_period`, '')) = ''
  AND `wifi_due_date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

UPDATE `property_billing_records`
SET `due_period` = LEFT(`association_due_date`, 7)
WHERE TRIM(COALESCE(`due_period`, '')) = ''
  AND `association_due_date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

SET @has_new_idx := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_identity_due_period_hidden'
);
SET @sql := IF(
    @has_new_idx = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_pbr_identity_due_period_hidden` (`property_list_id`, `bill_type`, `due_period`, `is_hidden`, `id`)",
    "SELECT 'skip: idx_pbr_identity_due_period_hidden already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_billing_period := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'billing_period'
);
SET @sql := IF(
    @has_billing_period > 0,
    "ALTER TABLE `property_billing_records` DROP COLUMN `billing_period`",
    "SELECT 'skip: property_billing_records.billing_period already removed'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_old_idx := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_pbr_identity_bill_period_hidden'
);
SET @sql := IF(
    @has_old_idx > 0,
    "ALTER TABLE `property_billing_records` DROP INDEX `idx_pbr_identity_bill_period_hidden`",
    "SELECT 'skip: idx_pbr_identity_bill_period_hidden not found'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
