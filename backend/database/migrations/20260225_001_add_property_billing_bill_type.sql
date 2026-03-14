-- Finance migration: ensure property_billing_records.bill_type exists
SET @db_name := DATABASE();
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'bill_type'
);
SET @ddl := IF(
    @column_exists = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `bill_type` VARCHAR(32) NOT NULL DEFAULT 'water' AFTER `unit_owner`",
    "SELECT 'skip: bill_type already exists'"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
