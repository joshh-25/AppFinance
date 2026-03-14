-- Finance migration: remove obsolete property_billing_records.billing_period
SET @db_name := DATABASE();
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'billing_period'
);
SET @ddl := IF(
    @column_exists > 0,
    "ALTER TABLE `property_billing_records` DROP COLUMN `billing_period`",
    "SELECT 'skip: billing_period already removed'"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
