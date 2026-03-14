-- Finance migration: add property_list master table and billing FK link

CREATE TABLE IF NOT EXISTS `property_list` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `dd` VARCHAR(120) NOT NULL,
    `property` VARCHAR(180) NOT NULL,
    `unit_owner` VARCHAR(180) DEFAULT '',
    `classification` VARCHAR(120) DEFAULT '',
    `deposit` VARCHAR(80) DEFAULT '',
    `rent` VARCHAR(80) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_property_list_dd_property` (`dd`, `property`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'property_list_id'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `property_list_id` INT NULL AFTER `id`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'idx_property_billing_property_list_id'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `property_billing_records` ADD INDEX `idx_property_billing_property_list_id` (`property_list_id`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `property_list` (`dd`, `property`, `unit_owner`, `classification`, `deposit`, `rent`)
SELECT
    TRIM(COALESCE(`dd`, '')) AS `dd`,
    TRIM(COALESCE(`property`, '')) AS `property`,
    MAX(TRIM(COALESCE(`unit_owner`, ''))) AS `unit_owner`,
    MAX(TRIM(COALESCE(`classification`, ''))) AS `classification`,
    MAX(TRIM(COALESCE(`deposit`, ''))) AS `deposit`,
    MAX(TRIM(COALESCE(`rent`, ''))) AS `rent`
FROM `property_billing_records`
WHERE TRIM(COALESCE(`dd`, '')) <> '' OR TRIM(COALESCE(`property`, '')) <> ''
GROUP BY TRIM(COALESCE(`dd`, '')), TRIM(COALESCE(`property`, ''))
ON DUPLICATE KEY UPDATE
    `unit_owner` = IF(VALUES(`unit_owner`) <> '', VALUES(`unit_owner`), `unit_owner`),
    `classification` = IF(VALUES(`classification`) <> '', VALUES(`classification`), `classification`),
    `deposit` = IF(VALUES(`deposit`) <> '', VALUES(`deposit`), `deposit`),
    `rent` = IF(VALUES(`rent`) <> '', VALUES(`rent`), `rent`);

UPDATE `property_billing_records` pbr
INNER JOIN `property_list` pl
    ON LOWER(TRIM(pl.`dd`)) = LOWER(TRIM(pbr.`dd`))
   AND LOWER(TRIM(COALESCE(pl.`property`, ''))) = LOWER(TRIM(COALESCE(pbr.`property`, '')))
SET pbr.`property_list_id` = pl.`id`
WHERE pbr.`property_list_id` IS NULL;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND CONSTRAINT_NAME = 'fk_property_billing_property_list'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @ddl := IF(
    @fk_exists = 0,
    "ALTER TABLE `property_billing_records` ADD CONSTRAINT `fk_property_billing_property_list` FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`) ON UPDATE CASCADE ON DELETE SET NULL",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
