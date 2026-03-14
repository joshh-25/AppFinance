-- Finance migration: add property_list.per_property_status for property-level status ownership

SET @has_per_property_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'per_property_status'
);

SET @sql := IF(
    @has_per_property_status = 0,
    "ALTER TABLE `property_list` ADD COLUMN `per_property_status` VARCHAR(120) NOT NULL DEFAULT '' AFTER `rent`",
    "SELECT 'skip: property_list.per_property_status already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional backfill to preserve existing user-entered values from the old field.
SET @has_association_payment_status := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_list'
      AND COLUMN_NAME = 'association_payment_status'
);

SET @sql := IF(
    @has_association_payment_status > 0,
    "UPDATE `property_list`
        SET `per_property_status` = TRIM(COALESCE(`association_payment_status`, ''))
      WHERE TRIM(COALESCE(`per_property_status`, '')) = ''
        AND TRIM(COALESCE(`association_payment_status`, '')) <> ''",
    "SELECT 'skip: no legacy association_payment_status to backfill'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

