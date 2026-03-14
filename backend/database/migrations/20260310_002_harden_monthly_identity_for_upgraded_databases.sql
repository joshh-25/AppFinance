-- Finance migration: harden monthly identity for upgraded databases

UPDATE `property_billing_records` pbr
INNER JOIN `property_list` pl
    ON LOWER(TRIM(pl.`dd`)) = LOWER(TRIM(pbr.`dd`))
   AND LOWER(TRIM(COALESCE(pl.`property`, ''))) = LOWER(TRIM(COALESCE(pbr.`property`, '')))
SET pbr.`property_list_id` = pl.`id`
WHERE COALESCE(pbr.`property_list_id`, 0) <= 0;

UPDATE `property_billing_records` pbr
INNER JOIN `property_list` pl
    ON pl.`id` = pbr.`property_list_id`
SET pbr.`due_period` = TRIM(COALESCE(pl.`billing_period`, ''))
WHERE TRIM(COALESCE(pbr.`due_period`, '')) = ''
  AND TRIM(COALESCE(pl.`billing_period`, '')) <> '';

UPDATE `property_billing_records`
SET `is_hidden` = 1
WHERE `is_hidden` = 0
  AND (
    COALESCE(`property_list_id`, 0) <= 0
    OR TRIM(COALESCE(`due_period`, '')) = ''
  );

SET @has_property_billing_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND CONSTRAINT_NAME = 'fk_property_billing_property_list'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(
    @has_property_billing_fk > 0,
    "ALTER TABLE `property_billing_records` DROP FOREIGN KEY `fk_property_billing_property_list`",
    "SELECT 'skip: fk_property_billing_property_list missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @can_make_property_list_required := (
    SELECT COUNT(*)
    FROM `property_billing_records`
    WHERE COALESCE(`property_list_id`, 0) <= 0
);
SET @sql := IF(
    @can_make_property_list_required = 0,
    "ALTER TABLE `property_billing_records` MODIFY COLUMN `property_list_id` INT NOT NULL",
    "SELECT 'skip: property_list_id still has unresolved rows'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @can_restore_property_billing_fk := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'property_list_id'
      AND IS_NULLABLE = 'NO'
);
SET @sql := IF(
    @can_restore_property_billing_fk > 0,
    "ALTER TABLE `property_billing_records` ADD CONSTRAINT `fk_property_billing_property_list` FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT",
    "ALTER TABLE `property_billing_records` ADD CONSTRAINT `fk_property_billing_property_list` FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`) ON UPDATE CASCADE ON DELETE SET NULL"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
