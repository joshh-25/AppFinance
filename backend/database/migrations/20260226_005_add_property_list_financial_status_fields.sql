-- Finance migration: add property-level financial status fields to property_list

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'association_payment_status'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_list` ADD COLUMN `association_payment_status` VARCHAR(120) NOT NULL DEFAULT '' AFTER `rent`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'real_property_tax'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_list` ADD COLUMN `real_property_tax` VARCHAR(80) NOT NULL DEFAULT '' AFTER `association_payment_status`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'rpt_payment_status'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_list` ADD COLUMN `rpt_payment_status` VARCHAR(120) NOT NULL DEFAULT '' AFTER `real_property_tax`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'penalty'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_list` ADD COLUMN `penalty` VARCHAR(80) NOT NULL DEFAULT '' AFTER `rpt_payment_status`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
