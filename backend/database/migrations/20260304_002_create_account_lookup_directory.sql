CREATE TABLE IF NOT EXISTS `account_lookup_directory` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_number_raw` VARCHAR(180) NOT NULL DEFAULT '',
    `account_number_normalized` VARCHAR(180) NOT NULL DEFAULT '',
    `utility_type` VARCHAR(40) NOT NULL DEFAULT '',
    `property_name` VARCHAR(255) NOT NULL DEFAULT '',
    `property_name_normalized` VARCHAR(255) NOT NULL DEFAULT '',
    `property_list_id` INT NULL,
    `billing_month` VARCHAR(7) NOT NULL DEFAULT '',
    `source_file` VARCHAR(255) NOT NULL DEFAULT '',
    `sheet_name` VARCHAR(120) NOT NULL DEFAULT '',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_account_lookup_property_list`
        FOREIGN KEY (`property_list_id`) REFERENCES `property_list`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY `uniq_account_lookup_entry` (
        `account_number_normalized`,
        `utility_type`,
        `property_name_normalized`,
        `billing_month`
    ),
    INDEX `idx_account_lookup_account` (`account_number_normalized`),
    INDEX `idx_account_lookup_account_utility` (`account_number_normalized`, `utility_type`),
    INDEX `idx_account_lookup_property_name` (`property_name_normalized`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
