-- Finance migration: ensure property_billing_records.is_hidden exists
SET @db_name := DATABASE();
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'is_hidden'
);
SET @ddl := IF(
    @column_exists = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `is_hidden` TINYINT(1) NOT NULL DEFAULT 0 AFTER `bill_type`",
    "SELECT 'skip: is_hidden already exists'"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
