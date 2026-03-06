-- Finance migration: create property account directory for utility account lookup by property

CREATE TABLE IF NOT EXISTS `property_account_directory` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `property` VARCHAR(255) NOT NULL,
    `electricity_account_no` VARCHAR(120) NULL,
    `water_account_no` VARCHAR(120) NULL,
    `wifi_account_no` VARCHAR(120) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_property_account_directory_property` (`property`),
    UNIQUE KEY `uq_property_account_directory_electricity_account` (`electricity_account_no`),
    UNIQUE KEY `uq_property_account_directory_water_account` (`water_account_no`),
    UNIQUE KEY `uq_property_account_directory_wifi_account` (`wifi_account_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
