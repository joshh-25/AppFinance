-- Finance migration: link property_account_directory rows to property_list for lifecycle sync
-- (create/update/delete via foreign key cascade).

SET @has_table_property_account_directory := (
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_account_directory'
);

SET @has_column_property_list_id := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_account_directory'
      AND COLUMN_NAME = 'property_list_id'
);

SET @sql := IF(
    @has_table_property_account_directory = 1 AND @has_column_property_list_id = 0,
    "ALTER TABLE `property_account_directory` ADD COLUMN `property_list_id` INT NULL AFTER `property`",
    "SELECT 'skip: property_account_directory.property_list_id already exists or table missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill link by property name match.
SET @sql := IF(
    @has_table_property_account_directory = 1,
    "UPDATE `property_account_directory` pad
     INNER JOIN `property_list` pl
       ON LOWER(TRIM(COALESCE(pl.`property`, ''))) = LOWER(TRIM(COALESCE(pad.`property`, '')))
     SET pad.`property_list_id` = pl.`id`
     WHERE pad.`property_list_id` IS NULL",
    "SELECT 'skip: property_account_directory missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Clear invalid references before adding FK.
SET @sql := IF(
    @has_table_property_account_directory = 1,
    "UPDATE `property_account_directory` pad
     LEFT JOIN `property_list` pl ON pl.`id` = pad.`property_list_id`
     SET pad.`property_list_id` = NULL
     WHERE pad.`property_list_id` IS NOT NULL
       AND pl.`id` IS NULL",
    "SELECT 'skip: property_account_directory missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_unique_property_list_id_index := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_account_directory'
      AND INDEX_NAME = 'uq_property_account_directory_property_list_id'
);

SET @sql := IF(
    @has_table_property_account_directory = 1 AND @has_unique_property_list_id_index = 0,
    "ALTER TABLE `property_account_directory` ADD UNIQUE INDEX `uq_property_account_directory_property_list_id` (`property_list_id`)",
    "SELECT 'skip: unique index uq_property_account_directory_property_list_id already exists or table missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk_property_account_directory_property_list := (
    SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_property_account_directory_property_list'
);

SET @sql := IF(
    @has_table_property_account_directory = 1 AND @has_fk_property_account_directory_property_list = 0,
    "ALTER TABLE `property_account_directory`
       ADD CONSTRAINT `fk_property_account_directory_property_list`
       FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`)
       ON UPDATE CASCADE ON DELETE CASCADE",
    "SELECT 'skip: fk_property_account_directory_property_list already exists or table missing'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

