-- Finance migration: account numbers in property directory can repeat (or be placeholders),
-- so keep property unique but remove unique constraints on account columns.

ALTER TABLE `property_account_directory`
    DROP INDEX `uq_property_account_directory_electricity_account`,
    DROP INDEX `uq_property_account_directory_water_account`,
    DROP INDEX `uq_property_account_directory_wifi_account`;

ALTER TABLE `property_account_directory`
    ADD INDEX `idx_property_account_directory_electricity_account` (`electricity_account_no`),
    ADD INDEX `idx_property_account_directory_water_account` (`water_account_no`),
    ADD INDEX `idx_property_account_directory_wifi_account` (`wifi_account_no`);

