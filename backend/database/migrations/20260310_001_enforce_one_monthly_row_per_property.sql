-- Finance migration: enforce one active monthly row per property_list_id + due_period

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

UPDATE `property_billing_records` b
INNER JOIN `property_list` pl
    ON pl.`id` = b.`property_list_id`
SET b.`dd` = COALESCE(NULLIF(TRIM(pl.`dd`), ''), b.`dd`),
    b.`property` = COALESCE(NULLIF(TRIM(pl.`property`), ''), b.`property`),
    b.`unit_owner` = COALESCE(NULLIF(TRIM(pl.`unit_owner`), ''), b.`unit_owner`),
    b.`classification` = COALESCE(NULLIF(TRIM(pl.`classification`), ''), b.`classification`),
    b.`deposit` = COALESCE(NULLIF(TRIM(pl.`deposit`), ''), b.`deposit`),
    b.`rent` = COALESCE(NULLIF(TRIM(pl.`rent`), ''), b.`rent`),
    b.`per_property_status` = COALESCE(NULLIF(TRIM(pl.`per_property_status`), ''), b.`per_property_status`),
    b.`real_property_tax` = COALESCE(NULLIF(TRIM(pl.`real_property_tax`), ''), b.`real_property_tax`),
    b.`rpt_payment_status` = COALESCE(NULLIF(TRIM(pl.`rpt_payment_status`), ''), b.`rpt_payment_status`),
    b.`penalty` = COALESCE(NULLIF(TRIM(pl.`penalty`), ''), b.`penalty`)
WHERE b.`property_list_id` > 0;

DROP TEMPORARY TABLE IF EXISTS `tmp_pbr_monthly_groups`;
CREATE TEMPORARY TABLE `tmp_pbr_monthly_groups` AS
SELECT
    `property_list_id`,
    TRIM(COALESCE(`due_period`, '')) AS `due_period`,
    MAX(`id`) AS `keep_id`
FROM `property_billing_records`
WHERE `is_hidden` = 0
  AND `property_list_id` > 0
  AND TRIM(COALESCE(`due_period`, '')) <> ''
GROUP BY `property_list_id`, TRIM(COALESCE(`due_period`, ''));

UPDATE `property_billing_records` keep_row
INNER JOIN `tmp_pbr_monthly_groups` grp
    ON grp.`keep_id` = keep_row.`id`
LEFT JOIN `property_billing_records` src
    ON src.`property_list_id` = grp.`property_list_id`
   AND TRIM(COALESCE(src.`due_period`, '')) = grp.`due_period`
   AND src.`is_hidden` = 0
SET
    keep_row.`dd` = COALESCE(NULLIF(TRIM(keep_row.`dd`), ''), NULLIF(TRIM(src.`dd`), ''), keep_row.`dd`),
    keep_row.`property` = COALESCE(NULLIF(TRIM(keep_row.`property`), ''), NULLIF(TRIM(src.`property`), ''), keep_row.`property`),
    keep_row.`unit_owner` = COALESCE(NULLIF(TRIM(keep_row.`unit_owner`), ''), NULLIF(TRIM(src.`unit_owner`), ''), keep_row.`unit_owner`),
    keep_row.`bill_type` = COALESCE(NULLIF(TRIM(keep_row.`bill_type`), ''), NULLIF(TRIM(src.`bill_type`), ''), keep_row.`bill_type`),
    keep_row.`classification` = COALESCE(NULLIF(TRIM(keep_row.`classification`), ''), NULLIF(TRIM(src.`classification`), ''), keep_row.`classification`),
    keep_row.`deposit` = COALESCE(NULLIF(TRIM(keep_row.`deposit`), ''), NULLIF(TRIM(src.`deposit`), ''), keep_row.`deposit`),
    keep_row.`rent` = COALESCE(NULLIF(TRIM(keep_row.`rent`), ''), NULLIF(TRIM(src.`rent`), ''), keep_row.`rent`),
    keep_row.`internet_provider` = COALESCE(NULLIF(TRIM(keep_row.`internet_provider`), ''), NULLIF(TRIM(src.`internet_provider`), ''), keep_row.`internet_provider`),
    keep_row.`internet_account_no` = COALESCE(NULLIF(TRIM(keep_row.`internet_account_no`), ''), NULLIF(TRIM(src.`internet_account_no`), ''), keep_row.`internet_account_no`),
    keep_row.`wifi_amount` = COALESCE(NULLIF(TRIM(keep_row.`wifi_amount`), ''), NULLIF(TRIM(src.`wifi_amount`), ''), keep_row.`wifi_amount`),
    keep_row.`wifi_due_date` = COALESCE(NULLIF(TRIM(keep_row.`wifi_due_date`), ''), NULLIF(TRIM(src.`wifi_due_date`), ''), keep_row.`wifi_due_date`),
    keep_row.`wifi_payment_status` = COALESCE(NULLIF(TRIM(keep_row.`wifi_payment_status`), ''), NULLIF(TRIM(src.`wifi_payment_status`), ''), keep_row.`wifi_payment_status`),
    keep_row.`water_account_no` = COALESCE(NULLIF(TRIM(keep_row.`water_account_no`), ''), NULLIF(TRIM(src.`water_account_no`), ''), keep_row.`water_account_no`),
    keep_row.`water_amount` = COALESCE(NULLIF(TRIM(keep_row.`water_amount`), ''), NULLIF(TRIM(src.`water_amount`), ''), keep_row.`water_amount`),
    keep_row.`water_due_date` = COALESCE(NULLIF(TRIM(keep_row.`water_due_date`), ''), NULLIF(TRIM(src.`water_due_date`), ''), keep_row.`water_due_date`),
    keep_row.`water_payment_status` = COALESCE(NULLIF(TRIM(keep_row.`water_payment_status`), ''), NULLIF(TRIM(src.`water_payment_status`), ''), keep_row.`water_payment_status`),
    keep_row.`electricity_account_no` = COALESCE(NULLIF(TRIM(keep_row.`electricity_account_no`), ''), NULLIF(TRIM(src.`electricity_account_no`), ''), keep_row.`electricity_account_no`),
    keep_row.`electricity_amount` = COALESCE(NULLIF(TRIM(keep_row.`electricity_amount`), ''), NULLIF(TRIM(src.`electricity_amount`), ''), keep_row.`electricity_amount`),
    keep_row.`electricity_due_date` = COALESCE(NULLIF(TRIM(keep_row.`electricity_due_date`), ''), NULLIF(TRIM(src.`electricity_due_date`), ''), keep_row.`electricity_due_date`),
    keep_row.`electricity_payment_status` = COALESCE(NULLIF(TRIM(keep_row.`electricity_payment_status`), ''), NULLIF(TRIM(src.`electricity_payment_status`), ''), keep_row.`electricity_payment_status`),
    keep_row.`association_dues` = COALESCE(NULLIF(TRIM(keep_row.`association_dues`), ''), NULLIF(TRIM(src.`association_dues`), ''), keep_row.`association_dues`),
    keep_row.`association_due_date` = COALESCE(NULLIF(TRIM(keep_row.`association_due_date`), ''), NULLIF(TRIM(src.`association_due_date`), ''), keep_row.`association_due_date`),
    keep_row.`association_payment_status` = COALESCE(NULLIF(TRIM(keep_row.`association_payment_status`), ''), NULLIF(TRIM(src.`association_payment_status`), ''), keep_row.`association_payment_status`),
    keep_row.`real_property_tax` = COALESCE(NULLIF(TRIM(keep_row.`real_property_tax`), ''), NULLIF(TRIM(src.`real_property_tax`), ''), keep_row.`real_property_tax`),
    keep_row.`rpt_payment_status` = COALESCE(NULLIF(TRIM(keep_row.`rpt_payment_status`), ''), NULLIF(TRIM(src.`rpt_payment_status`), ''), keep_row.`rpt_payment_status`),
    keep_row.`penalty` = COALESCE(NULLIF(TRIM(keep_row.`penalty`), ''), NULLIF(TRIM(src.`penalty`), ''), keep_row.`penalty`),
    keep_row.`per_property_status` = COALESCE(NULLIF(TRIM(keep_row.`per_property_status`), ''), NULLIF(TRIM(src.`per_property_status`), ''), keep_row.`per_property_status`)
WHERE keep_row.`id` = grp.`keep_id`;

UPDATE `property_billing_records` dup
INNER JOIN `tmp_pbr_monthly_groups` grp
    ON grp.`property_list_id` = dup.`property_list_id`
   AND grp.`due_period` = TRIM(COALESCE(dup.`due_period`, ''))
SET dup.`is_hidden` = 1
WHERE dup.`is_hidden` = 0
  AND dup.`id` <> grp.`keep_id`;

SET @has_active_property_list_id := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'active_property_list_id'
);
SET @sql := IF(
    @has_active_property_list_id = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `active_property_list_id` INT GENERATED ALWAYS AS (CASE WHEN `is_hidden` = 0 THEN `property_list_id` ELSE NULL END) STORED",
    "SELECT 'skip: property_billing_records.active_property_list_id already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_active_due_period := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND COLUMN_NAME = 'active_due_period'
);
SET @sql := IF(
    @has_active_due_period = 0,
    "ALTER TABLE `property_billing_records` ADD COLUMN `active_due_period` VARCHAR(7) GENERATED ALWAYS AS (CASE WHEN `is_hidden` = 0 THEN `due_period` ELSE NULL END) STORED",
    "SELECT 'skip: property_billing_records.active_due_period already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_unique_active_month := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'property_billing_records'
      AND INDEX_NAME = 'uq_pbr_active_property_due_period'
);
SET @sql := IF(
    @has_unique_active_month = 0,
    "ALTER TABLE `property_billing_records` ADD UNIQUE INDEX `uq_pbr_active_property_due_period` (`active_property_list_id`, `active_due_period`)",
    "SELECT 'skip: uq_pbr_active_property_due_period already exists'"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

